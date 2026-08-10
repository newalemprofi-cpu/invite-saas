"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatPaymentReference } from "@/lib/payment/reference";
import type { ReceiptCheckKey } from "@/lib/receipts/verify";
import type { ReceiptStatus, ReceiptVerificationResult, PaymentStatus } from "@prisma/client";

export interface ReceiptCheckView {
  key: ReceiptCheckKey;
  enabled: boolean;
  passed: boolean;
  expected?: string;
  found?: string;
}

export interface ReceiptCardView {
  id: string;
  status: ReceiptStatus;
  verificationResult: ReceiptVerificationResult | null;
  failureReason: string | null;
  receiptId: string | null;
  extractedAmount: number | null;
  extractedBank: string | null;
  extractedIin: string | null;
  extractedMethodOfPayment: string | null;
  extractedDatetimeRaw: string | null;
  /** Astana-local, already formatted for display (e.g. "09.08.2026 22:30 (Астана уақыты)") — see lib/receipts/display.ts. */
  extractedPaidAtDisplay: string | null;
  extractedRecipient: string | null;
  extractedSender: string | null;
  confidence: number | null;
  checks: ReceiptCheckView[];
  createdAt: string;
  payment: {
    id: string;
    status: PaymentStatus;
    amount: number;
    user: { name: string | null; email: string };
    invite: { id: string; title: string; slug: string };
  };
}

// Reason codes shown human-readable, per the task's exact examples — the
// machine code stays available (data-* / console) for anyone who needs it,
// never the only thing an admin sees.
const RESULT_LABELS: Record<ReceiptVerificationResult, string> = {
  VERIFIED: "Расталды",
  AMOUNT_MISMATCH: "Сома сәйкес емес",
  PAYMENT_METHOD_MISMATCH: "Төлем әдісі сәйкес емес",
  IIN_MISMATCH: "ЖСН сәйкес емес",
  RECEIPT_TOO_OLD: "Чек мерзімі сәйкес емес",
  DUPLICATE_RECEIPT: "Қайталанған чек",
  EXTRACTION_FAILED: "Чекті оқу мүмкін болмады",
  INVALID_RECEIPT: "Жарамсыз чек",
  NOT_CONFIGURED: "Баптау жеткіліксіз",
  MANUAL_REVIEW_REQUIRED: "Қолмен тексеру қажет",
};

const CHECK_LABELS: Record<ReceiptCheckKey, string> = {
  AMOUNT: "Сома",
  PAYMENT_METHOD: "Төлем әдісі",
  IIN: "ЖСН",
  RECEIPT_AGE: "Чек жасы",
  DUPLICATE: "Қайталанбауы",
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Күтілуде",
  PAID: "Төленді",
  FAILED: "Қабылданбады",
  EXPIRED: "Мерзімі өтті",
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

interface Props {
  receipt: ReceiptCardView;
  /** Whether Растау/Қабылдамау/Қайта тексеру apply here — false once the underlying Payment is no longer PENDING (already resolved). */
  actionable: boolean;
  onReprocess: (receiptId: string) => Promise<{ error?: string; status?: string }>;
}

export function ReceiptCard({ receipt, actionable, onReprocess }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"approve" | "reject" | "reprocess" | null>(null);
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

  const reprocess = () => {
    setAction("reprocess");
    startTransition(async () => {
      setErr(null);
      const result = await onReprocess(receipt.id);
      if (result.error) setErr(result.error);
      else router.refresh();
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

  const resultLabel = receipt.verificationResult ? RESULT_LABELS[receipt.verificationResult] : receipt.status === "FAILED" ? "Оқу қатесі" : "Тексеру керек";
  const resultIsClean = receipt.verificationResult === "VERIFIED" || receipt.verificationResult === "MANUAL_REVIEW_REQUIRED";

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-zinc-900">{receipt.payment.invite.title}</p>
          <p className="text-xs text-zinc-400 font-mono">{formatPaymentReference(receipt.payment.id)}</p>
          <p className="text-xs text-zinc-400">{receipt.payment.user.name ?? receipt.payment.user.email}</p>
          <p className="text-[11px] text-zinc-400">Жүктелген: {new Date(receipt.createdAt).toLocaleString("kk-KZ")}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-zinc-900 tabular-nums">{receipt.payment.amount.toLocaleString("kk-KZ")} ₸</p>
          <span className={cn("text-[10px] font-bold rounded-full px-2 py-0.5", resultIsClean ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
            {resultLabel}
          </span>
          {!actionable && (
            <p className="text-[10px] text-zinc-400 mt-1">Төлем: {PAYMENT_STATUS_LABELS[receipt.payment.status]}</p>
          )}
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

      {receipt.failureReason && !receipt.checks.length ? (
        <p className="text-xs text-red-500">Себебі: {receipt.failureReason}</p>
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
        <p>Банк: <span className="text-zinc-800 font-medium">{receipt.extractedBank ?? "—"}</span></p>
        <p>Төлем әдісі: <span className="text-zinc-800 font-medium">{receipt.extractedMethodOfPayment ?? "—"}</span></p>
        <p>ЖСН: <span className="text-zinc-800 font-medium">{receipt.extractedIin ?? "—"}</span></p>
        <p className="col-span-2">Чек уақыты: <span className="text-zinc-800 font-medium">{receipt.extractedPaidAtDisplay ?? receipt.extractedDatetimeRaw ?? "—"}</span></p>
        {(receipt.extractedRecipient || receipt.extractedSender || receipt.confidence != null) && (
          <p className="col-span-2 text-zinc-400 italic">
            Ескі жазба: {receipt.extractedRecipient ?? "—"} / {receipt.extractedSender ?? "—"}
            {receipt.confidence != null ? ` (сенімділік ${receipt.confidence.toFixed(2)})` : ""}
          </p>
        )}
      </div>

      {err && <p className="text-xs text-red-500">{err}</p>}

      {actionable && (
        <div className="flex gap-2 justify-end flex-wrap">
          <button
            onClick={reprocess}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-60 transition-colors"
          >
            {isPending && action === "reprocess" ? "..." : "Қайта тексеру"}
          </button>
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
      )}
    </div>
  );
}
