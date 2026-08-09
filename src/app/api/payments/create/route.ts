import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getProductSettings } from "@/lib/product";
import { kaspiProvider } from "@/lib/payment/providers/kaspi";
import { getGenericGatewayInstructions } from "@/lib/payment/providers/generic-gateway";
import { isProviderUsable, PROVIDER_TO_PAYMENT_ENUM, ALL_PROVIDER_IDS, type ProviderId } from "@/lib/payment-providers";

const schema = z.object({
  inviteId: z.string().uuid(),
  provider: z.enum(ALL_PROVIDER_IDS as [ProviderId, ...ProviderId[]]).default("KASPI_LINK"),
  lang: z.enum(["kk", "ru"]).default("kk"),
});

const PAYABLE_STATUSES = new Set(["DRAFT", "PENDING_PAYMENT", "EXPIRED"]);

async function buildInstructions(providerId: ProviderId, amount: number, paymentId: string, lang: "kk" | "ru") {
  if (providerId === "KASPI_LINK") return kaspiProvider.getInstructions(amount, paymentId, lang);
  return getGenericGatewayInstructions(providerId, amount, paymentId, lang);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { inviteId, provider: providerId, lang } = parsed.data;

  const invite = await db.invite.findUnique({
    where: { id: inviteId },
    select: { id: true, userId: true, status: true },
  });
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (session.role !== "ADMIN" && invite.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!PAYABLE_STATUSES.has(invite.status)) {
    return NextResponse.json(
      { error: `Cannot pay for invite with status ${invite.status}` },
      { status: 409 }
    );
  }

  // A provider is only selectable at checkout if an admin has both enabled
  // it AND filled in its required configuration (re-checked here, not just
  // trusted from the client — see src/lib/payment-providers.ts's isUsable).
  // This is also what makes disabling a provider immediately effective:
  // it never touches existing Payment rows, it just blocks NEW ones here.
  if (!(await isProviderUsable(providerId))) {
    return NextResponse.json({ error: "PROVIDER_UNAVAILABLE" }, { status: 409 });
  }

  const provider = PROVIDER_TO_PAYMENT_ENUM[providerId];
  const product = await getProductSettings();
  const price = product.price;

  // Return existing PENDING payment instead of creating a duplicate
  const existing = await db.payment.findFirst({
    where: { inviteId, status: "PENDING" },
    select: { id: true, amount: true, provider: true },
  });
  if (existing) {
    const instructions = await buildInstructions(providerId, Number(existing.amount), existing.id, lang);
    return NextResponse.json({
      paymentId: existing.id,
      status: "PENDING",
      amount: Number(existing.amount),
      currency: "KZT",
      provider: existing.provider,
      instructions,
    });
  }

  const payment = await db.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        amount: price,
        currency: "KZT",
        provider,
        status: "PENDING",
        userId: session.userId,
        inviteId,
        rawPayload: {
          productKey: product.productKey,
          activeDays: product.activeDays,
          provider,
          createdBy: session.userId,
        },
      },
    });

    await tx.invite.update({
      where: { id: inviteId },
      data: { status: "PENDING_PAYMENT" },
    });

    await tx.auditLog.create({
      data: {
        action: "PAYMENT_CREATED",
        entity: "Payment",
        entityId: p.id,
        userId: session.userId,
        meta: { amount: price, provider },
      },
    });

    return p;
  });

  const instructions = await buildInstructions(providerId, price, payment.id, lang);

  return NextResponse.json(
    {
      paymentId: payment.id,
      status: "PENDING",
      amount: price,
      currency: "KZT",
      provider,
      instructions,
    },
    { status: 201 }
  );
}
