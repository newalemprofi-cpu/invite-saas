"use client";

import { ReceiptCard, type ReceiptCardView } from "../ReceiptCard";
import { reprocessReceiptAction } from "./actions";

export function VerificationFailuresList({ receipts }: { receipts: ReceiptCardView[] }) {
  if (receipts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center gap-3 bg-white rounded-2xl border border-zinc-100">
        <span className="text-4xl">✅</span>
        <p className="text-sm text-zinc-500">Автоматты тексеруден өтпеген чек жоқ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {receipts.map((r) => (
        <ReceiptCard key={r.id} receipt={r} actionable onReprocess={reprocessReceiptAction} />
      ))}
    </div>
  );
}
