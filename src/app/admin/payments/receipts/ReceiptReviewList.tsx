"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReceiptCheckKey } from "@/lib/receipts/verify";
import type { ReceiptStatus } from "@prisma/client";

interface ReceiptCheckView {
  key: ReceiptCheckKey;
  enabled: boolean;
  passed: boolean;
  expected?: string;
  found?: string;
}

interface ReceiptView {
  id: string;
  status: ReceiptStatus;
  failureReason: string | null;
  receiptId: string | null;
  extractedAmount: number | null;
  extractedRecipient: string | null;
  extractedSender: string | null;
  extractedBank: string | null;
  extractedPaidAt: string | null;
  confidence: number | null;
  checks: ReceiptCheckView[];
  createdAt: string;
  payment: {
    id: string;
    amount: number;
    user: { name: string | null; email: string };
    invite: { id: string; title: string; slug: string };
  };
}

const CHECK_LABELS: Record<ReceiptCheckKey, string> = {
  AMOUNT: "Сома",
  RECIPIENT: "Алушы",
  DATETIME: "Уақыты",
  RECEIPT_ID_PRESENT: "Түбіртек ID бар ма",
  RECEIPT_ID_UNIQUE: "Түбіртек ID бірегей ме",
  CONFIDENCE: "Сенімділік",
};

function CheckRow({ check }: { check: ReceiptCheckView }) {
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="text-zinc-500">{CHECK_LABELS[check.key]}</span>
      <span className={cn("font-medium", check.passed ? "text-emerald-600" : "text-red-500")}>
        {check.passed ? "✓" : "✕"} {check.found ?? "—"}
        {check.expected ? ` (${check.expected})` : ""}
      </span>
    </div>
  );
}

function ReceiptCard({ receipt }: { receipt: ReceiptView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = (kind: "approve" | "reject") => {
    setAction(kind);
    startTransition(async () => {
      setErr(null);
      try {
        const res = await fetch(`/api/admin/payment/manual-${kind}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: receipt.payment.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Қате орын алды");
        setDone(kind === "approve" ? "approved" : "rejected");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Қате орын алды");
      }
    });
  };

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
        <span className={cn("inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold", done === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500")}>
          {done === "approved" ? "✓ Расталды" : "Қабылданбады"}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-zinc-900">{receipt.payment.invite.title}</p>
          <p className="text-xs text-zinc-400">{receipt.payment.user.name ?? receipt.payment.user.email}</p>
          <p className="text-[11px] text-zinc-400">{new Date(receipt.createdAt).toLocaleString("kk-KZ")}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-zinc-900 tabular-nums">{receipt.payment.amount.toLocaleString("kk-KZ")} ₸</p>
          <span className={cn("text-[10px] font-bold rounded-full px-2 py-0.5", receipt.status === "FAILED" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700")}>
            {receipt.status === "FAILED" ? "Оқу қатесі" : "Тексеру керек"}
          </span>
        </div>
      </div>

      <a
        href={`/api/payments/receipts/${receipt.id}/image`}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
      >
        Чекті көру ↗
      </a>

      {receipt.status === "FAILED" ? (
        <p className="text-xs text-red-500">Оқу қатесі: {receipt.failureReason ?? "белгісіз"}</p>
      ) : (
        <div className="rounded-xl bg-zinc-50 p-3 flex flex-col divide-y divide-zinc-100">
          {receipt.checks.map((c) => (
            <CheckRow key={c.key} check={c} />
          ))}
          {receipt.checks.length === 0 && <p className="text-xs text-zinc-400">Тексеру нәтижесі жоқ</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-500">
        <p>Түбіртек ID: <span className="text-zinc-800 font-medium">{receipt.receiptId ?? "—"}</span></p>
        <p>Алушы: <span className="text-zinc-800 font-medium">{receipt.extractedRecipient ?? "—"}</span></p>
        <p>Жіберуші: <span className="text-zinc-800 font-medium">{receipt.extractedSender ?? "—"}</span></p>
        <p>Банк: <span className="text-zinc-800 font-medium">{receipt.extractedBank ?? "—"}</span></p>
        <p>Сенімділік: <span className="text-zinc-800 font-medium">{receipt.confidence != null ? receipt.confidence.toFixed(2) : "—"}</span></p>
      </div>

      {err && <p className="text-xs text-red-500">{err}</p>}

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => run("reject")}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-60 transition-colors"
        >
          {isPending && action === "reject" ? "..." : "Қабылдамау"}
        </button>
        <button
          onClick={() => run("approve")}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          {isPending && action === "approve" ? "..." : "✓ Растау"}
        </button>
      </div>
    </div>
  );
}

export function ReceiptReviewList({ receipts }: { receipts: ReceiptView[] }) {
  if (receipts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center gap-3 bg-white rounded-2xl border border-zinc-100">
        <span className="text-4xl">✅</span>
        <p className="text-sm text-zinc-500">Тексеруді қажет ететін чек жоқ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {receipts.map((r) => (
        <ReceiptCard key={r.id} receipt={r} />
      ))}
    </div>
  );
}
