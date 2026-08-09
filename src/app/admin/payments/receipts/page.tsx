import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ReceiptReviewList } from "./ReceiptReviewList";
import type { ReceiptCheck } from "@/lib/receipts/verify";

export const metadata: Metadata = { title: "Чектерді тексеру — Admin" };
export const dynamic = "force-dynamic";

export default async function ReceiptsReviewPage() {
  const receipts = await db.paymentReceipt.findMany({
    where: { status: { in: ["REVIEW_REQUIRED", "FAILED"] }, payment: { status: "PENDING" } },
    orderBy: { createdAt: "asc" },
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
  });

  const serialized = receipts.map((r) => ({
    id: r.id,
    status: r.status,
    failureReason: r.failureReason,
    receiptId: r.receiptId,
    extractedAmount: r.extractedAmount != null ? Number(r.extractedAmount) : null,
    extractedRecipient: r.extractedRecipient,
    extractedSender: r.extractedSender,
    extractedBank: r.extractedBank,
    extractedPaidAt: r.extractedPaidAt ? r.extractedPaidAt.toISOString() : null,
    confidence: r.confidence,
    checks: (r.checksJson as unknown as ReceiptCheck[] | null) ?? [],
    createdAt: r.createdAt.toISOString(),
    payment: {
      id: r.payment.id,
      amount: Number(r.payment.amount),
      user: r.payment.user,
      invite: r.payment.invite,
    },
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Чектерді тексеру</h1>
          <p className="text-sm text-zinc-500 mt-1">Қолмен тексеруді қажет ететін чектер</p>
        </div>
        {serialized.length > 0 && (
          <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1">{serialized.length}</span>
        )}
      </div>
      <ReceiptReviewList receipts={serialized} />
    </div>
  );
}
