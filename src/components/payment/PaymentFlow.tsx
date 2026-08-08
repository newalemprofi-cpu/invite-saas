"use client";

import { useState } from "react";
import { KaspiInstructions } from "./KaspiInstructions";
import { Button } from "@/components/ui/Button";
import type { Lang } from "@/lib/i18n";

interface KaspiData {
  kaspiLink?: string;
  phone?: string;
  amount: number;
  reference: string;
  steps: string[];
}

interface PaymentResponse {
  paymentId: string;
  amount: number;
  instructions: KaspiData;
}

interface Props {
  inviteId: string;
  inviteTitle: string;
  currentStatus: string;
  price: number;
  kaspiLink?: string | null;
  lang: Lang;
}

const T = {
  kk: {
    pendingTitle: "Төлем расталуда",
    pendingBody: "Admin 1-24 сағат ішінде растайды. Расталғаннан кейін шақыру автоматты түрде жарияланады.",
    payTitle: "Kaspi арқылы төлеу",
    back: "← Артқа",
    publishTitle: (title: string) => `«${title}» жариялау`,
    payVia: "Kaspi арқылы төлем жасаңыз",
    oneTime: "Бір рет төлем",
    features: ["RSVP жинау", "Бөлісу сілтемесі", "Қонақтар тізімі"],
    payButton: "Kaspi арқылы төлеу →",
    genericError: "Қате орын алды",
    planName: "Шақыру",
  },
  ru: {
    pendingTitle: "Платёж подтверждается",
    pendingBody: "Администратор подтвердит в течение 1-24 часов. После подтверждения приглашение будет опубликовано автоматически.",
    payTitle: "Оплата через Kaspi",
    back: "← Назад",
    publishTitle: (title: string) => `Опубликовать «${title}»`,
    payVia: "Совершите оплату через Kaspi",
    oneTime: "Разовый платёж",
    features: ["Сбор RSVP", "Ссылка для отправки", "Список гостей"],
    payButton: "Оплатить через Kaspi →",
    genericError: "Произошла ошибка",
    planName: "Приглашение",
  },
} as const;

export function PaymentFlow({ inviteId, inviteTitle, currentStatus, price, lang }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentResponse | null>(null);
  const t = T[lang];

  if (currentStatus === "PENDING_PAYMENT" && !paymentData) {
    return (
      <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5 flex items-start gap-3">
        <span className="text-2xl shrink-0">⏳</span>
        <div>
          <p className="font-semibold text-amber-800">{t.pendingTitle}</p>
          <p className="text-sm text-amber-700 mt-0.5 leading-relaxed">{t.pendingBody}</p>
        </div>
      </div>
    );
  }

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, provider: "MANUAL_KASPI" }),
      });
      const data: PaymentResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.genericError);
      setPaymentData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setLoading(false);
    }
  };

  if (paymentData) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">{t.payTitle}</h3>
          <button
            onClick={() => setPaymentData(null)}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {t.back}
          </button>
        </div>
        <KaspiInstructions data={paymentData.instructions} planName={t.planName} lang={lang} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-bold text-zinc-900">{t.publishTitle(inviteTitle)}</h3>
        <p className="text-sm text-zinc-500 mt-0.5">{t.payVia}</p>
      </div>

      <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-5 text-center">
        <p className="text-3xl font-black text-zinc-900">
          {price.toLocaleString(lang === "ru" ? "ru-RU" : "kk-KZ")}
          <span className="text-lg font-semibold text-zinc-400"> ₸</span>
        </p>
        <p className="text-sm text-zinc-500 mt-1">{t.oneTime}</p>
        <ul className="mt-3 flex flex-col gap-1 text-left max-w-xs mx-auto">
          {t.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-zinc-600">
              <span className="text-emerald-500 shrink-0">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      <Button size="lg" loading={loading} onClick={handlePay} className="w-full">
        {t.payButton}
      </Button>
    </div>
  );
}
