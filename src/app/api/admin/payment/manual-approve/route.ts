import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { markPaymentPaidAndPublish } from "@/lib/payment/lifecycle";

const schema = z.object({
  paymentId: z.string().uuid(),
});

/**
 * POST /api/admin/payment/manual-approve
 *
 * Admin-only endpoint. Approves a PENDING manual payment,
 * marks the invite PUBLISHED and sets expiresAt from the purchased plan.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const { paymentId } = parsed.data;

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      status: true,
      inviteId: true,
      rawPayload: true,
      user: { select: { id: true, email: true, name: true } },
      invite: { select: { title: true, status: true, expiresAt: true } },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  if (payment.status !== "PENDING") {
    return NextResponse.json(
      { error: `Payment status is already ${payment.status}` },
      { status: 409 }
    );
  }

  const rawMeta = (payment.rawPayload ?? {}) as {
    plan?: string;
    isExtension?: boolean;
  };

  // For extensions: extend from current expiresAt (if still in future), not from now.
  // For initial publish: always start from now.
  const isExtension = rawMeta.isExtension === true;

  const { expiresAt } = await db.$transaction(async (tx) => {
    const result = await markPaymentPaidAndPublish(tx, {
      paymentId,
      inviteId: payment.inviteId,
      inviteStatus: payment.invite.status,
      inviteExpiresAt: payment.invite.expiresAt,
      plan: rawMeta.plan ?? "BASIC",
      isExtension,
      paymentUpdateExtra: { approvedAt: new Date(), approvedBy: session.userId },
    });

    await tx.auditLog.create({
      data: {
        action: "PAYMENT_MANUALLY_APPROVED",
        entity: "Payment",
        entityId: paymentId,
        userId: session.userId,
        meta: {
          approvedBy: session.email,
          plan: rawMeta.plan,
          expiresAt: result.expiresAt.toISOString(),
          inviteTitle: payment.invite.title,
        },
      },
    });

    return result;
  });

  return NextResponse.json({
    success: true,
    inviteId: payment.inviteId,
    expiresAt: expiresAt.toISOString(),
  });
}
