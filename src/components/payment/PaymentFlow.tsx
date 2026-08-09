"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KaspiInstructions } from "./KaspiInstructions";
import { Button } from "@/components/ui/Button";
import type { Lang } from "@/lib/i18n";
import type { ProviderId } from "@/lib/payment-providers";
import type { ReceiptStatus } from "@prisma/client";
import { formatPaymentReference } from "@/lib/payment/reference";

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
  /** Whether admin has enabled the receipt-upload/auto-verification feature at all. */
  receiptVerificationEnabled: boolean;
  /** Admin's WhatsApp contact number (E.164-ish), reused from existing admin config. */
  whatsapp: string;
  /** Id/reference/amount of the current PENDING payment, if one exists — never recomputed client-side. */
  pendingPaymentId: string | null;
  pendingPaymentReference: string | null;
  pendingPaymentAmount: number | null;
  /** Most recent receipt attempt's status for the current PENDING payment, if any (never AUTO_VERIFIED — that implies the payment is already PAID, not PENDING). */
  latestReceiptStatus: ReceiptStatus | null;
}

interface PaymentFlowStrings {
  pendingTitle: string;
  pendingBody: string;
  payTitle: string;
  back: string;
  publishTitle: (title: string) => string;
  choosePayVia: string;
  oneTime: string;
  features: string[];
  genericError: string;
  planName: string;
  unavailableTitle: string;
  unavailableBody: string;
  priceLabel: string;
  payableLabel: string;
  promoPlaceholder: string;
  apply: string;
  applying: string;
  remove: string;
  freePublish: string;
  publishedTitle: string;
  publishedBody: string;
  paidQuestion: string;
  uploadReceipt: string;
  sendViaWhatsapp: string;
  checking: string;
  confirmed: string;
  sentForReview: string;
  reviewBannerTitle: string;
  reviewBannerBody: string;
  openInvite: string;
  whatsappMessage: (ref: string, amount: number) => string;
}

const T: Record<Lang, PaymentFlowStrings> = {
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
    paidQuestion: "Төлем жасадыңыз ба?",
    uploadReceipt: "Чекті жүктеу",
    sendViaWhatsapp: "WhatsApp арқылы жіберу",
    checking: "Чек тексерілуде...",
    confirmed: "Төлем расталды",
    sentForReview: "Чек қосымша тексеруге жіберілді",
    reviewBannerTitle: "Чек қабылданды.",
    reviewBannerBody: "Төлем қосымша тексеруге жіберілді.",
    openInvite: "Шақыруды ашу →",
    whatsappMessage: (ref: string, amount: number) =>
      `Сәлеметсіз бе!\nШақыру төлемінің чегін жіберемін.\n\nТөлем коды: ${ref}\nСома: ${amount.toLocaleString("kk-KZ")} ₸`,
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
    paidQuestion: "Уже оплатили?",
    uploadReceipt: "Загрузить чек",
    sendViaWhatsapp: "Отправить через WhatsApp",
    checking: "Чек проверяется...",
    confirmed: "Платёж подтверждён",
    sentForReview: "Чек отправлен на дополнительную проверку",
    reviewBannerTitle: "Чек получен.",
    reviewBannerBody: "Платёж отправлен на дополнительную проверку.",
    openInvite: "Открыть приглашение →",
    whatsappMessage: (ref: string, amount: number) =>
      `Здравствуйте!\nОтправляю чек оплаты приглашения.\n\nКод платежа: ${ref}\nСумма: ${amount.toLocaleString("ru-RU")} ₸`,
  },
};

export function PaymentFlow({
  inviteId,
  inviteTitle,
  currentStatus,
  price,
  lang,
  providers,
  receiptVerificationEnabled,
  whatsapp,
  pendingPaymentId,
  pendingPaymentReference,
  pendingPaymentAmount,
  latestReceiptStatus,
}: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<ProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentResponse | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const t = T[lang];

  if (currentStatus === "PENDING_PAYMENT" && !paymentData) {
    const hasReceiptInFlight = latestReceiptStatus != null;
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5 flex items-start gap-3">
          <span className="text-2xl shrink-0">⏳</span>
          <div>
            <p className="font-semibold text-amber-800">{t.pendingTitle}</p>
            <p className="text-sm text-amber-700 mt-0.5 leading-relaxed">{t.pendingBody}</p>
          </div>
        </div>

        {hasReceiptInFlight ? (
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-sm font-semibold text-blue-800">{t.reviewBannerTitle}</p>
            <p className="text-sm text-blue-700 mt-0.5">{t.reviewBannerBody}</p>
          </div>
        ) : (
          pendingPaymentId &&
          pendingPaymentReference &&
          pendingPaymentAmount != null && (
            <ReceiptSubmitBlock
              lang={lang}
              t={t}
              receiptVerificationEnabled={receiptVerificationEnabled}
              whatsappNumber={whatsapp}
              getPaymentContext={async () => ({ id: pendingPaymentId, reference: pendingPaymentReference, amount: pendingPaymentAmount })}
              onVerified={() => router.refresh()}
            />
          )
        )}
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

  // Lazily creates the PENDING payment on first receipt-upload attempt from
  // the initial (no-payment-yet) screen — exactly the same request handlePay
  // makes for a provider button, just triggered by "Чекті жүктеу" instead.
  // A customer who already paid (e.g. scanned a static Kaspi QR elsewhere)
  // shouldn't have to click a provider button first just to attach a receipt.
  const ensurePayment = async (): Promise<{ id: string; reference: string; amount: number } | null> => {
    const providerId = providers[0]?.id ?? "KASPI_LINK";
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, provider: providerId, lang, ...(appliedPromo ? { promoCode: appliedPromo.code } : {}) }),
      });
      const data: PaymentResponse & { error?: string } = await res.json();
      if (!res.ok) return null;
      if (data.status === "PAID" && data.published) {
        router.refresh();
        return null;
      }
      return { id: data.paymentId, reference: formatPaymentReference(data.paymentId), amount: data.amount };
    } catch {
      return null;
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

      {finalAmount > 0 && (
        <ReceiptSubmitBlock
          lang={lang}
          t={t}
          receiptVerificationEnabled={receiptVerificationEnabled}
          whatsappNumber={whatsapp}
          getPaymentContext={ensurePayment}
          onVerified={() => router.refresh()}
        />
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

type Translations = PaymentFlowStrings;

interface PaymentContext {
  id: string;
  reference: string;
  amount: number;
}

interface ReceiptSubmitBlockProps {
  lang: Lang;
  t: Translations;
  receiptVerificationEnabled: boolean;
  whatsappNumber: string;
  /** Returns the Payment to attach the receipt/message to, creating one first if none exists yet. */
  getPaymentContext: () => Promise<PaymentContext | null>;
  onVerified: () => void;
}

const buttonBase =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-50";

function ReceiptSubmitBlock({ lang, t, receiptVerificationEnabled, whatsappNumber, getPaymentContext, onVerified }: ReceiptSubmitBlockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const openWhatsapp = (ctx: PaymentContext) => {
    const phone = whatsappNumber.replace(/\D/g, "");
    const href = `https://wa.me/${phone}?text=${encodeURIComponent(t.whatsappMessage(ctx.reference, ctx.amount))}`;
    window.open(href, "_blank");
  };

  const handleWhatsapp = async () => {
    setWhatsappLoading(true);
    try {
      const ctx = await getPaymentContext();
      if (ctx) openWhatsapp(ctx);
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setResult(null);
    try {
      const ctx = await getPaymentContext();
      if (!ctx) {
        setUploading(false);
        return;
      }
      const form = new FormData();
      form.append("paymentId", ctx.id);
      form.append("lang", lang);
      form.append("file", file);
      const res = await fetch("/api/payments/receipts/upload", { method: "POST", body: form });
      const data: { status?: string; message?: string; error?: string } = await res.json();

      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? t.genericError });
        return;
      }
      if (data.status === "AUTO_VERIFIED" || data.status === "ALREADY_PAID") {
        setResult({ ok: true, message: t.confirmed });
        onVerified();
      } else {
        setResult({ ok: true, message: t.sentForReview });
      }
    } catch {
      setResult({ ok: false, message: t.genericError });
    } finally {
      setUploading(false);
    }
  };

  if (result) {
    return (
      <div className={`rounded-2xl p-4 ${result.ok ? "bg-blue-50 border border-blue-100" : "bg-red-50 border border-red-100"}`}>
        <p className={`text-sm font-semibold ${result.ok ? "text-blue-800" : "text-red-700"}`}>{result.message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 flex flex-col gap-2.5">
      <p className="text-sm font-semibold text-zinc-700">{t.paidQuestion}</p>
      {uploading ? (
        <p className="text-sm text-zinc-500">{t.checking}</p>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {receiptVerificationEnabled && (
            <button onClick={() => fileInputRef.current?.click()} className={`${buttonBase} bg-zinc-900 text-white hover:bg-zinc-800`}>
              {t.uploadReceipt}
            </button>
          )}
          <button
            onClick={handleWhatsapp}
            disabled={whatsappLoading}
            className={`${buttonBase} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50`}
          >
            {t.sendViaWhatsapp}
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFilePicked}
      />
    </div>
  );
}
