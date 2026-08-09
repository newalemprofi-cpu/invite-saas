/**
 * Pure, server-side receipt verification rules. Takes an already-extracted
 * NormalizedReceiptData plus the authoritative Payment fields and admin
 * settings, and decides the verification result. Never touches the
 * database itself — the duplicate-receiptId lookup is done by the caller
 * (upload/route.ts) since that requires a DB round-trip; this module just
 * consumes the boolean result. Keeping this pure makes the decision logic
 * easy to reason about and unit-test in isolation from extraction/storage.
 *
 * This module only ever returns the "clean" verification outcomes
 * (VERIFIED or a specific *_MISMATCH/DUPLICATE_RECEIPT/INVALID_RECEIPT). It
 * has no opinion on EXTRACTION_FAILED/NOT_CONFIGURED (those only make
 * sense before extraction even produces data — the route sets them
 * directly) or MANUAL_REVIEW_REQUIRED (that's "VERIFIED but auto-approve
 * is off", an approval-gating decision the route makes, not a rule).
 */
import type { ReceiptVerificationResult } from "@prisma/client";
import type { NormalizedReceiptData } from "@/lib/payment/receipt-extractor";
import type { ReceiptVerificationSettings } from "./settings";

export type ReceiptCheckKey = "AMOUNT" | "PAYMENT_METHOD" | "IIN" | "RECEIPT_AGE" | "DUPLICATE";

export interface ReceiptCheck {
  key: ReceiptCheckKey;
  enabled: boolean;
  passed: boolean;
  expected?: string;
  found?: string;
}

export interface VerificationInput {
  data: NormalizedReceiptData;
  payment: { amount: number; createdAt: Date };
  settings: ReceiptVerificationSettings;
  isDuplicateElsewhere: boolean;
}

export interface VerificationOutcome {
  checks: ReceiptCheck[];
  /** VERIFIED only if every enabled check passed. Whether that actually auto-approves is a separate, route-level decision (depends on autoApproveVerifiedReceipts). */
  result: ReceiptVerificationResult;
}

function normalizeMethod(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function normalizeIin(s: string): string {
  return s.replace(/\D/g, "");
}

// Kazakhstan ("Дата и время по Астане" on the receipt) is a fixed UTC+5
// offset with no daylight-saving transitions — unlike almost everywhere
// else, this never changes across the year, so it's safe to hardcode
// rather than needing a timezone database.
const ASTANA_UTC_OFFSET_HOURS = 5;

/**
 * Safely parses the extractor's raw datetime string. Never throws, and
 * deliberately never falls back to bare `new Date(str)` for Kaspi's own
 * "DD.MM.YYYY HH:mm" format — V8's ambiguous parser silently reads that as
 * MM.DD.YYYY (e.g. "09.08.2026" becomes September 8th, not August 9th) and
 * additionally treats the time as being in the *server process's* local
 * timezone rather than the receipt's stated Astana time, so the same input
 * parses differently depending on the container's TZ setting. Both bugs
 * were reproduced and confirmed against this exact code path — see the
 * task's final report. Every component below is parsed as plain digits and
 * combined with the fixed +05:00 offset explicitly, so the result is
 * identical no matter what timezone this process happens to run in.
 *
 * The receipt's stated time is ALREADY Astana-local — it must not receive
 * a second timezone conversion on top of that.
 */
export function parseReceiptDatetime(raw: string | null): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Kaspi's own format: DD.MM.YYYY HH:mm[:ss] — always day-first. Never
  // interpret this as MM.DD.YYYY.
  const kaspiMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (kaspiMatch) {
    const [, d, mo, y, h, mi, s] = kaspiMatch;
    return fromAstanaLocal(Number(y), Number(mo), Number(d), Number(h), Number(mi), s ? Number(s) : 0);
  }

  // Already-ISO 8601 input (e.g. a future extractor version returning
  // "2026-08-09T22:30:00+05:00") carries its own explicit offset, so this
  // shape alone is unambiguous and safe to hand to the native parser.
  if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(trimmed)) {
    const iso = new Date(trimmed);
    if (!isNaN(iso.getTime())) return iso;
  }

  return null;
}

/**
 * Builds the correct UTC instant from date/time components that are
 * already Astana (UTC+5) local time — via Date.UTC, so the result never
 * depends on the running process's own timezone. Returns null for
 * out-of-range components instead of letting Date.UTC silently roll them
 * over into a different, wrong date.
 */
function fromAstanaLocal(year: number, month: number, day: number, hour: number, minute: number, second: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
  const utcMs = Date.UTC(year, month - 1, day, hour - ASTANA_UTC_OFFSET_HOURS, minute, second);
  const date = new Date(utcMs);
  return isNaN(date.getTime()) ? null : date;
}

const FUTURE_TOLERANCE_HOURS = 1;

export function evaluateReceipt(input: VerificationInput): VerificationOutcome {
  const { data, payment, settings } = input;
  const checks: ReceiptCheck[] = [];

  // AMOUNT — always compares against Payment.amount fresh from the DB (see caller), never a client-supplied or cached value.
  if (settings.amountCheck) {
    const found = data.amount;
    const passed = found != null && Math.abs(found - payment.amount) <= settings.amountTolerance;
    checks.push({
      key: "AMOUNT",
      enabled: true,
      passed,
      expected: `${payment.amount} ± ${settings.amountTolerance}`,
      found: found != null ? String(found) : undefined,
    });
  }

  // PAYMENT METHOD
  if (settings.verifyPaymentMethod && settings.expectedPaymentMethod.trim()) {
    const found = data.methodOfPayment;
    const passed = !!found && normalizeMethod(found) === normalizeMethod(settings.expectedPaymentMethod);
    checks.push({
      key: "PAYMENT_METHOD",
      enabled: true,
      passed,
      expected: settings.expectedPaymentMethod,
      found: found ?? undefined,
    });
  }

  // IIN — must appear in the admin-configured allow-list.
  if (settings.verifyIin) {
    const found = data.iin;
    const allowed = settings.allowedIins.map(normalizeIin).filter(Boolean);
    const passed = !!found && allowed.includes(normalizeIin(found));
    checks.push({
      key: "IIN",
      enabled: true,
      passed,
      expected: allowed.length > 0 ? allowed.join(", ") : "(none configured)",
      found: found ?? undefined,
    });
  }

  // RECEIPT AGE — missing/malformed/too-old/unreasonably-future datetime all fail closed, never pass silently.
  if (settings.verifyReceiptAge) {
    const parsed = parseReceiptDatetime(data.datetimeOfReceipt);
    let passed = false;
    if (parsed) {
      const ageHours = (Date.now() - parsed.getTime()) / (60 * 60 * 1000);
      passed = ageHours >= -FUTURE_TOLERANCE_HOURS && ageHours <= settings.receiptMaxAgeHours;
    }
    checks.push({
      key: "RECEIPT_AGE",
      enabled: true,
      passed,
      expected: `<= ${settings.receiptMaxAgeHours}h old, not in the future`,
      found: parsed ? parsed.toISOString() : (data.datetimeOfReceipt ?? undefined),
    });
  }

  // DUPLICATE — a receiptId already claimed by a DIFFERENT payment always fails, regardless of every other check.
  // A missing receiptId does not fail this check (nothing to compare) — see verify.ts's module doc for why.
  if (settings.verifyDuplicateReceipt && data.receiptId) {
    checks.push({
      key: "DUPLICATE",
      enabled: true,
      passed: !input.isDuplicateElsewhere,
      found: data.receiptId,
    });
  }

  const allPassed = checks.every((c) => c.passed);
  if (allPassed) return { checks, result: "VERIFIED" };

  // Priority order when multiple checks fail — duplicate (fraud signal) always wins,
  // then the order the spec itself lists the other mismatch reasons in.
  const failed = new Set(checks.filter((c) => !c.passed).map((c) => c.key));
  let result: ReceiptVerificationResult;
  if (failed.has("DUPLICATE")) result = "DUPLICATE_RECEIPT";
  else if (failed.has("AMOUNT")) result = "AMOUNT_MISMATCH";
  else if (failed.has("PAYMENT_METHOD")) result = "PAYMENT_METHOD_MISMATCH";
  else if (failed.has("IIN")) result = "IIN_MISMATCH";
  else if (failed.has("RECEIPT_AGE")) result = "RECEIPT_TOO_OLD";
  else result = "INVALID_RECEIPT";

  return { checks, result };
}
