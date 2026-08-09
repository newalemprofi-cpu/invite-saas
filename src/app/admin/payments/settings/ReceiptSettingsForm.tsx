"use client";

import { useState, useTransition } from "react";
import { saveReceiptVerificationSettingsAction, testExtractorConnectionAction } from "./actions";
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

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-zinc-500">{label}</span>
      {children}
      {hint && <span className="text-xs text-zinc-400">{hint}</span>}
    </label>
  );
}

const fieldClass =
  "w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400";

function TestExtractorButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <div className="flex flex-col gap-2 mt-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setResult(null);
            setResult(await testExtractorConnectionAction());
          })
        }
        className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 transition-colors w-fit"
      >
        {isPending ? "Тексерілуде..." : "Баптауды тексеру"}
      </button>
      {result && (
        <p className={`text-xs ${result.ok ? "text-emerald-600" : "text-red-500"}`}>{result.ok ? "✓ " : "✕ "}{result.message}</p>
      )}
    </div>
  );
}

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
        <h2 className="text-base font-bold text-zinc-900 mb-1">Чекті тексеру</h2>
        <p className="text-xs text-zinc-400 mb-2">
          Күтілетін сома әрқашан нақты Payment жазбасынан алынады (промокодтан кейінгі соңғы сома) — мұнда баға қолмен енгізілмейді.
        </p>
        <Toggle name="enabled" label="Чекті тексеру" hint="Өшірулі болса, тек WhatsApp түймесі көрінеді, чек жүктеу мүлдем жасырын" defaultChecked={settings.enabled} />
        <Toggle name="autoApproveVerifiedReceipts" label="Автоматты растау" hint="Барлық қосулы тексеру өтсе, төлем қолмен растаусыз бірден PAID болады" defaultChecked={settings.autoApproveVerifiedReceipts} />
      </section>

      <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-zinc-900 mb-2">Экстрактор</h2>
        <Field label="Экстрактор URL" hint="Бос болса, серверде орнатылған RECEIPT_EXTRACTOR_URL қолданылады">
          <input type="text" name="extractorUrl" defaultValue={settings.extractorUrl} placeholder="https://extract.alemprofi.com/extract-receipt" className={fieldClass} />
        </Field>
        <TestExtractorButton />
      </section>

      <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-zinc-900 mb-2">Сома тексеруі</h2>
        <Toggle name="amountCheck" label="Сома тексеруі" defaultChecked={settings.amountCheck} />
        <div className="mt-3">
          <Field label="Рұқсат етілген айырма (₸)">
            <input type="number" name="amountTolerance" min={0} step={1} defaultValue={settings.amountTolerance} className={fieldClass} />
          </Field>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-zinc-900 mb-2">Төлем әдісі тексеруі</h2>
        <Toggle name="verifyPaymentMethod" label="Төлем әдісі тексеруі" defaultChecked={settings.verifyPaymentMethod} />
        <div className="mt-3">
          <Field label="Күтілетін әдіс">
            <input type="text" name="expectedPaymentMethod" defaultValue={settings.expectedPaymentMethod} placeholder="Kaspi Gold" className={fieldClass} />
          </Field>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-zinc-900 mb-2">ЖСН тексеруі</h2>
        <Toggle name="verifyIin" label="ЖСН тексеруі" defaultChecked={settings.verifyIin} />
        <div className="mt-3">
          <Field label="Рұқсат етілген ЖСН тізімі" hint="Әр жолда бір ЖСН немесе үтірмен бөліңіз">
            <textarea
              name="allowedIins"
              defaultValue={settings.allowedIins.join("\n")}
              placeholder={"123456789012"}
              rows={3}
              className={fieldClass}
            />
          </Field>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-zinc-900 mb-2">Чек жасы тексеруі</h2>
        <Toggle name="verifyReceiptAge" label="Чек жасы тексеруі" defaultChecked={settings.verifyReceiptAge} />
        <div className="mt-3">
          <Field label="Максималды жас (сағат)">
            <input type="number" name="receiptMaxAgeHours" min={0} step={1} defaultValue={settings.receiptMaxAgeHours} className={fieldClass} />
          </Field>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-zinc-900 mb-2">Қайталанатын чек тексеруі</h2>
        <Toggle
          name="verifyDuplicateReceipt"
          label="Қайталанатын чек тексеруі"
          hint="Әдетте қосулы болуы керек"
          defaultChecked={settings.verifyDuplicateReceipt}
        />
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
