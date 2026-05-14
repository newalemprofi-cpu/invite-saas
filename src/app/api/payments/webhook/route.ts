import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/payment/signature";
import { addPlanDays } from "@/lib/payment/plans";
import { apipayProvider } from "@/lib/payment/providers/apipay";
import { cloudpaymentsProvider } from "@/lib/payment/providers/cloudpayments";

/**
 * POST /api/payments/webhook?provider=APIPAY
 *
 * Receives webhook events from payment providers.
 * Raw body is stored before parsing to preserve signature integrity.
 */
export async function POST(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider") ?? "MANUAL_KASPI";

  // Read raw body BEFORE any parsing (needed for signature verification)
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-webhook-signature") ??
    req.headers.get("x-signature") ??
    "";

  // 1 — Verify signature
  const isValid = verifyWebhookSignature(provider, rawBody, signature);
  if (!isValid) {
    console.warn(`[webhook] Invalid signature for provider ${provider}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2 — Parse JSON
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 3 — Dispatch to provider parser
  if (provider === "APIPAY") {
    return handleParsedWebhook(apipayProvider.parseWebhookPayload(body), body);
  }
  if (provider === "CLOUDPAYMENTS") {
    return handleParsedWebhook(
      cloudpaymentsProvider.parseWebhookPayload(body),
      body
    );
  }

  // MANUAL_KASPI has no webhook — admin approves via /api/admin/payment/manual-approve
  return NextResponse.json({ received: true, provider });
}

async function handleParsedWebhook(
  parsed: { externalId: string; status: "PAID" | "FAILED"; amount: number },
  raw: unknown
) {
  if (!parsed.externalId) {
    return NextResponse.json(
      { error: "Missing externalId in payload" },
      { status: 400 }
    );
  }

  const payment = await db.payment.findFirst({
    where: { externalId: parsed.externalId },
    select: {
      id: true,
      status: true,
      inviteId: true,
      rawPayload: true,
    },
  });

  if (!payment) {
    // Not our payment — return 200 to stop provider retries
    console.warn(
      `[webhook] Payment not found for externalId ${parsed.externalId}`
    );
    return NextResponse.json({ received: true });
  }

  // Idempotency — ignore duplicate events
  if (payment.status !== "PENDING") {
    return NextResponse.json({ received: true, idempotent: true });
  }

  if (parsed.status === "PAID") {
    const rawMeta = (payment.rawPayload ?? {}) as {
      plan?: string;
      isExtension?: boolean;
    };
    const now = new Date();

    // For extensions: extend from current expiresAt (if still in future), same as manual-approve.
    const isExtension = rawMeta.isExtension === true;
    const currentInvite = isExtension
      ? await db.invite.findUnique({
          where: { id: payment.inviteId },
          select: { status: true, expiresAt: true },
        })
      : null;
    const base =
      isExtension && currentInvite?.expiresAt && currentInvite.expiresAt > now
        ? currentInvite.expiresAt
        : now;
    const expiresAt = addPlanDays(base, rawMeta.plan ?? "BASIC");
    const inviteAlreadyPublished = currentInvite?.status === "PUBLISHED";

    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          paidAt: now,
          // Append raw provider payload alongside existing metadata
          rawPayload: {
            ...(payment.rawPayload as object),
            webhookPayload: raw,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.invite.update({
        where: { id: payment.inviteId },
        data: {
          expiresAt,
          ...(inviteAlreadyPublished
            ? {}
            : { status: "PUBLISHED", publishedAt: now }),
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PAYMENT_WEBHOOK_PAID",
          entity: "Payment",
          entityId: payment.id,
          meta: { externalId: parsed.externalId, amount: parsed.amount },
        },
      });
    });
  } else {
    // FAILED
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        rawPayload: {
          ...(payment.rawPayload as object),
          webhookPayload: raw,
        } as Prisma.InputJsonValue,
      },
    });
  }

  return NextResponse.json({ received: true });
}
