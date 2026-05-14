import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { addPlanDays } from "@/lib/payment/plans";

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
  const now = new Date();

  // For extensions: extend from current expiresAt (if still in future), not from now.
  // For initial publish: always start from now.
  const isExtension = rawMeta.isExtension === true;
  const currentExpiry = payment.invite.expiresAt;
  const base =
    isExtension && currentExpiry && currentExpiry > now ? currentExpiry : now;
  const expiresAt = addPlanDays(base, rawMeta.plan ?? "BASIC");

  // Only change invite status if it is not already PUBLISHED (avoid re-publishing extensions)
  const inviteAlreadyPublished = payment.invite.status === "PUBLISHED";

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "PAID", paidAt: now },
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
        action: "PAYMENT_MANUALLY_APPROVED",
        entity: "Payment",
        entityId: paymentId,
        userId: session.userId,
        meta: {
          approvedBy: session.email,
          plan: rawMeta.plan,
          expiresAt: expiresAt.toISOString(),
          inviteTitle: payment.invite.title,
        },
      },
    });
  });

  return NextResponse.json({
    success: true,
    inviteId: payment.inviteId,
    expiresAt: expiresAt.toISOString(),
  });
}
