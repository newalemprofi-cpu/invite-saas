import { FEATURE_KEYS, isFeatureKey, type FeatureKey } from "@/lib/features";

/**
 * Safe extraction of the feature-selection/entitlement state from
 * Invite.data (still the same schemaless Json field — see final report for
 * why no migration was needed). Three states, deliberately kept separate:
 *
 *  - selectedFeatures: pre-payment "shopping cart", customer-editable via
 *    PATCH /api/invites/[id] (validated against FEATURE_KEYS there).
 *  - entitlements: post-payment permanent unlock set. NEVER accepted from
 *    the client — the PATCH/claim zod schemas deliberately do not declare
 *    this key, so any client-sent `entitlements` is silently stripped by
 *    zod before it ever reaches this data. Only ever written by
 *    lib/payment/lifecycle.ts's markPaymentPaidAndPublish, from the
 *    PAID Payment's own rawPayload.features snapshot.
 *  - qrEnabled: free ON/OFF toggle (§19), customer-editable, never
 *    affects price.
 */
export interface InviteFeatureState {
  eventCategoryId: string | null;
  selectedFeatures: FeatureKey[];
  entitlements: FeatureKey[];
  qrEnabled: boolean;
}

function toFeatureKeyArray(v: unknown): FeatureKey[] {
  if (!Array.isArray(v)) return [];
  const out: FeatureKey[] = [];
  for (const item of v) {
    if (typeof item === "string" && isFeatureKey(item) && !out.includes(item)) out.push(item);
  }
  return out;
}

export function readFeatureState(data: unknown): InviteFeatureState {
  const d = (data ?? {}) as Record<string, unknown>;

  // CRITICAL backward-compatibility rule, and the one subtlety in this
  // whole module: an ABSENT `entitlements` key is ambiguous by itself —
  // it means EITHER (a) a genuinely legacy invite that predates this
  // whole feature-monetization system (paid under the old flat single-
  // price model, which bundled every section for free — must be
  // grandfathered to FULL access), OR (b) a brand-new invite created
  // under the NEW system that simply hasn't been through
  // markPaymentPaidAndPublish yet (must NOT have any entitlements before
  // paying — §14). Both cases have no `entitlements` key. The
  // disambiguating signal is `selectedFeatures`: every new-system invite
  // gets that key written (even as `[]`) from the moment it's created
  // (see buildFreshEditorData/parseEditorData), while a genuinely legacy
  // invite has neither key at all. So: grandfather to full access ONLY
  // when BOTH keys are absent; otherwise an absent `entitlements` simply
  // means "not entitled to anything yet".
  const isLegacyInvite = !Array.isArray(d.entitlements) && !Array.isArray(d.selectedFeatures);

  return {
    eventCategoryId: typeof d.eventCategoryId === "string" ? d.eventCategoryId : null,
    selectedFeatures: toFeatureKeyArray(d.selectedFeatures),
    entitlements: Array.isArray(d.entitlements)
      ? toFeatureKeyArray(d.entitlements)
      : isLegacyInvite
      ? [...FEATURE_KEYS]
      : [],
    // Defaults to true (free, generally desirable) when never explicitly set.
    qrEnabled: typeof d.qrEnabled === "boolean" ? d.qrEnabled : true,
  };
}

export function isEntitled(data: unknown, key: FeatureKey): boolean {
  return readFeatureState(data).entitlements.includes(key);
}

export function unionEntitlements(existing: unknown, newlyPaidKeys: string[]): FeatureKey[] {
  const current = readFeatureState(existing).entitlements;
  const merged = new Set<FeatureKey>(current);
  for (const k of newlyPaidKeys) {
    if (isFeatureKey(k)) merged.add(k);
  }
  // Stable order.
  return FEATURE_KEYS.filter((k) => merged.has(k));
}
