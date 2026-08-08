import { headers } from "next/headers";

/**
 * Resolves the app's public origin for building absolute, shareable URLs
 * (e.g. the public invitation link shown in the dashboard, which gets
 * copy-pasted into WhatsApp — a relative path is meaningless there).
 *
 * Prefers NEXT_PUBLIC_APP_URL when set. Otherwise derives the origin from
 * the actual incoming request's Host header (correctly forwarded by
 * Coolify/Traefik), so a share link is never silently wrong just because
 * an env var was forgotten in a new environment. Only falls back to
 * localhost when neither is available (no env var AND no request context —
 * effectively local dev only), which is harmless there.
 *
 * Server Components / Route Handlers only (uses next/headers). Never
 * imported by src/worker.ts or src/lib/storage.ts — the worker has no
 * request context, so this must stay out of anything the worker's build
 * pulls in.
 */
export async function getAppOrigin(): Promise<string> {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? "https";
      return `${proto}://${host}`;
    }
  } catch {
    // headers() throws outside a request context — fall through.
  }

  return "http://localhost:3000";
}
