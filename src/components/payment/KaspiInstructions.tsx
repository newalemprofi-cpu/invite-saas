import { cn } from "@/lib/utils";

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
}

export function KaspiInstructions({ data, planName }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* Amount card */}
      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-center">
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
          Төлем сомасы
        </p>
        <p className="text-4xl font-bold text-emerald-700">
          {data.amount.toLocaleString("kk-KZ")} ₸
        </p>
        <p className="text-xs text-emerald-600 mt-1">{planName} жоспары</p>
      </div>

      {/* Reference */}
      <div className="rounded-xl bg-zinc-100 px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-500 font-medium">Себеп/хабарлама:</span>
        <code className="text-sm font-mono font-bold text-zinc-800 tracking-widest">
          INV-{data.reference}
        </code>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-zinc-700">Төлем нұсқаулары</p>
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
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F14635] text-white text-sm font-bold transition-opacity hover:opacity-90"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-13h2v6h-2zm0 8h2v2h-2z" />
          </svg>
          Kaspi арқылы ашу
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
        <p className="text-xs text-amber-800 leading-relaxed">
          Төлемді жасағаннан кейін admin{" "}
          <strong>1-24 сағат ішінде</strong> растайды. Шақыру автоматты түрде
          белсенді болады.
        </p>
      </div>
    </div>
  );
}
