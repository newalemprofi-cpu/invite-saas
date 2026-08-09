/**
 * Adapter for the REAL, already-deployed kitap-store receipt extractor.
 *
 * Confirmed live (not guessed) contract, by calling the actual endpoint:
 *   POST <url>
 *   Content-Type: application/json
 *   { "receipt_url": "<url the extractor can fetch>" }
 *
 *   Success: { success: true, bank, amount, datetime_of_receipt, receipt_id,
 *              iin, method_of_payment, raw_text }
 *   Failure: { success: false, error: string }
 *
 * IMPORTANT, discovered by live testing against the real endpoint: this
 * service only parses PDF — a real image URL (JPEG, correct content-type,
 * successfully downloaded) still comes back "Failed to parse PDF: Invalid
 * PDF structure". Since customers overwhelmingly upload phone-screenshot
 * JPG/PNG receipts, image uploads are wrapped into a minimal one-page PDF
 * before being sent here (see src/lib/payment/receipt-pdf.ts) — this
 * module itself only ever calls the extractor with a URL that already
 * points at a PDF.
 *
 * This module ONLY extracts fields. It never decides whether a receipt
 * matches a Payment — see src/lib/receipts/verify.ts for that.
 */
import { getReceiptVerificationSettings } from "@/lib/receipts/settings";

export interface NormalizedReceiptData {
  amount: number | null;
  receiptId: string | null;
  datetimeOfReceipt: string | null;
  methodOfPayment: string | null;
  iin: string | null;
  bank: string | null;
  raw: unknown;
}

export type ExtractorErrorCode =
  | "EXTRACTOR_URL_NOT_CONFIGURED"
  | "EXTRACTOR_UNREACHABLE"
  | "EXTRACTION_FAILED"
  | "INVALID_RESPONSE";

export type ExtractionResult =
  | { ok: true; data: NormalizedReceiptData }
  | { ok: false; error: ExtractorErrorCode; detail?: string };

const TIMEOUT_MS = 30_000;

interface RawExtractorResponse {
  success?: boolean;
  error?: string;
  bank?: unknown;
  amount?: unknown;
  datetime_of_receipt?: unknown;
  receipt_id?: unknown;
  iin?: unknown;
  method_of_payment?: unknown;
  raw_text?: unknown;
}

/** Admin-configured override (SiteSettings) takes precedence over the RECEIPT_EXTRACTOR_URL env var — never hardcoded. */
export async function getExtractorUrl(): Promise<string> {
  const settings = await getReceiptVerificationSettings();
  const override = settings.extractorUrl?.trim();
  if (override) return override;
  return process.env.RECEIPT_EXTRACTOR_URL?.trim() ?? "";
}

function normalizeAmount(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const cleaned = v.replace(/[\s,]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Calls the extractor with a URL it can fetch (the caller is responsible
 * for that URL actually being reachable and pointing at a PDF — see
 * src/app/api/payments/receipts/upload/route.ts for how the temporary
 * access URL and PDF conversion are wired together).
 */
export async function extractReceiptFromUrl(receiptUrl: string): Promise<ExtractionResult> {
  const url = await getExtractorUrl();
  if (!url) return { ok: false, error: "EXTRACTOR_URL_NOT_CONFIGURED" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt_url: receiptUrl }),
    });

    let body: RawExtractorResponse;
    try {
      body = (await resp.json()) as RawExtractorResponse;
    } catch {
      return { ok: false, error: "INVALID_RESPONSE", detail: `HTTP ${resp.status}, non-JSON body` };
    }

    if (typeof body.success !== "boolean") {
      return { ok: false, error: "INVALID_RESPONSE", detail: `unexpected shape: ${JSON.stringify(body).slice(0, 300)}` };
    }
    if (!body.success) {
      return { ok: false, error: "EXTRACTION_FAILED", detail: body.error ?? "unknown extractor error" };
    }

    const data: NormalizedReceiptData = {
      amount: normalizeAmount(body.amount),
      receiptId: normalizeString(body.receipt_id),
      datetimeOfReceipt: normalizeString(body.datetime_of_receipt),
      methodOfPayment: normalizeString(body.method_of_payment),
      iin: normalizeString(body.iin),
      bank: normalizeString(body.bank),
      raw: body,
    };
    return { ok: true, data };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "EXTRACTOR_UNREACHABLE", detail: "timeout" };
    }
    return { ok: false, error: "EXTRACTOR_UNREACHABLE", detail: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * "Баптауды тексеру" — a real connectivity/protocol check that does NOT
 * require an actual customer receipt: posts a deliberately-nonexistent URL
 * and checks that the extractor responds with its normal JSON error shape
 * (confirmed live: `{"success":false,"error":"Failed to download PDF..."}`)
 * rather than a network failure — proving the service is up and speaking
 * the expected protocol.
 */
export async function testExtractorConnection(): Promise<{ ok: boolean; message: string }> {
  const url = await getExtractorUrl();
  if (!url) return { ok: false, message: "EXTRACTOR_URL_NOT_CONFIGURED" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const resp = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt_url: "https://example.invalid/connectivity-check.pdf" }),
    });
    const body = await resp.json().catch(() => null) as RawExtractorResponse | null;
    if (body && typeof body.success === "boolean") {
      return { ok: true, message: `Экстрактор қолжетімді (HTTP ${resp.status})` };
    }
    return { ok: false, message: "EXTRACTOR_UNREACHABLE: жауап форматы күтілгендей емес" };
  } catch (err) {
    return { ok: false, message: `EXTRACTOR_UNREACHABLE: ${err instanceof Error ? err.message : String(err)}` };
  } finally {
    clearTimeout(timeout);
  }
}
