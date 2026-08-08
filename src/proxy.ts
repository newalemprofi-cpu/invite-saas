/**
 * ─────────────────────────────────────────────────────────────────────────
 * ROUTE ACCESS MATRIX (canonical — keep this in sync with `matcher` below
 * AND with the page/API-level checks that provide defense-in-depth):
 *
 *   PUBLIC (no session required, ever):
 *     /                             landing
 *     /templates, /templates/:slug  browse
 *     /i/:slug                      public invitation (its own PUBLISHED
 *                                   gate lives in the page, not here)
 *     /invitations/new              anonymous constructor entry
 *     /api/media/:key*              same-origin media proxy
 *     /auth/login, /auth/register   BUT: redirect away if already
 *                                   authenticated (see those pages)
 *
 *   AUTH-CONDITIONAL (behavior branches on session, both branches valid):
 *     /invitations/publish          anonymous -> bounced to auth (from=
 *                                   this URL); authenticated -> claim
 *                                   directly. Handled in the page itself,
 *                                   NOT in this matcher, because the
 *                                   anonymous branch must render 200 (it
 *                                   issues its own redirect to /auth/*),
 *                                   not get intercepted here.
 *
 *   AUTH REQUIRED (this middleware enforces; page/API adds ownership
 *   checks on top — see each route for its own defense-in-depth):
 *     /dashboard/:path*             includes /dashboard/invites/:id
 *     /edit/:path*                  ownership enforced in the page via
 *                                   getInvite() -> 404 for non-owners
 *     /create                       legacy, unreachable from the UI
 *
 *   ADMIN (session + role check):
 *     /admin/:path*
 *
 *   API ROUTES are intentionally NOT in `matcher` below — a redirect-to-
 *   login response makes no sense for a fetch() caller expecting JSON, so
 *   every authenticated API route (/api/invites/[id], /api/invites/claim,
 *   /api/uploads, /api/admin/*) performs its own getSession() check and
 *   returns 401/403 JSON directly. /api/uploads/anonymous and
 *   /api/media/* are intentionally public (see their own files).
 * ─────────────────────────────────────────────────────────────────────────
 */
import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";
import { isSafeRedirectPath } from "@/lib/auth-redirect";

function secretKey() {
  const s = process.env.AUTH_SECRET;
  return s ? new TextEncoder().encode(s) : null;
}

function toLogin(req: NextRequest, from: string) {
  const url = new URL("/auth/login", req.url);
  // `from` is always this same request's own path+search, so it's already
  // same-origin by construction — routed through the canonical validator
  // anyway so this stays in lockstep with every other place that builds a
  // login URL, rather than trusting that invariant silently.
  if (isSafeRedirectPath(from)) url.searchParams.set("from", from);
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const from = pathname + search;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const key = secretKey();

  if (!token || !key) return toLogin(req, from);

  try {
    const { payload } = await jwtVerify(token, key);

    // Admin-only guard
    if (pathname.startsWith("/admin") && payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  } catch {
    return toLogin(req, from);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/create", "/edit/:path*"],
};
