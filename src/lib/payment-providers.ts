/**
 * Payment PROVIDER CONFIGURATION — deliberately separate from payment
 * TRANSACTIONS (the `Payment` Prisma model). This module only ever reads/
 * writes admin-configurable settings (is Kaspi enabled, what link, what
 * contact details); it never creates or mutates a `Payment` row. Reuses
 * the existing generic `SiteSettings` key/value store (see admin-config.ts
 * for the sibling "site settings" concept) instead of adding a dedicated
 * Prisma model — no schema change needed for this MVP.
 *
 * Naming note: the provider id here is `KASPI_LINK` (the *configuration*
 * concept). At the transaction layer, `Payment.provider` still stores the
 * existing Prisma enum value `MANUAL_KASPI` — the two names refer to the
 * same real-world payment method at two different layers and are not a
 * schema duplication.
 *
 * Only KASPI_LINK has settings worth storing: it's the only provider with
 * a real, working adapter (src/lib/payment/providers/kaspi.ts). The other
 * providers below have no functioning `createPaymentUrl`/webhook-handling
 * code path that could actually complete a payment — see
 * NOT_IMPLEMENTED_PROVIDERS. There is intentionally no `enabled` flag for
 * them anywhere: a boolean with no adapter behind it would let the admin
 * "turn on" something that silently can't work, which is exactly what
 * this module must not do.
 */
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type ProviderMode = "TEST" | "LIVE";
export type ConfirmationMode = "MANUAL_APPROVAL";

export interface KaspiLinkConfig {
  paymentUrl: string;
  merchantPhone: string;
  adminEmail: string;
  adminPhone: string;
  instructionsKk: string;
  instructionsRu: string;
  /** Minutes a customer has to complete payment before it's considered stale. 0 = no limit. */
  timeoutMinutes: number;
}

export interface ProviderEntry<TConfig = Record<string, never>> {
  enabled: boolean;
  mode: ProviderMode;
  currency: "KZT";
  confirmationMode: ConfirmationMode;
  config: TConfig;
}

export interface PaymentProvidersSettings {
  KASPI_LINK: ProviderEntry<KaspiLinkConfig>;
}

/**
 * Providers with no working payment-creation code path (verified against
 * src/lib/payment/providers/*.ts): APIPAY's and CLOUDPAYMENTS' adapters
 * both unconditionally `throw new Error("... not yet implemented")` from
 * their create-payment function, and FREEDOM_PAY/HALYK_EPAY/WOOPPAY have
 * no adapter file at all. `envVars` lists the credential names the
 * *existing* scaffold code already references — shown to the admin as
 * documentation of what a real integration would need, not as a
 * configurable/enable-able form (there is nothing for those values to
 * actually do yet).
 */
export const NOT_IMPLEMENTED_PROVIDERS = [
  { id: "APIPAY", label: "ApiPay", envVars: ["APIPAY_API_KEY", "WEBHOOK_SECRET_APIPAY"] },
  { id: "CLOUDPAYMENTS", label: "CloudPayments", envVars: ["CLOUDPAYMENTS_PUBLIC_ID", "CLOUDPAYMENTS_API_SECRET", "WEBHOOK_SECRET_CLOUDPAYMENTS"] },
  { id: "FREEDOM_PAY", label: "Freedom Pay", envVars: [] },
  { id: "HALYK_EPAY", label: "Halyk ePay", envVars: [] },
  { id: "WOOPPAY", label: "Wooppay", envVars: [] },
] as const;

const SETTINGS_KEY = "payment_providers";

const DEFAULT_INSTRUCTIONS_KK =
  "Kaspi Go немесе kaspi.kz қолданбасын ашыңыз\n\"Аударым\" бөліміне өтіңіз";
const DEFAULT_INSTRUCTIONS_RU =
  "Откройте Kaspi Go или kaspi.kz\nПерейдите в раздел «Перевод»";

export function defaultPaymentProviders(): PaymentProvidersSettings {
  return {
    KASPI_LINK: {
      enabled: true,
      mode: "LIVE",
      currency: "KZT",
      confirmationMode: "MANUAL_APPROVAL",
      config: {
        // Env vars remain the fallback so an already-deployed instance
        // keeps working unchanged until an admin opens the new settings
        // page and saves — after that, the DB row is authoritative.
        paymentUrl: process.env.KASPI_PAYMENT_LINK ?? "",
        merchantPhone: process.env.KASPI_PHONE_NUMBER ?? "",
        adminEmail: "",
        adminPhone: process.env.NEXT_PUBLIC_ADMIN_PHONE ?? "",
        instructionsKk: DEFAULT_INSTRUCTIONS_KK,
        instructionsRu: DEFAULT_INSTRUCTIONS_RU,
        timeoutMinutes: 0,
      },
    },
  };
}

export async function getPaymentProviders(): Promise<PaymentProvidersSettings> {
  const d = defaultPaymentProviders();
  try {
    const row = await db.siteSettings.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row) return d;
    const v = (row.value ?? {}) as Partial<PaymentProvidersSettings>;
    return {
      KASPI_LINK: {
        ...d.KASPI_LINK,
        ...v.KASPI_LINK,
        config: { ...d.KASPI_LINK.config, ...v.KASPI_LINK?.config },
      },
    };
  } catch {
    return d;
  }
}

export async function getKaspiLinkConfig(): Promise<ProviderEntry<KaspiLinkConfig>> {
  return (await getPaymentProviders()).KASPI_LINK;
}

export async function updateKaspiLinkConfig(
  patch: Partial<Omit<ProviderEntry<KaspiLinkConfig>, "config">> & { config?: Partial<KaspiLinkConfig> }
): Promise<PaymentProvidersSettings> {
  const current = await getPaymentProviders();
  const merged: PaymentProvidersSettings = {
    KASPI_LINK: {
      ...current.KASPI_LINK,
      ...patch,
      config: { ...current.KASPI_LINK.config, ...patch.config },
    },
  };
  const jsonValue = merged as unknown as Prisma.InputJsonValue;
  await db.siteSettings.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: jsonValue },
    create: { key: SETTINGS_KEY, value: jsonValue },
  });
  return merged;
}
