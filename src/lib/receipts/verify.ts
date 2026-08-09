/**
 * Pure, server-side receipt verification rules. Takes an already-extracted
 * NormalizedReceipt plus the authoritative Payment fields and admin
 * settings, and decides MATCH ("would auto-verify") vs what to do
 * otherwise. Never touches the database itself — the duplicate-receiptId
 * lookup is done by the caller (src/app/api/payments/receipts/upload/route.ts)
 * since that requires a DB round-trip; this module just consumes the
 * boolean result. Keeping this pure makes the decision logic easy to
 * reason about and test in isolation from extraction/storage.
 */
import type { NormalizedReceipt } from "./extractor";
import type { ReceiptVerificationSettings } from "./settings";

export type ReceiptCheckKey =
  | "AMOUNT"
  | "RECIPIENT"
  | "DATETIME"
  | "RECEIPT_ID_PRESENT"
  | "RECEIPT_ID_UNIQUE"
  | "CONFIDENCE";

export interface ReceiptCheck {
  key: ReceiptCheckKey;
  enabled: boolean;
  passed: boolean;
  expected?: string;
  found?: string;
}

export interface VerificationInput {
  receipt: NormalizedReceipt;
  payment: { amount: number; createdAt: Date };
  settings: ReceiptVerificationSettings;
  isDuplicateElsewhere: boolean;
}

export interface VerificationOutcome {
  checks: ReceiptCheck[];
  /** True only if every enabled check passed AND the receipt is not a duplicate. Caller still gates this on settings.enabled/autoApprove. */
  wouldAutoVerify: boolean;
}

// Bank receipts routinely mix Cyrillic and Latin script for the same word
// (a legal-entity prefix like "ТОО" scanned/typed as Cyrillic in one place
// and "TOO" as Latin elsewhere) — these are visually identical homoglyphs,
// not different text, so recipient matching normalizes them to the same
// Latin letter before comparing rather than treating them as a mismatch.
const CYRILLIC_LATIN_HOMOGLYPHS: Record<string, string> = {
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", У: "Y", Х: "X",
  а: "a", е: "e", о: "o", р: "p", с: "c", у: "y", х: "x",
};

function normalizeForCompare(s: string): string {
  const latinized = s.replace(/[А-Яа-я]/g, (ch) => CYRILLIC_LATIN_HOMOGLYPHS[ch] ?? ch);
  return latinized.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "");
}

function recipientMatches(found: string, expected: string): boolean {
  const a = normalizeForCompare(found);
  const b = normalizeForCompare(expected);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function evaluateReceipt(input: VerificationInput): VerificationOutcome {
  const { receipt, payment, settings } = input;
  const checks: ReceiptCheck[] = [];

  // AMOUNT — always read Payment.amount fresh; never a client-supplied or cached value.
  if (settings.amountCheck) {
    const found = receipt.amount;
    const passed = found != null && Math.abs(found - payment.amount) <= settings.allowedAmountDifference;
    checks.push({
      key: "AMOUNT",
      enabled: true,
      passed,
      expected: `${payment.amount} ± ${settings.allowedAmountDifference}`,
      found: found != null ? String(found) : undefined,
    });
  }

  // RECIPIENT
  if (settings.recipientCheck && settings.expectedRecipient.trim()) {
    const found = receipt.recipient;
    const passed = !!found && recipientMatches(found, settings.expectedRecipient);
    checks.push({
      key: "RECIPIENT",
      enabled: true,
      passed,
      expected: settings.expectedRecipient,
      found: found ?? undefined,
    });
  }

  // DATE/TIME — receipt's transaction time must be within N hours of when the Payment intent was created.
  if (settings.dateTimeCheck) {
    const found = receipt.paidAt;
    let passed = false;
    if (found) {
      const diffHours = Math.abs(found.getTime() - payment.createdAt.getTime()) / (60 * 60 * 1000);
      passed = diffHours <= settings.allowedTimeWindowHours;
    }
    checks.push({
      key: "DATETIME",
      enabled: true,
      passed,
      expected: `within ${settings.allowedTimeWindowHours}h of payment creation`,
      found: found ? found.toISOString() : undefined,
    });
  }

  // RECEIPT ID PRESENT — a missing id under this policy is never auto-approved (see fallback policy, task section 10).
  if (settings.receiptIdUniquenessCheck) {
    checks.push({
      key: "RECEIPT_ID_PRESENT",
      enabled: true,
      passed: !!receipt.receiptId,
      found: receipt.receiptId ?? undefined,
    });
  }

  // RECEIPT ID UNIQUE — NOT admin-toggleable, always enforced when a receiptId is present. A single
  // receipt must never activate two payments, regardless of any other setting.
  if (receipt.receiptId) {
    checks.push({
      key: "RECEIPT_ID_UNIQUE",
      enabled: true,
      passed: !input.isDuplicateElsewhere,
      found: receipt.receiptId,
    });
  }

  // CONFIDENCE
  if (settings.minConfidence != null) {
    const found = receipt.confidence;
    // No confidence figure at all is informational, not a hard fail — only enforce when the extractor actually reported one.
    const passed = found == null || found >= settings.minConfidence;
    checks.push({
      key: "CONFIDENCE",
      enabled: true,
      passed,
      expected: `>= ${settings.minConfidence}`,
      found: found != null ? String(found) : undefined,
    });
  }

  const wouldAutoVerify = checks.every((c) => c.passed);
  return { checks, wouldAutoVerify };
}
