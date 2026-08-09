/**
 * Admin-configurable receipt-verification rules. Stored in the existing
 * generic SiteSettings key/value table (same pattern as
 * src/lib/payment-providers.ts) — no new settings model needed.
 *
 * Deliberately NOT configurable here: the expected payment amount. That is
 * always read fresh from Payment.amount (the authoritative finalAmount —
 * see the comment on that field in schema.prisma) by the verification
 * rules engine. Admins only ever configure *tolerance* around it
 * (amountTolerance), never the amount itself.
 */
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface ReceiptVerificationSettings {
  enabled: boolean;
  autoApproveVerifiedReceipts: boolean;
  /** Admin override for the extractor's base URL. Empty string = use RECEIPT_EXTRACTOR_URL env var. */
  extractorUrl: string;

  amountCheck: boolean;
  amountTolerance: number;

  verifyPaymentMethod: boolean;
  expectedPaymentMethod: string;

  verifyIin: boolean;
  allowedIins: string[];

  verifyReceiptAge: boolean;
  receiptMaxAgeHours: number;

  /** "This should normally remain enabled" per spec — admin CAN disable it, but auto-verify never bypasses it silently either way (see verify.ts). */
  verifyDuplicateReceipt: boolean;
}

const SETTINGS_KEY = "receipt_verification";

// Conservative migration defaults: verification and auto-approval both
// start OFF, so nothing in the existing manual-Kaspi flow changes behavior
// until an admin deliberately opts in and fills in the required settings
// (extractor URL, allowed IINs).
export function defaultReceiptVerificationSettings(): ReceiptVerificationSettings {
  return {
    enabled: false,
    autoApproveVerifiedReceipts: false,
    extractorUrl: "",
    amountCheck: true,
    amountTolerance: 0,
    verifyPaymentMethod: true,
    expectedPaymentMethod: "Kaspi Gold",
    verifyIin: true,
    allowedIins: [],
    verifyReceiptAge: true,
    receiptMaxAgeHours: 24,
    verifyDuplicateReceipt: true,
  };
}

export async function getReceiptVerificationSettings(): Promise<ReceiptVerificationSettings> {
  const d = defaultReceiptVerificationSettings();
  try {
    const row = await db.siteSettings.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row) return d;
    const v = (row.value ?? {}) as Partial<ReceiptVerificationSettings>;
    return {
      ...d,
      ...v,
      allowedIins: Array.isArray(v.allowedIins) ? v.allowedIins.filter((x): x is string => typeof x === "string") : d.allowedIins,
    };
  } catch {
    return d;
  }
}

export async function updateReceiptVerificationSettings(
  patch: Partial<ReceiptVerificationSettings>
): Promise<ReceiptVerificationSettings> {
  const current = await getReceiptVerificationSettings();
  const merged: ReceiptVerificationSettings = { ...current, ...patch };
  const jsonValue = merged as unknown as Prisma.InputJsonValue;
  await db.siteSettings.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: jsonValue },
    create: { key: SETTINGS_KEY, value: jsonValue },
  });
  return merged;
}
