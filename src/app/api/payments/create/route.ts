import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getProductSettings } from "@/lib/product";
import { kaspiProvider } from "@/lib/payment/providers/kaspi";

const schema = z.object({
  inviteId: z.string().uuid(),
  provider: z
    .enum(["MANUAL_KASPI", "APIPAY", "CLOUDPAYMENTS"])
    .default("MANUAL_KASPI"),
});

const PAYABLE_STATUSES = new Set(["DRAFT", "PENDING_PAYMENT", "EXPIRED"]);

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

  const { inviteId, provider } = parsed.data;

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

  const product = await getProductSettings();
  const price = product.price;

  // Return existing PENDING payment instead of creating a duplicate
  const existing = await db.payment.findFirst({
    where: { inviteId, status: "PENDING" },
    select: { id: true, amount: true },
  });
  if (existing) {
    const instructions = kaspiProvider.getInstructions(Number(existing.amount), existing.id);
    return NextResponse.json({
      paymentId: existing.id,
      status: "PENDING",
      amount: Number(existing.amount),
      currency: "KZT",
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

  const instructions = kaspiProvider.getInstructions(price, payment.id);

  return NextResponse.json(
    {
      paymentId: payment.id,
      status: "PENDING",
      amount: price,
      currency: "KZT",
      instructions,
    },
    { status: 201 }
  );
}
