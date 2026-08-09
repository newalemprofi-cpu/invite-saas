import type { Metadata } from "next";
import Link from "next/link";
import { getPaymentProviders, ALL_PROVIDER_IDS, PROVIDER_LABELS, getMissingRequiredFields } from "@/lib/payment-providers";

export const metadata: Metadata = { title: "Провайдерлер — Admin" };
export const dynamic = "force-dynamic";

export default async function ProvidersListPage() {
  const providers = await getPaymentProviders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Төлем провайдерлері</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Әр провайдерді жеке баптап, қосу/өшіру осы жерден жасалады — деплой қажет емес.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm divide-y divide-zinc-50">
        {ALL_PROVIDER_IDS.map((id) => {
          const entry = providers[id];
          const missing = getMissingRequiredFields(id, entry.config);
          const configured = missing.length === 0;
          const statusLabel = entry.enabled ? "Қосулы" : "Өшірулі";
          const statusCls = entry.enabled ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500";

          return (
            <div key={id} className="flex items-center justify-between gap-3 p-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-zinc-800">{PROVIDER_LABELS[id]}</p>
                {!configured && (
                  <p className="text-[11px] text-amber-600 mt-0.5">Баптау аяқталмаған</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`rounded-full text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider ${statusCls}`}>
                  {entry.enabled ? `ON  ${statusLabel}` : `OFF  ${statusLabel}`}
                </span>
                <Link
                  href={`/admin/payments/providers/${id}`}
                  className="inline-flex h-8 items-center rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Баптау
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
