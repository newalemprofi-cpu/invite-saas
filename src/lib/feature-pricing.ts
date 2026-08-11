import { db } from "@/lib/db";
import { FEATURE_KEYS, FEATURE_DEFAULT_COPY, FEATURE_DEFAULT_PRICE, QR_DEFAULT_COPY, type FeatureKey } from "@/lib/features";

/**
 * Admin-managed pricing/copy for the optional paid add-ons (§15/§24) — the
 * SAME generic SiteSettings key/value store used by admin-config.ts,
 * site-content.ts, payment-providers.ts, receipts/settings.ts (key:
 * "feature_pricing" here). Base invitation price stays exactly where it
 * already lived — AdminConfig.price (lib/admin-config.ts) — this module
 * does NOT duplicate it, only the optional add-ons + free QR toggle.
 */
export interface FeatureConfig {
  enabled: boolean;
  price: number;
  titleKk: string;
  titleRu: string;
  descKk: string;
  descRu: string;
}

export interface QrConfig {
  enabled: boolean;
  titleKk: string;
  titleRu: string;
  descKk: string;
  descRu: string;
}

export type FeaturePricingConfig = Record<FeatureKey, FeatureConfig> & { qr: QrConfig };

const SETTINGS_KEY = "feature_pricing";

export function defaultFeaturePricing(): FeaturePricingConfig {
  const features = Object.fromEntries(
    FEATURE_KEYS.map((key) => [
      key,
      {
        enabled: true,
        price: FEATURE_DEFAULT_PRICE[key],
        ...FEATURE_DEFAULT_COPY[key],
      } satisfies FeatureConfig,
    ])
  ) as Record<FeatureKey, FeatureConfig>;

  return {
    ...features,
    qr: { enabled: true, ...QR_DEFAULT_COPY },
  };
}

function mergeFeature(stored: Partial<FeatureConfig> | undefined, fallback: FeatureConfig): FeatureConfig {
  if (!stored || typeof stored !== "object") return fallback;
  return {
    enabled: typeof stored.enabled === "boolean" ? stored.enabled : fallback.enabled,
    price: typeof stored.price === "number" && stored.price >= 0 ? stored.price : fallback.price,
    titleKk: stored.titleKk?.trim() || fallback.titleKk,
    titleRu: stored.titleRu?.trim() || fallback.titleRu,
    descKk: stored.descKk?.trim() || fallback.descKk,
    descRu: stored.descRu?.trim() || fallback.descRu,
  };
}

export async function getFeaturePricing(): Promise<FeaturePricingConfig> {
  const d = defaultFeaturePricing();
  try {
    const row = await db.siteSettings.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row) return d;
    const v = (row.value ?? {}) as Partial<FeaturePricingConfig>;

    const features = Object.fromEntries(
      FEATURE_KEYS.map((key) => [key, mergeFeature(v[key], d[key])])
    ) as Record<FeatureKey, FeatureConfig>;

    const qrStored = v.qr;
    const qr: QrConfig = {
      // QR is ALWAYS free (§19) — enabled here only gates whether the
      // free toggle is offered at all, never a price. No `price` field
      // exists on QrConfig by construction, so there is nothing to
      // validate/clamp for it.
      enabled: typeof qrStored?.enabled === "boolean" ? qrStored.enabled : d.qr.enabled,
      titleKk: qrStored?.titleKk?.trim() || d.qr.titleKk,
      titleRu: qrStored?.titleRu?.trim() || d.qr.titleRu,
      descKk: qrStored?.descKk?.trim() || d.qr.descKk,
      descRu: qrStored?.descRu?.trim() || d.qr.descRu,
    };

    return { ...features, qr };
  } catch {
    return d;
  }
}

export async function updateFeaturePricing(patch: Partial<FeaturePricingConfig>): Promise<FeaturePricingConfig> {
  const current = await getFeaturePricing();
  const merged: FeaturePricingConfig = { ...current, ...patch };
  const jsonValue = merged as unknown as Parameters<typeof db.siteSettings.create>[0]["data"]["value"];
  await db.siteSettings.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: jsonValue },
    create: { key: SETTINGS_KEY, value: jsonValue },
  });
  return merged;
}
