import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PLANS } from "@/lib/payment/plans";
import { kaspiProvider } from "@/lib/payment/providers/kaspi";

const schema = z.object({
  inviteId: z.string().uuid(),
  plan: z.enum(["BASIC", "STANDARD", "PREMIUM"]),
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

  const { inviteId, plan: planId, provider } = parsed.data;
  const plan = PLANS[planId];

  // Ownership check — never trust client
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

  // Return existing PENDING payment instead of creating a duplicate
  const existing = await db.payment.findFirst({
    where: { inviteId, status: "PENDING" },
    select: { id: true, amount: true, rawPayload: true },
  });
  if (existing) {
    const raw = (existing.rawPayload ?? {}) as { plan?: string };
    const instructions = kaspiProvider.getInstructions(
      Number(existing.amount),
      existing.id
    );
    return NextResponse.json({
      paymentId: existing.id,
      status: "PENDING",
      amount: Number(existing.amount),
      currency: "KZT",
      plan: raw.plan ?? planId,
      instructions,
    });
  }

  // Create payment + update invite inside a transaction
  const payment = await db.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        amount: plan.price,
        currency: "KZT",
        provider,
        status: "PENDING",
        userId: session.userId,
        inviteId,
        rawPayload: {
          plan: planId,
          planName: plan.nameKk,
          planDays: plan.days,
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
        meta: { plan: planId, amount: plan.price, provider },
      },
    });

    return p;
  });

  const instructions = kaspiProvider.getInstructions(plan.price, payment.id);

  return NextResponse.json(
    {
      paymentId: payment.id,
      status: "PENDING",
      amount: plan.price,
      currency: "KZT",
      plan: planId,
      instructions,
    },
    { status: 201 }
  );
}
