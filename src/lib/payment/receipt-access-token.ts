/**
 * Temporary, signed access for the EXTERNAL extractor service to fetch one
 * receipt PDF over HTTP(S).
 *
 * Why not a real S3/MinIO presigned URL (the more standard approach): this
 * app's S3_ENDPOINT is documented (src/lib/storage.ts) as an *internal*
 * address — e.g. Coolify's private MinIO service DNS — never reachable
 * from the public internet, so a presigned URL built against it would be
 * useless to a third-party extractor. This app's own domain IS publicly
 * reachable, so instead we mint a short-lived, single-purpose HMAC token
 * for one specific PaymentReceipt and serve it through
 * /api/payments/receipts/[id]/extractor-access — the "safest compatible
 * temporary access mechanism" given that constraint (task's own fallback
 * language). No session/cookie is involved (the extractor has none); the
 * token IS the credential, deliberately narrow (one receipt, ~10 minutes).
 */
import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 10 * 60 * 1000;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not configured");
  return s;
}

function sign(receiptId: string, expires: number): string {
  return createHmac("sha256", secret()).update(`${receiptId}.${expires}`).digest("hex");
}

export function generateReceiptAccessToken(receiptId: string): { token: string; expires: number } {
  const expires = Date.now() + TOKEN_TTL_MS;
  return { token: sign(receiptId, expires), expires };
}

export function verifyReceiptAccessToken(receiptId: string, expires: number, token: string): boolean {
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  if (!token) return false;
  const expected = sign(receiptId, expires);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
