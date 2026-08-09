import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getProviderEntry,
  maskApiGatewayConfig,
  PROVIDER_LABELS,
  ALL_PROVIDER_IDS,
  type ProviderId,
  type ProviderEntry as ProviderEntryType,
  type KaspiLinkConfig,
  type ApiGatewayConfig,
} from "@/lib/payment-providers";
import { getAppOrigin } from "@/lib/site-url";
import { KaspiProviderForm } from "./KaspiProviderForm";
import { ApiGatewayProviderForm } from "./ApiGatewayProviderForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const label = ALL_PROVIDER_IDS.includes(id as ProviderId) ? PROVIDER_LABELS[id as ProviderId] : "Провайдер";
  return { title: `${label} — Admin` };
}

function isProviderId(value: string): value is ProviderId {
  return (ALL_PROVIDER_IDS as string[]).includes(value);
}

// Existing single generic webhook receiver (see /api/payments/webhook) —
// dispatch is by ?provider= query param, not a per-provider route file, so
// this reuses real, working infrastructure instead of inventing new routes
// just to match a mockup's illustrative URL shape.
function webhookUrlFor(origin: string, id: ProviderId): string {
  return `${origin}/api/payments/webhook?provider=${encodeURIComponent(id)}`;
}

export default async function ProviderDetailPage({ params }: Props) {
  const { id: rawId } = await params;
  if (!isProviderId(rawId)) notFound();
  const id = rawId;

  const entry = await getProviderEntry(id);
  const appUrl = await getAppOrigin();
  const webhookUrl = webhookUrlFor(appUrl, id);

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/admin/payments/providers" className="hover:text-zinc-700 transition-colors">
          Провайдерлер
        </Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{PROVIDER_LABELS[id]}</span>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900">{PROVIDER_LABELS[id]}</h1>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        {id === "KASPI_LINK" ? (
          <KaspiProviderForm
            provider={entry as ProviderEntryType<KaspiLinkConfig>}
            webhookUrl={webhookUrl}
          />
        ) : (
          <ApiGatewayProviderForm
            id={id}
            provider={{
              ...(entry as ProviderEntryType<ApiGatewayConfig>),
              config: maskApiGatewayConfig((entry as ProviderEntryType<ApiGatewayConfig>).config),
            }}
            webhookUrl={webhookUrl}
          />
        )}
      </div>
    </div>
  );
}
