import { FEATURE_KEYS, isFeatureKey, type FeatureKey } from "@/lib/features";
import type { FeaturePricingConfig } from "@/lib/feature-pricing";
import type { Lang } from "@/lib/i18n";

export interface PriceLineItem {
  key: FeatureKey;
  price: number;
  titleKk: string;
  titleRu: string;
}

export interface InvitePriceBreakdown {
  basePrice: number;
  lineItems: PriceLineItem[];
  total: number;
}

/**
 * THE single server-authoritative price calculator (§13/§20/§21). Every
 * caller — the price-summary display endpoint AND /api/payments/create —
 * MUST go through this, and MUST supply `basePrice`/`pricing` freshly read
 * from admin config at call time, never a client-supplied number. A
 * feature key that is unknown, or admin-disabled, is silently dropped
 * (never priced, never purchasable) rather than erroring — this is what
 * makes "disabled admin feature cannot be purchased" (test #14) true by
 * construction: there is no code path that can price a disabled feature.
 */
export function calculateInvitePrice(
  selectedFeatureKeys: string[],
  pricing: FeaturePricingConfig,
  basePrice: number
): InvitePriceBreakdown {
  const seen = new Set<FeatureKey>();
  const lineItems: PriceLineItem[] = [];

  for (const raw of selectedFeatureKeys) {
    if (!isFeatureKey(raw) || seen.has(raw)) continue;
    const cfg = pricing[raw];
    if (!cfg.enabled) continue;
    seen.add(raw);
    lineItems.push({ key: raw, price: cfg.price, titleKk: cfg.titleKk, titleRu: cfg.titleRu });
  }

  // Stable order matching FEATURE_KEYS, not client-submission order.
  lineItems.sort((a, b) => FEATURE_KEYS.indexOf(a.key) - FEATURE_KEYS.indexOf(b.key));

  const total = basePrice + lineItems.reduce((sum, li) => sum + li.price, 0);
  return { basePrice, lineItems, total };
}

export function lineItemTitle(item: PriceLineItem, lang: Lang): string {
  return lang === "ru" ? item.titleRu : item.titleKk;
}
