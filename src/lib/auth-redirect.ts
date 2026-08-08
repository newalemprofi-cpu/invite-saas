/**
 * The ONE canonical auth-redirect algorithm for the whole app. Every place
 * that needs a post-auth destination or builds a link to /auth/login or
 * /auth/register goes through here — src/proxy.ts (middleware), the login/
 * register server actions, the auth pages themselves, and the anonymous
 * publish/claim flow. Isomorphic on purpose (no server-only imports): it's
 * used from both Server Components/actions and "use client" components
 * (e.g. ClaimDraftClient redirecting to login on a 401).
 *
 * Canonical algorithm (see AGENTS.md / audit report for the full writeup):
 *   1. Validate `from` as a SAFE same-origin relative path.
 *   2. If valid -> that's the redirect target.
 *   3. Otherwise -> DEFAULT_REDIRECT_TARGET ("/dashboard").
 * Login and Register share this — neither ever accepts an external URL.
 */
import type { Lang } from "@/lib/i18n";

export const DEFAULT_REDIRECT_TARGET = "/dashboard";

/**
 * True only for a same-origin relative path: starts with exactly one "/",
 * never "//..." (protocol-relative), never "/\..." (a backslash trick some
 * browsers still normalize to protocol-relative), and never contains
 * "://" anywhere (defense-in-depth against smuggled absolute URLs).
 */
export function isSafeRedirectPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.startsWith("/\\")) return false;
  if (value.includes("://")) return false;
  return true;
}

/** Validates `from`, falling back to `fallback` (default "/dashboard") if unsafe/absent. */
export function safeRedirectTarget(from: unknown, fallback: string = DEFAULT_REDIRECT_TARGET): string {
  return isSafeRedirectPath(from) ? from : fallback;
}

interface AuthUrlParams {
  from?: string | null;
  lang: Lang;
}

function buildAuthUrl(path: "/auth/login" | "/auth/register", { from, lang }: AuthUrlParams): string {
  const params = new URLSearchParams({ lang });
  if (isSafeRedirectPath(from)) params.set("from", from);
  return `${path}?${params.toString()}`;
}

export function buildLoginUrl(params: AuthUrlParams): string {
  return buildAuthUrl("/auth/login", params);
}

export function buildRegisterUrl(params: AuthUrlParams): string {
  return buildAuthUrl("/auth/register", params);
}
