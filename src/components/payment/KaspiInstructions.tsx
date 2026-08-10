import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/i18n";

interface KaspiInstructionsData {
  kaspiLink?: string;
  phone?: string;
  amount: number;
  reference: string;
  steps: string[];
}

interface Props {
  data: KaspiInstructionsData;
  planName: string;
  lang: Lang;
  /** Fired when the customer actually clicks through to Kaspi — this is the ONLY moment we know they intended to pay, never earlier. */
  onOpenKaspi?: () => void;
}

const T = {
  kk: {
    amountLabel: "Төлем сомасы",
    planSuffix: (plan: string) => `${plan} жоспары`,
    referenceLabel: "Себеп/хабарлама:",
    stepsTitle: "Төлем нұсқаулары",
    openKaspi: "Kaspi арқылы ашу",
    warning: (
      <>
        Төлемді жасағаннан кейін admin <strong>1-24 сағат ішінде</strong> растайды. Шақыру автоматты түрде белсенді болады.
      </>
    ),
  },
  ru: {
    amountLabel: "Сумма к оплате",
    planSuffix: (plan: string) => `План: ${plan}`,
    referenceLabel: "Назначение платежа:",
    stepsTitle: "Инструкция по оплате",
    openKaspi: "Открыть в Kaspi",
    warning: (
      <>
        После оплаты администратор подтвердит в течение <strong>1-24 часов</strong>. Приглашение станет активным автоматически.
      </>
    ),
  },
} as const;

// `data.steps` is built server-side by the Kaspi provider layer
// (src/lib/payment/providers/kaspi.ts) from the admin-configured settings
// AND the request's `lang` — already localized by the time it gets here.
export function KaspiInstructions({ data, planName, lang, onOpenKaspi }: Props) {
  const t = T[lang];
  return (
    <div className="flex flex-col gap-5">
      {/* Amount card */}
      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-center">
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
          {t.amountLabel}
        </p>
        <p className="text-4xl font-bold text-emerald-700">
          {data.amount.toLocaleString(lang === "ru" ? "ru-RU" : "kk-KZ")} ₸
        </p>
        <p className="text-xs text-emerald-600 mt-1">{t.planSuffix(planName)}</p>
      </div>

      {/* Reference */}
      <div className="rounded-xl bg-zinc-100 px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-500 font-medium">{t.referenceLabel}</span>
        <code className="text-sm font-mono font-bold text-zinc-800 tracking-widest">
          INV-{data.reference}
        </code>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-zinc-700">{t.stepsTitle}</p>
        <ol className="flex flex-col gap-2.5">
          {data.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-zinc-700 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Kaspi link */}
      {data.kaspiLink && (
        <a
          href={data.kaspiLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onOpenKaspi}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F14635] text-white text-sm font-bold transition-opacity hover:opacity-90"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-13h2v6h-2zm0 8h2v2h-2z" />
          </svg>
          {t.openKaspi}
        </a>
      )}

      {/* Warning */}
      <div
        className={cn(
          "rounded-xl border px-4 py-3 flex items-start gap-2.5",
          "bg-amber-50 border-amber-100"
        )}
      >
        <span className="text-lg shrink-0">⚠️</span>
        <p className="text-xs text-amber-800 leading-relaxed">{t.warning}</p>
      </div>
    </div>
  );
}
