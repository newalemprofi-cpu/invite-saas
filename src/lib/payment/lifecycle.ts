/**
 * The ONE place a Payment transitions to PAID (-> Invite PUBLISHED) or
 * FAILED (-> Invite reverted to DRAFT if still unpaid). Shared by every
 * caller that can reach those transitions — manual admin approval/
 * rejection, the provider webhook receiver, and the zero-amount-promo
 * checkout path — so there is exactly one successful-payment lifecycle,
 * not a parallel one invented for promo codes.
 */
import type { Prisma } from "@prisma/client";
import { addPlanDays } from "@/lib/payment/plans";
import { confirmPromoUsage, releasePromoUsage } from "@/lib/promo-codes";
import { unionEntitlements } from "@/lib/entitlements";

type Tx = Prisma.TransactionClient;

export interface MarkPaymentPaidInput {
  paymentId: string;
  inviteId: string;
  inviteStatus: string;
  inviteExpiresAt: Date | null;
  plan: string;
  isExtension: boolean;
  /** Extra fields merged into the Payment update (e.g. approvedAt/approvedBy, rawPayload). */
  paymentUpdateExtra?: Prisma.PaymentUpdateInput;
}

export async function markPaymentPaidAndPublish(
  tx: Tx,
  input: MarkPaymentPaidInput
): Promise<{ expiresAt: Date }> {
  const now = new Date();
  const base =
    input.isExtension && input.inviteExpiresAt && input.inviteExpiresAt > now
      ? input.inviteExpiresAt
      : now;
  const expiresAt = addPlanDays(base, input.plan);
  const inviteAlreadyPublished = input.inviteStatus === "PUBLISHED";

  // Read BEFORE updating: the feature-purchase snapshot written at
  // Payment-creation time (see /api/payments/create's rawPayload.features)
  // is what determines entitlements — never re-derived from current admin
  // pricing (§23: "Do not infer purchased features from current admin
  // prices after payment"). This is a read-only lookup of a field this
  // function's own update below never touches.
  const paymentBefore = await tx.payment.findUnique({
    where: { id: input.paymentId },
    select: { rawPayload: true },
  });
  const purchasedFeatureKeys = (() => {
    const raw = (paymentBefore?.rawPayload ?? {}) as { features?: { key?: unknown }[] };
    if (!Array.isArray(raw.features)) return [];
    return raw.features.map((f) => f.key).filter((k): k is string => typeof k === "string");
  })();

  await tx.payment.update({
    where: { id: input.paymentId },
    data: {
      status: "PAID",
      paidAt: now,
      ...input.paymentUpdateExtra,
    },
  });

  const inviteBefore = await tx.invite.findUnique({
    where: { id: input.inviteId },
    select: { data: true },
  });
  // Entitlements ACCUMULATE across payments (§23/#35: "template switching
  // ... does not lose entitlements") — never overwritten, only unioned in.
  const entitlements = unionEntitlements(inviteBefore?.data, purchasedFeatureKeys);

  await tx.invite.update({
    where: { id: input.inviteId },
    data: {
      expiresAt,
      data: { ...((inviteBefore?.data as object) ?? {}), entitlements },
      ...(inviteAlreadyPublished ? {} : { status: "PUBLISHED", publishedAt: now }),
    },
  });

  await confirmPromoUsage(tx, input.paymentId);

  return { expiresAt };
}

export interface MarkPaymentFailedInput {
  paymentId: string;
  inviteId: string;
  inviteStatus: string;
  paymentUpdateExtra?: Prisma.PaymentUpdateInput;
}

export async function markPaymentFailedAndRevert(tx: Tx, input: MarkPaymentFailedInput): Promise<void> {
  await tx.payment.update({
    where: { id: input.paymentId },
    data: { status: "FAILED", ...input.paymentUpdateExtra },
  });

  if (input.inviteStatus === "PENDING_PAYMENT") {
    await tx.invite.update({ where: { id: input.inviteId }, data: { status: "DRAFT" } });
  }

  await releasePromoUsage(tx, input.paymentId);
}
