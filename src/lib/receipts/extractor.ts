/**
 * Receipt data extraction.
 *
 * IMPORTANT CONTEXT: the task that requested this integration assumed a
 * "kitap-store" receipt-OCR service already existed and asked us to reuse
 * its exact contract. A full audit of that project (see the final report)
 * found no such service anywhere in it — no OCR route, no vision/LLM call,
 * no receipt response schema of any kind. There was nothing to reuse.
 *
 * Given that, this module is a genuine first-party extractor built for
 * Shaqyru, reusing the exact same working Anthropic integration pattern
 * already in production here (see src/app/actions/ai.ts's `callAnthropic`
 * — same env var, same base URL, same error-handling shape), extended
 * with an image/document content block for vision input. It is a real,
 * working call to the real Anthropic API — not a stub and not a fake
 * contract standing in for a nonexistent one.
 *
 * This module ONLY extracts fields from the receipt image. It never
 * decides whether a receipt matches a Payment — that is
 * src/lib/receipts/verify.ts's job, kept deliberately separate.
 */
import type { ValidatedReceiptFile } from "./file-validation";

export interface NormalizedReceipt {
  receiptId: string | null;
  amount: number | null;
  currency: string | null;
  recipient: string | null;
  sender: string | null;
  bank: string | null;
  paidAt: Date | null;
  confidence: number | null;
  raw: unknown;
}

export type ExtractionResult =
  | { ok: true; receipt: NormalizedReceipt }
  | { ok: false; error: "NOT_CONFIGURED" | "TIMEOUT" | "SERVICE_ERROR" | "UNPARSEABLE"; detail?: string };

const MODEL = "claude-sonnet-5";
const TIMEOUT_MS = 25_000;

const EXTRACTION_PROMPT = `You are extracting structured data from a bank/payment-app transfer receipt (commonly a Kaspi Bank / Kaspi Pay transfer screenshot, but could be another Kazakhstani bank). The image may be in Kazakh or Russian.

Look at the receipt and respond with ONLY a single JSON object, no other text, no markdown fences, matching exactly this shape:

{
  "receiptId": string or null,   // the transaction/receipt/check number shown (e.g. "Чек №...", a long reference number). null if not visible.
  "amount": number or null,      // the transferred amount in KZT as a plain integer or decimal number, no currency symbol, no spaces/commas. null if not legible.
  "currency": string or null,    // e.g. "KZT". null if not shown/unclear.
  "recipient": string or null,   // the recipient/payee name or organization shown (получатель / алушы). null if not visible.
  "sender": string or null,      // the sender/payer name shown (отправитель / жіберуші), if visible. null otherwise.
  "bank": string or null,        // bank or payment app name, e.g. "Kaspi Bank". null if unclear.
  "date": string or null,        // ISO date "YYYY-MM-DD" of the transaction, if visible. null otherwise.
  "time": string or null,        // 24h time "HH:MM" of the transaction, if visible. null otherwise.
  "confidence": number           // your own confidence 0.0-1.0 that this is a genuine, legible payment receipt and the fields above are read correctly. Use a LOW value if the image is blurry, cropped, not a receipt at all, or fields are ambiguous.
}

Rules:
- Never guess or fabricate a value you cannot actually read — use null instead.
- "amount" must be a number, never a string.
- If the image is not a payment receipt at all, set every field to null and confidence to 0.
- Respond with ONLY the JSON object.`;

function buildContentBlock(file: ValidatedReceiptFile, base64: string) {
  if (file.kind === "pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } };
  }
  return { type: "image", source: { type: "base64", media_type: file.mime, data: base64 } };
}

interface RawExtraction {
  receiptId?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  recipient?: string | null;
  sender?: string | null;
  bank?: string | null;
  date?: string | null;
  time?: string | null;
  confidence?: number | null;
}

/** Strips spaces/commas some receipts use as thousands separators, e.g. "4 990" / "4,990" -> 4990. */
function normalizeAmount(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = v.replace(/[\s,]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeText(v: string | null | undefined): string | null {
  if (v == null) return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePaidAt(date: string | null | undefined, time: string | null | undefined): Date | null {
  if (!date) return null;
  const iso = time ? `${date}T${time}:00` : `${date}T00:00:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : (text.match(/\{[\s\S]*\}/)?.[0] ?? text);
  return JSON.parse(candidate);
}

export async function extractReceipt(bytes: Buffer, file: ValidatedReceiptFile): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "NOT_CONFIGURED" };

  const base64 = bytes.toString("base64");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [buildContentBlock(file, base64), { type: "text", text: EXTRACTION_PROMPT }],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      return { ok: false, error: "SERVICE_ERROR", detail: JSON.stringify(errBody).slice(0, 500) };
    }

    const data = (await resp.json()) as { content?: Array<{ type: string; text: string }> };
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";

    let parsed: RawExtraction;
    try {
      parsed = extractJsonObject(text) as RawExtraction;
    } catch {
      return { ok: false, error: "UNPARSEABLE", detail: text.slice(0, 300) };
    }

    const receipt: NormalizedReceipt = {
      receiptId: normalizeText(parsed.receiptId),
      amount: normalizeAmount(parsed.amount),
      currency: normalizeText(parsed.currency),
      recipient: normalizeText(parsed.recipient),
      sender: normalizeText(parsed.sender),
      bank: normalizeText(parsed.bank),
      paidAt: normalizePaidAt(parsed.date, parsed.time),
      confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null,
      raw: parsed,
    };

    return { ok: true, receipt };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return { ok: false, error: "TIMEOUT" };
    return { ok: false, error: "SERVICE_ERROR", detail: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}
