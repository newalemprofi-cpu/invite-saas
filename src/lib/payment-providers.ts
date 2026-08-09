/**
 * Payment PROVIDER CONFIGURATION — deliberately separate from payment
 * TRANSACTIONS (the `Payment` Prisma model). This module only ever reads/
 * writes admin-configurable settings; it never creates or mutates a
 * `Payment` row. Reuses the existing generic `SiteSettings` key/value
 * store rather than a dedicated Prisma model.
 *
 * Every provider (Kaspi, ApiPay, CloudPayments, Freedom Pay, Halyk ePay,
 * Wooppay) has a full, admin-editable configuration + an enabled/disabled
 * toggle. `confirmationMode` is `MANUAL_APPROVAL` for all of them: none of
 * these adapters has a real, working "redirect the customer into a live
 * gateway checkout" implementation today (see src/lib/payment/providers/
 * *.ts — apipay.ts and cloudpayments.ts's create-payment functions both
 * throw "not yet implemented"; freedompay/halykepay/wooppay have no such
 * function at all). Manual approval is the one mechanism that genuinely
 * works end-to-end for every provider today, exactly like Kaspi already
 * does — enabling a provider here means "customers can start a payment
 * intent through it and an admin manually confirms it," never "this app
 * automatically completes a live gateway transaction." The Merchant ID /
 * Secret Key / Webhook Secret fields are collected and stored now so a
 * real automated integration can be wired in later without asking the
 * admin to re-enter credentials.
 *
 * Naming: the config-layer id `KASPI_LINK` and the transaction-layer
 * `Payment.provider` enum value `MANUAL_KASPI` name the same real-world
 * method at two different layers — see PROVIDER_TO_PAYMENT_ENUM.
 */
import { db } from "@/lib/db";
import type { Prisma, PaymentProvider as PrismaPaymentProvider } from "@prisma/client";

export type ProviderMode = "TEST" | "LIVE";
export type ConfirmationMode = "MANUAL_APPROVAL";
export type ProviderId = "KASPI_LINK" | "APIPAY" | "CLOUDPAYMENTS" | "FREEDOM_PAY" | "HALYK_EPAY" | "WOOPPAY";

export const ALL_PROVIDER_IDS: ProviderId[] = [
  "KASPI_LINK",
  "APIPAY",
  "CLOUDPAYMENTS",
  "FREEDOM_PAY",
  "HALYK_EPAY",
  "WOOPPAY",
];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  KASPI_LINK: "Kaspi",
  APIPAY: "ApiPay",
  CLOUDPAYMENTS: "CloudPayments",
  FREEDOM_PAY: "Freedom Pay",
  HALYK_EPAY: "Halyk ePay",
  WOOPPAY: "Wooppay",
};

/** Config-layer id -> transaction-layer Payment.provider enum value. */
export const PROVIDER_TO_PAYMENT_ENUM: Record<ProviderId, PrismaPaymentProvider> = {
  KASPI_LINK: "MANUAL_KASPI",
  APIPAY: "APIPAY",
  CLOUDPAYMENTS: "CLOUDPAYMENTS",
  FREEDOM_PAY: "FREEDOM_PAY",
  HALYK_EPAY: "HALYK_EPAY",
  WOOPPAY: "WOOPPAY",
};

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

/** Shared shape for the 5 API-gateway-style providers. */
export interface ApiGatewayConfig {
  merchantId: string;
  secretKey: string;
  webhookSecret: string;
  instructionsKk: string;
  instructionsRu: string;
}

export interface ProviderEntry<TConfig> {
  enabled: boolean;
  mode: ProviderMode;
  currency: "KZT";
  confirmationMode: ConfirmationMode;
  config: TConfig;
}

export interface PaymentProvidersSettings {
  KASPI_LINK: ProviderEntry<KaspiLinkConfig>;
  APIPAY: ProviderEntry<ApiGatewayConfig>;
  CLOUDPAYMENTS: ProviderEntry<ApiGatewayConfig>;
  FREEDOM_PAY: ProviderEntry<ApiGatewayConfig>;
  HALYK_EPAY: ProviderEntry<ApiGatewayConfig>;
  WOOPPAY: ProviderEntry<ApiGatewayConfig>;
}

const SETTINGS_KEY = "payment_providers";

const DEFAULT_INSTRUCTIONS_KK =
  "Kaspi Go немесе kaspi.kz қолданбасын ашыңыз\n\"Аударым\" бөліміне өтіңіз";
const DEFAULT_INSTRUCTIONS_RU =
  "Откройте Kaspi Go или kaspi.kz\nПерейдите в раздел «Перевод»";

function emptyApiGatewayConfig(): ApiGatewayConfig {
  return { merchantId: "", secretKey: "", webhookSecret: "", instructionsKk: "", instructionsRu: "" };
}

function stubEntry(): ProviderEntry<ApiGatewayConfig> {
  return { enabled: false, mode: "TEST", currency: "KZT", confirmationMode: "MANUAL_APPROVAL", config: emptyApiGatewayConfig() };
}

export function defaultPaymentProviders(): PaymentProvidersSettings {
  return {
    KASPI_LINK: {
      enabled: true,
      mode: "LIVE",
      currency: "KZT",
      confirmationMode: "MANUAL_APPROVAL",
      config: {
        // Env vars remain the fallback so an already-deployed instance
        // keeps working unchanged until an admin opens the settings page
        // and saves — after that, the DB row is authoritative.
        paymentUrl: process.env.KASPI_PAYMENT_LINK ?? "",
        merchantPhone: process.env.KASPI_PHONE_NUMBER ?? "",
        adminEmail: "",
        adminPhone: process.env.NEXT_PUBLIC_ADMIN_PHONE ?? "",
        instructionsKk: DEFAULT_INSTRUCTIONS_KK,
        instructionsRu: DEFAULT_INSTRUCTIONS_RU,
        timeoutMinutes: 0,
      },
    },
    APIPAY: stubEntry(),
    CLOUDPAYMENTS: stubEntry(),
    FREEDOM_PAY: stubEntry(),
    HALYK_EPAY: stubEntry(),
    WOOPPAY: stubEntry(),
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
      APIPAY: { ...d.APIPAY, ...v.APIPAY, config: { ...d.APIPAY.config, ...v.APIPAY?.config } },
      CLOUDPAYMENTS: { ...d.CLOUDPAYMENTS, ...v.CLOUDPAYMENTS, config: { ...d.CLOUDPAYMENTS.config, ...v.CLOUDPAYMENTS?.config } },
      FREEDOM_PAY: { ...d.FREEDOM_PAY, ...v.FREEDOM_PAY, config: { ...d.FREEDOM_PAY.config, ...v.FREEDOM_PAY?.config } },
      HALYK_EPAY: { ...d.HALYK_EPAY, ...v.HALYK_EPAY, config: { ...d.HALYK_EPAY.config, ...v.HALYK_EPAY?.config } },
      WOOPPAY: { ...d.WOOPPAY, ...v.WOOPPAY, config: { ...d.WOOPPAY.config, ...v.WOOPPAY?.config } },
    };
  } catch {
    return d;
  }
}

export async function getProviderEntry<T extends ProviderId>(id: T): Promise<PaymentProvidersSettings[T]> {
  const all = await getPaymentProviders();
  return all[id];
}

export async function getKaspiLinkConfig(): Promise<ProviderEntry<KaspiLinkConfig>> {
  return (await getPaymentProviders()).KASPI_LINK;
}

/** Required-field gate for `enabled: true` — mirrors the exact fields shown in each provider's form. */
export function getMissingRequiredFields(id: ProviderId, config: KaspiLinkConfig | ApiGatewayConfig): string[] {
  if (id === "KASPI_LINK") {
    const c = config as KaspiLinkConfig;
    return c.paymentUrl?.trim() ? [] : ["paymentUrl"];
  }
  const c = config as ApiGatewayConfig;
  const missing: string[] = [];
  if (!c.merchantId?.trim()) missing.push("merchantId");
  if (!c.secretKey?.trim()) missing.push("secretKey");
  if (!c.webhookSecret?.trim()) missing.push("webhookSecret");
  return missing;
}

export class ProviderNotConfiguredError extends Error {}

/**
 * Merges `patch` into the stored entry for `id` and persists it. If the
 * merged entry has `enabled: true`, the required fields for that provider
 * must all be present or this throws `ProviderNotConfiguredError` instead
 * of silently saving a half-configured, customer-facing-but-broken
 * provider. Disabling never requires any field to be present, and never
 * clears `config` — turning a provider off only ever flips `enabled`.
 */
export async function updateProviderConfig<T extends ProviderId>(
  id: T,
  patch: Partial<Omit<PaymentProvidersSettings[T], "config">> & { config?: Partial<PaymentProvidersSettings[T]["config"]> }
): Promise<PaymentProvidersSettings> {
  const current = await getPaymentProviders();
  const mergedConfig = { ...current[id].config, ...patch.config };
  const mergedEntry = { ...current[id], ...patch, config: mergedConfig } as PaymentProvidersSettings[T];

  if (mergedEntry.enabled) {
    const missing = getMissingRequiredFields(id, mergedConfig);
    if (missing.length > 0) throw new ProviderNotConfiguredError();
  }

  const merged: PaymentProvidersSettings = { ...current, [id]: mergedEntry };
  const jsonValue = merged as unknown as Prisma.InputJsonValue;
  await db.siteSettings.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: jsonValue },
    create: { key: SETTINGS_KEY, value: jsonValue },
  });
  return merged;
}

/** Back-compat convenience wrapper — Kaspi is still the primary/default provider. */
export async function updateKaspiLinkConfig(
  patch: Partial<Omit<ProviderEntry<KaspiLinkConfig>, "config">> & { config?: Partial<KaspiLinkConfig> }
): Promise<PaymentProvidersSettings> {
  return updateProviderConfig("KASPI_LINK", patch);
}

/**
 * A provider is genuinely usable at checkout only if it's enabled AND
 * still has all its required fields — re-checked at read time (not just
 * at save time) as defense-in-depth against a settings row ending up
 * inconsistent some other way (e.g. a future admin-tooling bug).
 */
function isUsable(id: ProviderId, entry: PaymentProvidersSettings[ProviderId]): boolean {
  return entry.enabled && getMissingRequiredFields(id, entry.config).length === 0;
}

export interface CheckoutProvider {
  id: ProviderId;
  label: string;
}

/** What the customer-facing "Төлем әдісін таңдаңыз" selector may offer. */
export async function getCheckoutProviders(): Promise<CheckoutProvider[]> {
  const all = await getPaymentProviders();
  return ALL_PROVIDER_IDS.filter((id) => isUsable(id, all[id])).map((id) => ({ id, label: PROVIDER_LABELS[id] }));
}

export async function isProviderUsable(id: ProviderId): Promise<boolean> {
  const all = await getPaymentProviders();
  return isUsable(id, all[id]);
}

export const MASKED_SECRET = "••••••••••••";

/** Client-facing view of an API-gateway config: real secrets are never sent to the browser. */
export function maskApiGatewayConfig(config: ApiGatewayConfig): ApiGatewayConfig {
  return {
    ...config,
    secretKey: config.secretKey ? MASKED_SECRET : "",
    webhookSecret: config.webhookSecret ? MASKED_SECRET : "",
  };
}

/**
 * Resolves a submitted secret field against the stored one: the masked
 * placeholder means "admin didn't touch this field," so keep the existing
 * value — never overwrite a real secret with the literal mask string, and
 * never require the admin to retype it just to change something else on
 * the form.
 */
export function resolveSecretField(submitted: string, existing: string): string {
  return submitted === MASKED_SECRET ? existing : submitted;
}
