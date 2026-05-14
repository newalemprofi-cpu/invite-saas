"use client";

import { useState } from "react";
import { PLANS, type PlanId } from "@/lib/payment/plans";
import { KaspiInstructions } from "./KaspiInstructions";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Step = "select-plan" | "instructions";

interface KaspiData {
  kaspiLink?: string;
  phone?: string;
  amount: number;
  reference: string;
  steps: string[];
}

interface PaymentResponse {
  paymentId: string;
  plan: string;
  amount: number;
  instructions: KaspiData;
}

interface Props {
  inviteId: string;
  inviteTitle: string;
  currentStatus: string;
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  planId,
  selected,
  onClick,
}: {
  planId: PlanId;
  selected: boolean;
  onClick: () => void;
}) {
  const plan = PLANS[planId];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-150",
        selected
          ? "border-rose-400 bg-rose-50"
          : "border-zinc-100 bg-white hover:border-zinc-200",
        plan.popular && "ring-2 ring-rose-300 ring-offset-1"
      )}
    >
      {plan.popular && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">
          Танымал
        </span>
      )}
      <div>
        <p
          className={cn(
            "font-bold text-base",
            selected ? "text-rose-700" : "text-zinc-900"
          )}
        >
          {plan.nameKk}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">{plan.days} күн</p>
      </div>
      <p className="text-xl font-bold text-zinc-900">
        {plan.price.toLocaleString("kk-KZ")}
        <span className="text-sm font-medium text-zinc-500"> ₸</span>
      </p>
      <ul className="flex flex-col gap-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-1.5 text-[11px] text-zinc-600">
            <span className="text-emerald-500 shrink-0">✓</span>
            {f}
          </li>
        ))}
      </ul>
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PaymentFlow({ inviteId, inviteTitle, currentStatus }: Props) {
  const [step, setStep] = useState<Step>("select-plan");
  const [plan, setPlan] = useState<PlanId>("STANDARD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentResponse | null>(null);

  // Already waiting for admin approval
  if (currentStatus === "PENDING_PAYMENT" && !paymentData) {
    return (
      <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5 flex items-start gap-3">
        <span className="text-2xl shrink-0">⏳</span>
        <div>
          <p className="font-semibold text-amber-800">Төлем расталуда</p>
          <p className="text-sm text-amber-700 mt-0.5 leading-relaxed">
            Admin 1-24 сағат ішінде растайды. Расталғаннан кейін шақыру
            автоматты түрде жарияланады.
          </p>
        </div>
      </div>
    );
  }

  const handleCreatePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteId,
          plan,
          provider: "MANUAL_KASPI",
        }),
      });
      const data: PaymentResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Қате орын алды");
      setPaymentData(data);
      setStep("instructions");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Қате орын алды");
    } finally {
      setLoading(false);
    }
  };

  if (step === "instructions" && paymentData) {
    const planConfig = PLANS[paymentData.plan as PlanId] ?? PLANS.STANDARD;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">Kaspi арқылы төлеу</h3>
          <button
            onClick={() => {
              setStep("select-plan");
              setPaymentData(null);
            }}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            ← Артқа
          </button>
        </div>
        <KaspiInstructions
          data={paymentData.instructions}
          planName={planConfig.nameKk}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-bold text-zinc-900">
          «{inviteTitle}» жариялау
        </h3>
        <p className="text-sm text-zinc-500 mt-0.5">Жоспарды таңдаңыз</p>
      </div>

      {/* Plan cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(PLANS) as PlanId[]).map((pid) => (
          <PlanCard
            key={pid}
            planId={pid}
            selected={plan === pid}
            onClick={() => setPlan(pid)}
          />
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button
        size="lg"
        loading={loading}
        onClick={handleCreatePayment}
        className="w-full"
      >
        Kaspi арқылы төлеу →
      </Button>
    </div>
  );
}
