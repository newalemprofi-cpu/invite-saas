import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";

function secretKey() {
  const s = process.env.AUTH_SECRET;
  return s ? new TextEncoder().encode(s) : null;
}

function toLogin(req: NextRequest, from: string) {
  const url = new URL("/auth/login", req.url);
  url.searchParams.set("from", from);
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const key = secretKey();

  if (!token || !key) return toLogin(req, pathname);

  try {
    const { payload } = await jwtVerify(token, key);

    // Admin-only guard
    if (pathname.startsWith("/admin") && payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  } catch {
    return toLogin(req, pathname);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/create"],
};
