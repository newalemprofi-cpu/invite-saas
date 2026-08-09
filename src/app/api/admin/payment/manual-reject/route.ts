import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { markPaymentFailedAndRevert } from "@/lib/payment/lifecycle";

const schema = z.object({
  paymentId: z.string().uuid(),
});

/**
 * POST /api/admin/payment/manual-reject
 *
 * Admin-only endpoint, the counterpart to manual-approve. Rejects a
 * PENDING manual payment without touching the invitation's content or
 * history: the Payment moves to FAILED, and if the invite is still
 * PENDING_PAYMENT (i.e. it hasn't been separately published some other
 * way in the meantime), it reverts to DRAFT so the customer can simply
 * retry payment from Manage — DRAFT is already a PAYABLE_STATUS, so this
 * doesn't require any new state.
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
    select: { id: true, status: true, inviteId: true, invite: { select: { status: true } } },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  if (payment.status !== "PENDING") {
    // Idempotent: a second reject (or a reject after it was already
    // approved/rejected) is a no-op, not an error that corrupts state.
    return NextResponse.json(
      { error: `Payment status is already ${payment.status}` },
      { status: 409 }
    );
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    await markPaymentFailedAndRevert(tx, {
      paymentId,
      inviteId: payment.inviteId,
      inviteStatus: payment.invite.status,
      paymentUpdateExtra: { approvedAt: now, approvedBy: session.userId },
    });

    await tx.auditLog.create({
      data: {
        action: "PAYMENT_MANUALLY_REJECTED",
        entity: "Payment",
        entityId: paymentId,
        userId: session.userId,
        meta: { rejectedBy: session.email },
      },
    });

    const pendingReceipt = await tx.paymentReceipt.findFirst({
      where: { paymentId, status: { in: ["REVIEW_REQUIRED", "FAILED"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (pendingReceipt) {
      await tx.auditLog.create({
        data: {
          action: "RECEIPT_MANUALLY_REJECTED",
          entity: "PaymentReceipt",
          entityId: pendingReceipt.id,
          userId: session.userId,
          meta: { paymentId },
        },
      });
    }
  });

  return NextResponse.json({ success: true, inviteId: payment.inviteId });
}
