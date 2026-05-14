import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PLANS } from "@/lib/payment/plans";
import { kaspiProvider } from "@/lib/payment/providers/kaspi";

/**
 * POST /api/invites/extend
 *
 * Creates a PENDING payment to extend an existing invite's active period.
 * When admin approves via /api/admin/payment/manual-approve, expiresAt is
 * extended from the CURRENT expiresAt (not from now), so active invites
 * keep their remaining time.
 *
 * Auth: user session (owner or ADMIN).
 * Only allowed for PUBLISHED or EXPIRED invites.
 */

const schema = z.object({
  inviteId: z.string().uuid(),
  plan: z.enum(["BASIC", "STANDARD", "PREMIUM"]),
});

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

  const { inviteId, plan: planId } = parsed.data;
  const plan = PLANS[planId];

  const invite = await db.invite.findUnique({
    where: { id: inviteId },
    select: { id: true, userId: true, status: true, expiresAt: true },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (session.role !== "ADMIN" && invite.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (invite.status !== "PUBLISHED" && invite.status !== "EXPIRED") {
    return NextResponse.json(
      { error: `Cannot extend invite with status ${invite.status}. Only PUBLISHED or EXPIRED invites can be extended.` },
      { status: 409 }
    );
  }

  // Idempotency: return existing pending extension payment
  const existing = await db.payment.findFirst({
    where: { inviteId, status: "PENDING" },
    select: { id: true, amount: true, rawPayload: true },
  });
  if (existing) {
    const instructions = kaspiProvider.getInstructions(
      Number(existing.amount),
      existing.id
    );
    return NextResponse.json({
      paymentId: existing.id,
      status: "PENDING",
      amount: Number(existing.amount),
      currency: "KZT",
      plan: planId,
      isExtension: true,
      instructions,
    });
  }

  const payment = await db.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        amount: plan.price,
        currency: "KZT",
        provider: "MANUAL_KASPI",
        status: "PENDING",
        userId: session.userId,
        inviteId,
        rawPayload: {
          plan: planId,
          planName: plan.nameKk,
          planDays: plan.days,
          isExtension: true,
          currentExpiresAt: invite.expiresAt?.toISOString() ?? null,
          createdBy: session.userId,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        action: "PAYMENT_EXTENSION_CREATED",
        entity: "Payment",
        entityId: p.id,
        userId: session.userId,
        meta: { plan: planId, amount: plan.price, inviteId },
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
      isExtension: true,
      instructions,
    },
    { status: 201 }
  );
}
