import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify a provider webhook signature using HMAC-SHA256.
 * Returns true for MANUAL_KASPI (no webhook) and for providers with valid signatures.
 * Returns false if the secret is missing or the signature does not match.
 *
 * Production: each provider has its own signing algorithm.
 * APIpay and CloudPayments both use HMAC-SHA256 over the raw body.
 */
export function verifyWebhookSignature(
  provider: string,
  rawBody: string,
  signature: string
): boolean {
  switch (provider) {
    case "MANUAL_KASPI":
      // Manual Kaspi uses no webhook — admin approves manually
      return true;

    case "APIPAY": {
      const secret = process.env.WEBHOOK_SECRET_APIPAY;
      if (!secret) {
        console.error("[webhook] WEBHOOK_SECRET_APIPAY not set");
        return false;
      }
      return hmacMatch(rawBody, signature, secret);
    }

    case "CLOUDPAYMENTS": {
      const secret = process.env.WEBHOOK_SECRET_CLOUDPAYMENTS;
      if (!secret) {
        console.error("[webhook] WEBHOOK_SECRET_CLOUDPAYMENTS not set");
        return false;
      }
      return hmacMatch(rawBody, signature, secret);
    }

    default:
      console.warn(`[webhook] Unknown provider "${provider}" — rejecting`);
      return false;
  }
}

function hmacMatch(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const sigBuf = Buffer.from(signature.toLowerCase().replace(/^sha256=/, ""), "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}
