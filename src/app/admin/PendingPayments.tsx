"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface PendingPayment {
  id: string;
  amount: number;
  createdAt: string;
  rawPayload: Record<string, unknown> | null;
  user: { name: string | null; email: string };
  invite: { id: string; title: string; slug: string };
}

function ApproveButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleApprove = () => {
    startTransition(async () => {
      setErr(null);
      try {
        const res = await fetch("/api/admin/payment/manual-approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Қате орын алды");
        setDone(true);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Қате орын алды");
      }
    });
  };

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        ✓ Расталды
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleApprove}
        disabled={isPending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors",
          "hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
        )}
      >
        {isPending ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Растауда...
          </>
        ) : (
          "✓ Растау"
        )}
      </button>
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  );
}

export function PendingPayments({
  payments,
}: {
  payments: PendingPayment[];
}) {
  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center gap-3 bg-white rounded-2xl border border-zinc-100">
        <span className="text-4xl">✅</span>
        <p className="text-sm text-zinc-500">Расталуды күтетін төлем жоқ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {payments.map((p) => {
        const meta = p.rawPayload ?? {};
        const planName =
          (meta.planName as string) ?? (meta.plan as string) ?? "—";
        const planDays = (meta.planDays as number) ?? "—";

        return (
          <div
            key={p.id}
            className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-zinc-900 truncate">
                  {p.invite.title}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  /{p.invite.slug}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                {p.user.name ?? p.user.email} · {planName} · {planDays} күн
              </p>
              <p className="text-xs text-zinc-400">
                {new Date(p.createdAt).toLocaleString("kk-KZ")}
              </p>
            </div>

            {/* Amount */}
            <div className="sm:text-right shrink-0">
              <p className="text-lg font-bold text-zinc-900">
                {p.amount.toLocaleString("kk-KZ")} ₸
              </p>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                {p.id.slice(-8).toUpperCase()}
              </p>
            </div>

            {/* Action */}
            <div className="sm:pl-4">
              <ApproveButton paymentId={p.id} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
