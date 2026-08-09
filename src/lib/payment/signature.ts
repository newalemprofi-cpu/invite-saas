import { createHmac, timingSafeEqual } from "crypto";
import { getProviderEntry, type ProviderId } from "@/lib/payment-providers";
import type { ApiGatewayConfig } from "@/lib/payment-providers";

const PROVIDER_TO_ID: Record<string, ProviderId | undefined> = {
  APIPAY: "APIPAY",
  CLOUDPAYMENTS: "CLOUDPAYMENTS",
  FREEDOM_PAY: "FREEDOM_PAY",
  HALYK_EPAY: "HALYK_EPAY",
  WOOPPAY: "WOOPPAY",
};

// Legacy env-var fallback so an already-deployed instance keeps verifying
// webhooks unchanged until an admin opens /admin/payments/providers and
// saves a Webhook Secret there — after that, the DB value is authoritative.
const LEGACY_ENV_FALLBACK: Partial<Record<ProviderId, string | undefined>> = {
  APIPAY: process.env.WEBHOOK_SECRET_APIPAY,
  CLOUDPAYMENTS: process.env.WEBHOOK_SECRET_CLOUDPAYMENTS,
};

/**
 * Verify a provider webhook signature using HMAC-SHA256. Returns true for
 * MANUAL_KASPI (no webhook — admin approves manually) and for providers
 * whose signature matches their admin-configured (or legacy env var)
 * Webhook Secret. Returns false if no secret is available or the
 * signature doesn't match.
 */
export async function verifyWebhookSignature(
  provider: string,
  rawBody: string,
  signature: string
): Promise<boolean> {
  if (provider === "MANUAL_KASPI") return true;

  const providerId = PROVIDER_TO_ID[provider];
  if (!providerId) {
    console.warn(`[webhook] Unknown provider "${provider}" — rejecting`);
    return false;
  }

  const entry = await getProviderEntry(providerId);
  const config = entry.config as ApiGatewayConfig;
  const secret = config.webhookSecret || LEGACY_ENV_FALLBACK[providerId];
  if (!secret) {
    console.error(`[webhook] No webhook secret configured for ${provider}`);
    return false;
  }
  return hmacMatch(rawBody, signature, secret);
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
