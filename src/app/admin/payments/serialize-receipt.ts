import type { Prisma } from "@prisma/client";
import { formatAstanaDateTime } from "@/lib/receipts/display";
import type { ReceiptCheck } from "@/lib/receipts/verify";
import type { ReceiptCardView } from "./ReceiptCard";

const receiptWithPayment = {
  include: {
    payment: {
      select: {
        id: true,
        amount: true,
        status: true,
        user: { select: { name: true, email: true } },
        invite: { select: { id: true, title: true, slug: true } },
      },
    },
  },
} satisfies Prisma.PaymentReceiptDefaultArgs;

export type ReceiptWithPayment = Prisma.PaymentReceiptGetPayload<typeof receiptWithPayment>;

/** Shared DB shape both admin receipt pages query with — one place their `include` can't drift apart. */
export const RECEIPT_WITH_PAYMENT_INCLUDE = receiptWithPayment.include;

export function serializeReceiptForAdmin(r: ReceiptWithPayment): ReceiptCardView {
  return {
    id: r.id,
    status: r.status,
    verificationResult: r.verificationResult,
    failureReason: r.failureReason,
    receiptId: r.receiptId,
    extractedAmount: r.extractedAmount != null ? Number(r.extractedAmount) : null,
    extractedBank: r.extractedBank,
    extractedIin: r.extractedIin,
    extractedMethodOfPayment: r.extractedMethodOfPayment,
    extractedDatetimeRaw: r.extractedDatetimeRaw,
    extractedPaidAtDisplay: r.extractedPaidAt ? formatAstanaDateTime(r.extractedPaidAt, "kk") : null,
    // Legacy fields from the retired Anthropic-based extractor — only ever non-null on old rows.
    extractedRecipient: r.extractedRecipient,
    extractedSender: r.extractedSender,
    confidence: r.confidence,
    checks: (r.checksJson as unknown as ReceiptCheck[] | null) ?? [],
    createdAt: r.createdAt.toISOString(),
    payment: {
      id: r.payment.id,
      status: r.payment.status,
      amount: Number(r.payment.amount),
      user: r.payment.user,
      invite: r.payment.invite,
    },
  };
}
