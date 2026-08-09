"use client";

import { useState, useTransition } from "react";
import { saveReceiptVerificationSettingsAction } from "./actions";
import type { ReceiptVerificationSettings } from "@/lib/receipts/settings";

function Toggle({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked: boolean; hint?: string }) {
  return (
    <label className="flex items-start justify-between gap-4 py-2.5 border-b border-zinc-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-zinc-800">{label}</p>
        {hint && <p className="text-xs text-zinc-400 mt-0.5">{hint}</p>}
      </div>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-5 w-9 shrink-0 appearance-none rounded-full bg-zinc-200 checked:bg-emerald-500 relative cursor-pointer transition-colors before:content-[''] before:absolute before:h-4 before:w-4 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform" />
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

const fieldClass =
  "w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400";

export function ReceiptSettingsForm({ settings }: { settings: ReceiptVerificationSettings }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveReceiptVerificationSettingsAction(fd);
      if (result.error) setError(result.error);
      else setSuccess(true);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h2 className="text-base font-bold text-zinc-900 mb-1">Чекті автоматты тексеру</h2>
        <p className="text-xs text-zinc-400 mb-2">
          Күтілетін сома әрқашан нақты Payment жазбасынан алынады (промокодтан кейінгі соңғы сома) — мұнда баға қолмен енгізілмейді.
        </p>
        <Toggle name="enabled" label="Қосулы" hint="Өшірулі болса, тек WhatsApp түймесі көрінеді, чек жүктеу мүлдем жасырын" defaultChecked={settings.enabled} />
        <Toggle name="autoApprove" label="Автоматты растау" hint="Барлық тексеру өтсе, төлем қолмен растаусыз бірден PAID болады" defaultChecked={settings.autoApprove} />
      </section>

      <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-zinc-900 mb-2">Сома тексеруі</h2>
        <Toggle name="amountCheck" label="Сома тексеруі" defaultChecked={settings.amountCheck} />
        <div className="mt-3">
          <Field label="Рұқсат етілген сома айырмасы (₸)">
            <input type="number" name="allowedAmountDifference" min={0} step={1} defaultValue={settings.allowedAmountDifference} className={fieldClass} />
          </Field>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-zinc-900 mb-2">Алушы тексеруі</h2>
        <Toggle name="recipientCheck" label="Алушы тексеруі" defaultChecked={settings.recipientCheck} />
        <div className="mt-3">
          <Field label="Күтілетін алушы">
            <input type="text" name="expectedRecipient" defaultValue={settings.expectedRecipient} placeholder="ТОО ALEM PROFI" className={fieldClass} />
          </Field>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-zinc-900 mb-2">Уақыт тексеруі</h2>
        <Toggle name="dateTimeCheck" label="Уақыт/күн тексеруі" defaultChecked={settings.dateTimeCheck} />
        <div className="mt-3">
          <Field label="Рұқсат етілген төлем терезесі (сағат)">
            <input type="number" name="allowedTimeWindowHours" min={0} step={1} defaultValue={settings.allowedTimeWindowHours} className={fieldClass} />
          </Field>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-zinc-900 mb-2">Чек ID</h2>
        <Toggle
          name="receiptIdUniquenessCheck"
          label="Чек ID болуы міндетті"
          hint="Қайталанатын чек әрқашан тексеріледі — бұл баптау тек ID жоқ болған жағдайды басқарады"
          defaultChecked={settings.receiptIdUniquenessCheck}
        />
        <div className="mt-3">
          <Field label="Минималды сенімділік (0–1, міндетті емес)">
            <input type="number" name="minConfidence" min={0} max={1} step={0.05} defaultValue={settings.minConfidence ?? ""} placeholder="—" className={fieldClass} />
          </Field>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-zinc-900 mb-2">Сәйкессіздік болғанда</h2>
        <select name="mismatchAction" defaultValue={settings.mismatchAction} className={fieldClass}>
          <option value="REVIEW_REQUIRED">Қолмен тексеруге жіберу</option>
          <option value="REJECTED">Қабылдамау</option>
        </select>
      </section>

      {error && <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">{error}</p>}
      {success && <p className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-sm text-emerald-700">✓ Сақталды</p>}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 transition-colors"
      >
        {isPending ? "Сақталуда..." : "Сақтау"}
      </button>
    </form>
  );
}
