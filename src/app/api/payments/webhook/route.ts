import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/payment/signature";
import { markPaymentPaidAndPublish, markPaymentFailedAndRevert } from "@/lib/payment/lifecycle";
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
  const isValid = await verifyWebhookSignature(provider, rawBody, signature);
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

  // 3 — Dispatch to provider parser. FREEDOM_PAY/HALYK_EPAY/WOOPPAY have no
  // parser here on purpose — there's no real API documentation to build
  // one against without fabricating a payload contract, so a webhook from
  // those providers safely falls through to the generic ack below and is
  // a no-op rather than a guess. Every provider is still fully payable via
  // the manual admin-approval flow regardless (see /admin/payments/manual).
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

  const currentInvite = await db.invite.findUnique({
    where: { id: payment.inviteId },
    select: { status: true, expiresAt: true },
  });

  const appendedRawPayload = {
    ...(payment.rawPayload as object),
    webhookPayload: raw,
  } as Prisma.InputJsonValue;

  if (parsed.status === "PAID") {
    const rawMeta = (payment.rawPayload ?? {}) as {
      plan?: string;
      isExtension?: boolean;
    };
    const isExtension = rawMeta.isExtension === true;

    await db.$transaction(async (tx) => {
      await markPaymentPaidAndPublish(tx, {
        paymentId: payment.id,
        inviteId: payment.inviteId,
        inviteStatus: currentInvite?.status ?? "DRAFT",
        inviteExpiresAt: currentInvite?.expiresAt ?? null,
        plan: rawMeta.plan ?? "BASIC",
        isExtension,
        paymentUpdateExtra: { rawPayload: appendedRawPayload },
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
    await db.$transaction(async (tx) => {
      await markPaymentFailedAndRevert(tx, {
        paymentId: payment.id,
        inviteId: payment.inviteId,
        inviteStatus: currentInvite?.status ?? "DRAFT",
        paymentUpdateExtra: { rawPayload: appendedRawPayload },
      });
    });
  }

  return NextResponse.json({ received: true });
}
