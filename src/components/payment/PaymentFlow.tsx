"use client";

import { useState } from "react";
import { KaspiInstructions } from "./KaspiInstructions";
import { Button } from "@/components/ui/Button";
import type { Lang } from "@/lib/i18n";
import type { ProviderId } from "@/lib/payment-providers";

interface InstructionsData {
  kaspiLink?: string;
  phone?: string;
  amount: number;
  reference: string;
  steps: string[];
}

interface PaymentResponse {
  paymentId: string;
  status: "PENDING" | "PAID";
  published?: boolean;
  amount: number;
  originalAmount: number | null;
  discountAmount: number;
  promoCode: string | null;
  instructions?: InstructionsData;
}

interface AppliedPromo {
  code: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

export interface CheckoutProviderOption {
  id: ProviderId;
  label: string;
}

interface Props {
  inviteId: string;
  inviteTitle: string;
  currentStatus: string;
  price: number;
  lang: Lang;
  /** Providers the customer may actually choose — already filtered to enabled + fully configured. */
  providers: CheckoutProviderOption[];
}

const T = {
  kk: {
    pendingTitle: "Төлем расталуда",
    pendingBody: "Admin 1-24 сағат ішінде растайды. Расталғаннан кейін шақыру автоматты түрде жарияланады.",
    payTitle: "Төлем",
    back: "← Артқа",
    publishTitle: (title: string) => `«${title}» жариялау`,
    choosePayVia: "Төлем әдісін таңдаңыз",
    oneTime: "Бір рет төлем",
    features: ["RSVP жинау", "Бөлісу сілтемесі", "Қонақтар тізімі"],
    genericError: "Қате орын алды",
    planName: "Шақыру",
    unavailableTitle: "Төлем уақытша қолжетімсіз",
    unavailableBody: "Өтінеміз, кейінірек қайталап көріңіз.",
    priceLabel: "Шақыру бағасы",
    payableLabel: "Төлем сомасы",
    promoPlaceholder: "Промокод",
    apply: "Қолдану",
    applying: "...",
    remove: "Алып тастау",
    freePublish: "Тегін жариялау",
    publishedTitle: "Сәтті жарияланды! 🎉",
    publishedBody: "Шақыру промокодпен толығымен жабылды және енді жарияланды.",
  },
  ru: {
    pendingTitle: "Платёж подтверждается",
    pendingBody: "Администратор подтвердит в течение 1-24 часов. После подтверждения приглашение будет опубликовано автоматически.",
    payTitle: "Оплата",
    back: "← Назад",
    publishTitle: (title: string) => `Опубликовать «${title}»`,
    choosePayVia: "Выберите способ оплаты",
    oneTime: "Разовый платёж",
    features: ["Сбор RSVP", "Ссылка для отправки", "Список гостей"],
    genericError: "Произошла ошибка",
    planName: "Приглашение",
    unavailableTitle: "Оплата временно недоступна",
    unavailableBody: "Пожалуйста, попробуйте позже.",
    priceLabel: "Стоимость приглашения",
    payableLabel: "К оплате",
    promoPlaceholder: "Промокод",
    apply: "Применить",
    applying: "...",
    remove: "Удалить",
    freePublish: "Опубликовать бесплатно",
    publishedTitle: "Успешно опубликовано! 🎉",
    publishedBody: "Приглашение полностью оплачено промокодом и уже опубликовано.",
  },
} as const;

export function PaymentFlow({ inviteId, inviteTitle, currentStatus, price, lang, providers }: Props) {
  const [loadingId, setLoadingId] = useState<ProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentResponse | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
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

  const finalAmount = appliedPromo ? appliedPromo.finalAmount : price;

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await fetch("/api/payments/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, code: promoInput, lang }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPromoError(data.error ?? t.genericError);
        return;
      }
      setAppliedPromo({
        code: data.code,
        originalAmount: data.originalAmount,
        discountAmount: data.discountAmount,
        finalAmount: data.finalAmount,
      });
    } catch {
      setPromoError(t.genericError);
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  };

  const handlePay = async (providerId: ProviderId) => {
    setLoadingId(providerId);
    setError(null);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteId,
          provider: providerId,
          lang,
          ...(appliedPromo ? { promoCode: appliedPromo.code } : {}),
        }),
      });
      const data: PaymentResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.genericError);
      setPaymentData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setLoadingId(null);
    }
  };

  if (paymentData?.status === "PAID" && paymentData.published) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-center">
        <p className="font-bold text-emerald-800">{t.publishedTitle}</p>
        <p className="text-sm text-emerald-700 mt-1 leading-relaxed">{t.publishedBody}</p>
      </div>
    );
  }

  if (paymentData?.instructions) {
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

  const showProviders = finalAmount > 0;

  if (showProviders && providers.length === 0) {
    return (
      <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-5">
        <p className="font-semibold text-zinc-800">{t.unavailableTitle}</p>
        <p className="text-sm text-zinc-500 mt-0.5 leading-relaxed">{t.unavailableBody}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-bold text-zinc-900">{t.publishTitle(inviteTitle)}</h3>
        <p className="text-sm text-zinc-500 mt-0.5">{t.choosePayVia}</p>
      </div>

      <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-5">
        {appliedPromo ? (
          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span>{t.priceLabel}</span>
              <span>{price.toLocaleString(lang === "ru" ? "ru-RU" : "kk-KZ")} ₸</span>
            </div>
            <div className="flex items-center justify-between text-sm text-emerald-600 font-medium">
              <span>Промокод {appliedPromo.code}</span>
              <span>-{appliedPromo.discountAmount.toLocaleString(lang === "ru" ? "ru-RU" : "kk-KZ")} ₸</span>
            </div>
            <div className="h-px bg-rose-200 my-1" />
            <div className="flex items-center justify-between text-sm font-bold text-zinc-800">
              <span>{t.payableLabel}</span>
              <span>{finalAmount.toLocaleString(lang === "ru" ? "ru-RU" : "kk-KZ")} ₸</span>
            </div>
          </div>
        ) : null}

        <div className="text-center">
          <p className="text-3xl font-black text-zinc-900">
            {finalAmount.toLocaleString(lang === "ru" ? "ru-RU" : "kk-KZ")}
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
      </div>

      {appliedPromo ? (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5">
          <span className="text-sm font-semibold text-emerald-700">{appliedPromo.code}</span>
          <button onClick={removePromo} className="text-xs font-medium text-emerald-600 hover:text-emerald-800 transition-colors">
            {t.remove}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder={t.promoPlaceholder}
              className="flex-1 rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-800 uppercase focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
            />
            <button
              onClick={applyPromo}
              disabled={promoLoading || !promoInput.trim()}
              className="shrink-0 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {promoLoading ? t.applying : t.apply}
            </button>
          </div>
          {promoError && <p className="text-xs text-red-500">{promoError}</p>}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      <div className="flex flex-col gap-2">
        {finalAmount === 0 ? (
          <Button
            size="lg"
            loading={loadingId !== null}
            onClick={() => handlePay(providers[0]?.id ?? "KASPI_LINK")}
            className="w-full"
          >
            {t.freePublish} →
          </Button>
        ) : (
          providers.map((p) => (
            <Button
              key={p.id}
              size="lg"
              loading={loadingId === p.id}
              disabled={loadingId !== null && loadingId !== p.id}
              onClick={() => handlePay(p.id)}
              className="w-full"
            >
              {p.label} →
            </Button>
          ))
        )}
      </div>
    </div>
  );
}
