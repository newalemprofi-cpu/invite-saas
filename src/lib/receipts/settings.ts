/**
 * Admin-configurable receipt-verification rules. Stored in the existing
 * generic SiteSettings key/value table (same pattern as
 * src/lib/payment-providers.ts) — no new settings model needed.
 *
 * Deliberately NOT configurable here: the expected payment amount. That is
 * always read fresh from Payment.amount (the authoritative finalAmount —
 * see the comment on that field in schema.prisma) by the verification
 * rules engine. Admins only ever configure *tolerance* around it
 * (allowedAmountDifference), never the amount itself.
 */
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type MismatchAction = "REVIEW_REQUIRED" | "REJECTED";

export interface ReceiptVerificationSettings {
  enabled: boolean;
  autoApprove: boolean;
  amountCheck: boolean;
  allowedAmountDifference: number;
  recipientCheck: boolean;
  expectedRecipient: string;
  dateTimeCheck: boolean;
  allowedTimeWindowHours: number;
  receiptIdUniquenessCheck: boolean;
  minConfidence: number | null;
  mismatchAction: MismatchAction;
}

const SETTINGS_KEY = "receipt_verification";

// Conservative migration defaults (see task Part 27): verification starts
// OFF and auto-approval starts OFF, so nothing in the existing manual-Kaspi
// flow changes behavior until an admin deliberately opts in.
export function defaultReceiptVerificationSettings(): ReceiptVerificationSettings {
  return {
    enabled: false,
    autoApprove: false,
    amountCheck: true,
    allowedAmountDifference: 0,
    recipientCheck: false,
    expectedRecipient: "",
    dateTimeCheck: true,
    allowedTimeWindowHours: 24,
    receiptIdUniquenessCheck: true,
    minConfidence: null,
    mismatchAction: "REVIEW_REQUIRED",
  };
}

export async function getReceiptVerificationSettings(): Promise<ReceiptVerificationSettings> {
  const d = defaultReceiptVerificationSettings();
  try {
    const row = await db.siteSettings.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row) return d;
    const v = (row.value ?? {}) as Partial<ReceiptVerificationSettings>;
    return { ...d, ...v };
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
