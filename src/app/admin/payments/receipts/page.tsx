import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ReceiptHistoryList } from "./ReceiptHistoryList";
import { RECEIPT_WITH_PAYMENT_INCLUDE, serializeReceiptForAdmin } from "../serialize-receipt";

export const metadata: Metadata = { title: "Чектерді тексеру — Admin" };
export const dynamic = "force-dynamic";

/**
 * The broader receipt history/manual-review view — every PaymentReceipt
 * row ever created, regardless of status or the underlying Payment's
 * current state. Distinct from /admin/payments/verification-failures
 * ("Автоматты өтпегендер"), which is deliberately narrow: only the
 * currently-active failures needing attention right now. A receipt whose
 * Payment has already been resolved (PAID, rejected, expired) drops out of
 * that active queue but stays visible here — "historical data remains
 * elsewhere" per the task's own framing.
 */
export default async function ReceiptsHistoryPage() {
  const receipts = await db.paymentReceipt.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: RECEIPT_WITH_PAYMENT_INCLUDE,
  });

  const serialized = receipts.map(serializeReceiptForAdmin);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Чектерді тексеру</h1>
        <p className="text-sm text-zinc-500 mt-1">Барлық жүктелген чектердің тарихы (соңғы 200)</p>
      </div>
      <ReceiptHistoryList receipts={serialized} />
    </div>
  );
}
