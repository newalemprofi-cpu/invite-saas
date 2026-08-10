"use client";

import { ReceiptCard, type ReceiptCardView } from "../ReceiptCard";
import { reprocessReceiptAction } from "../verification-failures/actions";

/**
 * The broader receipt history/manual-review view — every receipt ever
 * submitted, any status. Actions (Растау/Қабылдамау/Қайта тексеру) only
 * make sense while the underlying Payment is still PENDING; once it's
 * resolved (PAID/FAILED/EXPIRED) the card shows its outcome read-only —
 * see ReceiptCard's `actionable` prop.
 */
export function ReceiptHistoryList({ receipts }: { receipts: ReceiptCardView[] }) {
  if (receipts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center gap-3 bg-white rounded-2xl border border-zinc-100">
        <span className="text-4xl">🧾</span>
        <p className="text-sm text-zinc-500">Әлі чек жүктелмеген</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {receipts.map((r) => (
        <ReceiptCard key={r.id} receipt={r} actionable={r.payment.status === "PENDING"} onReprocess={reprocessReceiptAction} />
      ))}
    </div>
  );
}
