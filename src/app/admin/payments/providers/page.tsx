import type { Metadata } from "next";
import { getPaymentProviders, type StubProviderId } from "@/lib/payment-providers";
import { KaspiProviderForm } from "./KaspiProviderForm";

export const metadata: Metadata = { title: "Провайдерлер — Admin" };
export const dynamic = "force-dynamic";

const STUB_LABELS: Record<StubProviderId, string> = {
  APIPAY: "ApiPay",
  FREEDOM_PAY: "Freedom Pay",
  HALYK_EPAY: "Halyk ePay",
  WOOPPAY: "Wooppay",
};

export default async function ProvidersPage() {
  const providers = await getPaymentProviders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Төлем провайдерлері</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Kaspi сілтемесі мен байланыс деректерін осы жерден өзгертіңіз — деплой қажет емес.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-bold text-zinc-900">Kaspi (сілтеме + қолмен растау)</h2>
          <span className="rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
            Негізгі
          </span>
        </div>
        <KaspiProviderForm provider={providers.KASPI_LINK} />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-zinc-900 mb-1">Басқа провайдерлер</h2>
        <p className="text-xs text-zinc-400 mb-4">Әзірге қосылмаған — келешекте іске асырылады</p>
        <div className="divide-y divide-zinc-50">
          {(Object.keys(STUB_LABELS) as StubProviderId[]).map((id) => (
            <div key={id} className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-zinc-700">{STUB_LABELS[id]}</span>
              <span className="rounded-full bg-zinc-100 text-zinc-400 text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider">
                {providers[id].enabled ? "Қосулы" : "Қосылмаған"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
