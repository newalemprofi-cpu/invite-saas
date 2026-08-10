"use client";

import { useEffect, useRef, useState } from "react";
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
  /** Admin's RECEIPT WhatsApp number (getAdminConfig().receiptWhatsapp) — deliberately separate from the order-WhatsApp number used elsewhere in the app. */
  receiptWhatsapp: string;
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
  modalSubtext: string;
  uploadReceipt: string;
  sendViaWhatsapp: string;
  checking: string;
  confirmed: string;
  sentForReview: string;
  reviewRequiredTitle: string;
  reviewBannerBody: string;
  later: string;
  close: string;
  openInvite: string;
  /** Fixed, no technical/payment details — the customer attaches the receipt manually in WhatsApp. */
  whatsappMessage: string;
}

const T: Record<Lang, PaymentFlowStrings> = {
  kk: {
    pendingTitle: "Төлем күтілуде",
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
    modalSubtext: "Төлем жасаған болсаңыз, чекті жүктеңіз.\nЖүйе чекті автоматты түрде тексереді.",
    uploadReceipt: "Чекті жүктеу",
    sendViaWhatsapp: "WhatsApp арқылы жіберу",
    checking: "Чек тексерілуде...",
    confirmed: "✓ Төлем расталды",
    sentForReview: "Чек қабылданды.\nТөлем қосымша тексеруге жіберілді.",
    reviewRequiredTitle: "Қосымша тексеру қажет",
    reviewBannerBody: "Чек қабылданды. Төлем қосымша тексеруге жіберілді.",
    later: "Кейінірек",
    close: "Жабу",
    openInvite: "Шақыруды ашу →",
    whatsappMessage: "Сәлеметсіз бе!\nШақыру төлемінің чегін жіберемін.",
  },
  ru: {
    pendingTitle: "Ожидается оплата",
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
    paidQuestion: "Вы оплатили?",
    modalSubtext: "Если оплата выполнена, загрузите чек.\nСистема автоматически проверит его.",
    uploadReceipt: "Загрузить чек",
    sendViaWhatsapp: "Отправить через WhatsApp",
    checking: "Чек проверяется...",
    confirmed: "✓ Платёж подтверждён",
    sentForReview: "Чек получен.\nПлатёж отправлен на дополнительную проверку.",
    reviewRequiredTitle: "Требуется дополнительная проверка",
    reviewBannerBody: "Чек получен. Платёж отправлен на дополнительную проверку.",
    later: "Позже",
    close: "Закрыть",
    openInvite: "Открыть приглашение →",
    whatsappMessage: "Здравствуйте!\nОтправляю чек оплаты приглашения.",
  },
};

/** sessionStorage flag proving THIS specific Payment's Kaspi link was actually clicked — never means paid, only "customer opened Kaspi". */
function kaspiOpenedKey(paymentId: string): string {
  return `kaspiPaymentOpened:${paymentId}`;
}

function armKaspiOpened(paymentId: string) {
  try {
    sessionStorage.setItem(kaspiOpenedKey(paymentId), String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode etc.) — the return modal simply won't auto-show; manual entry point still works.
  }
}

/**
 * Detects the customer coming back to this tab after having clicked
 * through to Kaspi — the concrete cross-platform signal for "browser
 * backgrounded (Kaspi app/site opened) then foregrounded again" is a
 * hidden→visible transition, which fires consistently on both desktop tab
 * switches and mobile app-switches. `pageshow` with `persisted: true`
 * covers browsers (notably iOS Safari) that suspend/bfcache the page
 * instead of just hiding it. Plain `focus` is deliberately NOT used as a
 * trigger — it also fires for unrelated reasons (e.g. closing the native
 * file picker from the receipt upload button), which would pop this modal
 * at the wrong moment.
 */
function useKaspiReturnDetection(paymentId: string | null, enabled: boolean, onReturn: () => void) {
  // A ref (not effect-local state) so "already shown for this arming" survives
  // the effect being torn down and recreated — which happens on every
  // re-render if `onReturn` were in the dependency array, since callers pass
  // a fresh inline closure each time (e.g. closing the modal itself causes a
  // re-render). Keyed by the arm token's own timestamp value, so a genuinely
  // NEW arming (customer clicks the Kaspi link again) gets a new key and is
  // free to show the modal again.
  const shownForArmRef = useRef<string | null>(null);
  const onReturnRef = useRef(onReturn);
  useEffect(() => {
    onReturnRef.current = onReturn;
  }, [onReturn]);

  useEffect(() => {
    if (!paymentId || !enabled) return;

    let wasHidden = document.visibilityState === "hidden";

    // Deliberately re-read sessionStorage on every transition rather than
    // once at effect-setup time: this effect mounts as soon as a Payment
    // exists (KaspiInstructions renders), which is BEFORE the customer has
    // clicked the Kaspi link at all — checking once here would always see
    // "not armed yet" and silently never attach a listener for the arming
    // that happens moments later on click.
    const maybeShow = () => {
      let armValue: string | null = null;
      try {
        armValue = sessionStorage.getItem(kaspiOpenedKey(paymentId));
      } catch {
        armValue = null;
      }
      if (!armValue) return;
      const armKey = `${paymentId}:${armValue}`;
      if (shownForArmRef.current === armKey) return;
      shownForArmRef.current = armKey;
      onReturnRef.current();
    };

    const onVisibility = () => {
      const visible = document.visibilityState === "visible";
      if (visible && wasHidden) maybeShow();
      wasHidden = !visible;
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) maybeShow();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [paymentId, enabled]);
}

export function PaymentFlow({
  inviteId,
  inviteTitle,
  currentStatus,
  price,
  lang,
  providers,
  receiptVerificationEnabled,
  receiptWhatsapp,
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
  const [showReturnModal, setShowReturnModal] = useState(false);
  const t = T[lang];

  // REJECTED/FAILED are terminal for that one attempt, not for the Payment —
  // the customer must still be able to open the modal and try again, so only
  // genuinely in-progress statuses suppress the retry entry point.
  const hasReceiptInFlight =
    latestReceiptStatus === "UPLOADED" ||
    latestReceiptStatus === "PROCESSING" ||
    latestReceiptStatus === "REVIEW_REQUIRED";

  // The "active" payment for return-modal purposes is whichever one the
  // customer can currently act on: the one just created in THIS tab
  // (paymentData, set synchronously by handlePay — currentStatus/
  // pendingPaymentId are server props frozen at the initial page load and
  // never reflect a payment created moments ago without a full reload), or
  // else the pending payment the server already knew about at load time.
  const activePaymentId = paymentData?.paymentId ?? pendingPaymentId;
  const activePaymentReference = paymentData ? formatPaymentReference(paymentData.paymentId) : pendingPaymentReference;
  const activePaymentAmount = paymentData?.amount ?? pendingPaymentAmount;
  const isPaid = paymentData?.status === "PAID";

  useKaspiReturnDetection(
    activePaymentId,
    !isPaid && !hasReceiptInFlight,
    () => setShowReturnModal(true)
  );

  const returnModal =
    showReturnModal && !isPaid && activePaymentId && activePaymentReference && activePaymentAmount != null ? (
      <KaspiReturnModal
        lang={lang}
        t={t}
        receiptVerificationEnabled={receiptVerificationEnabled}
        whatsappNumber={receiptWhatsapp}
        paymentContext={{ id: activePaymentId, reference: activePaymentReference, amount: activePaymentAmount }}
        onClose={() => setShowReturnModal(false)}
        onSettled={() => router.refresh()}
      />
    ) : null;

  if (currentStatus === "PENDING_PAYMENT" && !paymentData) {
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
            <p className="text-sm font-semibold text-blue-800">{t.reviewRequiredTitle}</p>
            <p className="text-sm text-blue-700 mt-0.5">{t.reviewBannerBody}</p>
          </div>
        ) : (
          activePaymentId && (
            // Compact manual entry point — the modal normally opens itself
            // on return-from-Kaspi detection, but sessionStorage doesn't
            // survive a closed browser/new session, so this keeps the
            // capability reachable even when auto-detection can't fire.
            <button
              onClick={() => setShowReturnModal(true)}
              className="self-start text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors underline underline-offset-2"
            >
              {t.paidQuestion}
            </button>
          )
        )}
        {returnModal}
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
        <KaspiInstructions
          data={paymentData.instructions}
          planName={t.planName}
          lang={lang}
          onOpenKaspi={() => armKaspiOpened(paymentData.paymentId)}
        />
        {returnModal}
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

  // Deliberately clean: only the payment-method action(s), no receipt/WhatsApp
  // buttons here. Those only appear once a Payment exists and Kaspi was
  // actually opened — see the return modal above.
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
      {returnModal}
    </div>
  );
}

type Translations = PaymentFlowStrings;

interface PaymentContext {
  id: string;
  reference: string;
  amount: number;
}

const buttonBase =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-50";

interface KaspiReturnModalProps {
  lang: Lang;
  t: Translations;
  receiptVerificationEnabled: boolean;
  whatsappNumber: string;
  paymentContext: PaymentContext;
  onClose: () => void;
  /** Called after ANY terminal upload outcome (verified or sent-to-review) — refreshes server props so a later reload/re-arm sees up-to-date pendingPaymentId/latestReceiptStatus. */
  onSettled: () => void;
}

/**
 * The "did you pay?" dialog — shown automatically when the customer
 * returns to this tab after clicking through to Kaspi (see
 * useKaspiReturnDetection above), or manually via the small text link.
 * Embeds the exact same working upload/WhatsApp actions as before; this is
 * only a presentational wrapper, not a second implementation of either.
 */
function KaspiReturnModal({ lang, t, receiptVerificationEnabled, whatsappNumber, paymentContext, onClose, onSettled }: KaspiReturnModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const openWhatsapp = () => {
    const phone = whatsappNumber.replace(/\D/g, "");
    const href = `https://wa.me/${phone}?text=${encodeURIComponent(t.whatsappMessage)}`;
    window.open(href, "_blank");
  };

  const handleWhatsapp = async () => {
    setWhatsappLoading(true);
    try {
      openWhatsapp();
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
      const form = new FormData();
      form.append("paymentId", paymentContext.id);
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
      } else {
        setResult({ ok: true, message: t.sentForReview });
      }
    } catch {
      setResult({ ok: false, message: t.genericError });
    } finally {
      setUploading(false);
    }
  };

  // Refreshing (which can swap this whole screen for the published view once
  // PAID) only happens once the customer dismisses the modal themselves —
  // never the instant the upload finishes — so a just-shown "✓ Төлем
  // расталды" message can't be yanked away before they've had a chance to
  // read it.
  const handleDismiss = () => {
    if (result) onSettled();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0" onClick={handleDismiss}>
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {result ? (
          <div className={`rounded-2xl p-4 ${result.ok ? "bg-blue-50 border border-blue-100" : "bg-red-50 border border-red-100"}`}>
            <p className={`text-sm font-semibold whitespace-pre-line ${result.ok ? "text-blue-800" : "text-red-700"}`}>{result.message}</p>
          </div>
        ) : (
          <div>
            <h3 className="font-bold text-zinc-900 text-lg">{t.paidQuestion}</h3>
            <p className="text-sm text-zinc-500 mt-1 whitespace-pre-line leading-relaxed">{t.modalSubtext}</p>
          </div>
        )}

        {!result && uploading && <p className="text-sm text-zinc-500">{t.checking}</p>}

        {!result && !uploading && (
          <div className="flex flex-col gap-2">
            {receiptVerificationEnabled && (
              <button onClick={() => fileInputRef.current?.click()} className={`${buttonBase} bg-zinc-900 text-white hover:bg-zinc-800 w-full`}>
                {t.uploadReceipt}
              </button>
            )}
            <button
              onClick={handleWhatsapp}
              disabled={whatsappLoading}
              className={`${buttonBase} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 w-full`}
            >
              {t.sendViaWhatsapp}
            </button>
          </div>
        )}

        <button onClick={handleDismiss} className="text-sm font-medium text-zinc-400 hover:text-zinc-600 transition-colors">
          {result ? t.close : t.later}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFilePicked}
        />
      </div>
    </div>
  );
}
