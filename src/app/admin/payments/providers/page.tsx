import type { Metadata } from "next";
import { getPaymentProviders, NOT_IMPLEMENTED_PROVIDERS } from "@/lib/payment-providers";
import { KaspiProviderForm } from "./KaspiProviderForm";

export const metadata: Metadata = { title: "Провайдерлер — Admin" };
export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const providers = await getPaymentProviders();
  const kaspi = providers.KASPI_LINK;
  const kaspiConfigured = Boolean(kaspi.config.paymentUrl);
  const kaspiStatus = !kaspi.enabled
    ? { label: "Өшірулі", cls: "bg-zinc-100 text-zinc-500" }
    : kaspiConfigured
      ? { label: "Қолжетімді / Бапталған", cls: "bg-emerald-100 text-emerald-700" }
      : { label: "Қолжетімді / Баптау қажет", cls: "bg-amber-100 text-amber-700" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Төлем провайдерлері</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Kaspi сілтемесі мен байланыс деректерін осы жерден өзгертіңіз — деплой қажет емес.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <h2 className="text-base font-bold text-zinc-900">Kaspi (сілтеме + қолмен растау)</h2>
          <span className={`rounded-full text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider ${kaspiStatus.cls}`}>
            {kaspiStatus.label}
          </span>
        </div>
        <KaspiProviderForm provider={kaspi} />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-zinc-900 mb-1">Басқа провайдерлер</h2>
        <p className="text-xs text-zinc-400 mb-4">
          Бұларға интеграция коды жазылмаған — сондықтан баптау формасы жоқ. Тек Kaspi ғана нақты
          төлемдерді өңдей алады.
        </p>
        <div className="divide-y divide-zinc-50">
          {NOT_IMPLEMENTED_PROVIDERS.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3 gap-3 flex-wrap">
              <div>
                <span className="text-sm font-medium text-zinc-700">{p.label}</span>
                {p.envVars.length > 0 && (
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Болашақта қажет болатын: {p.envVars.join(", ")}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider shrink-0">
                Интеграция жасалмаған
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
