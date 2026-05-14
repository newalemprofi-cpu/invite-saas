/**
 * Verify that a request comes from a trusted n8n workflow.
 * Pass the Authorization header value directly.
 * Returns false if N8N_WEBHOOK_SECRET is not configured — fail closed.
 */
export function verifyN8nSecret(authHeader: string | null): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[n8n-auth] N8N_WEBHOOK_SECRET is not configured");
    return false;
  }
  return authHeader === `Bearer ${secret}`;
}
