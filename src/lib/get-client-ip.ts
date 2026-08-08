import type { NextRequest } from "next/server";

/**
 * Extracts the real client IP behind Coolify's default reverse proxy
 * (Traefik). Next.js `standalone` output has no raw socket access, so we
 * rely entirely on proxy-set headers — which is only safe because Traefik
 * (correctly configured, as Coolify sets it up) overwrites/strips any
 * `X-Forwarded-For` / `X-Real-Ip` sent by the actual internet client before
 * forwarding to the app. We do NOT walk an arbitrary-length XFF chain or
 * trust a client-supplied value directly.
 *
 * Precedence:
 *   1. `x-real-ip`       — Traefik sets this to exactly one address.
 *   2. `x-forwarded-for` — take the first (leftmost/original-client) entry,
 *                          since Traefik is the sole hop appending to it here.
 *   3. "unknown"         — never throw; callers use this as a rate-limit
 *                          bucket key, and "unknown" just means all such
 *                          requests share one (still-enforced) bucket.
 */
export function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp && isPlausibleIp(realIp.trim())) return realIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first && isPlausibleIp(first)) return first;
  }

  return "unknown";
}

function isPlausibleIp(value: string): boolean {
  if (value.length === 0 || value.length > 45) return false;
  // Loose IPv4/IPv6 shape check — good enough to reject obvious garbage
  // without pulling in a full IP-parsing dependency for a rate-limit key.
  return /^[0-9a-fA-F:.]+$/.test(value);
}
