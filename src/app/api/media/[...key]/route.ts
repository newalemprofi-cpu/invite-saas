import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getObjectStream, statFile, isStorageConfigured } from "@/lib/storage";

export const runtime = "nodejs";

// Only these top-level prefixes are ever created by this app (see
// /api/uploads, /api/uploads/anonymous, lib/data/invites.ts). Restricting
// the proxy to them means it can never be used to fetch some unrelated
// object that happens to also live in the bucket.
const ALLOWED_PREFIXES = ["temp/", "invites/"];

/**
 * Reconstructs and validates the object key from a catch-all route's path
 * segments. Next.js already URL-decodes each segment before it reaches us,
 * so an encoded traversal attempt (e.g. "%2e%2e") arrives as a literal
 * ".." segment here — checked for directly, no separate decoding step
 * needed. Returns null for anything not exactly a clean, normalized,
 * allowlisted-prefix path.
 */
function resolveObjectKey(segments: string[]): string | null {
  if (!segments || segments.length === 0) return null;

  for (const segment of segments) {
    if (!segment) return null; // empty segment => "//" in the URL
    if (segment === "." || segment === "..") return null;
    if (segment.includes("\\") || segment.includes("\0")) return null;
  }

  const key = segments.join("/");
  const normalized = path.posix.normalize(key);
  if (normalized !== key || normalized.startsWith("..") || normalized.startsWith("/")) {
    return null;
  }
  if (!ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    return null;
  }
  return key;
}

function cacheControlFor(key: string): string {
  if (key.startsWith("invites/")) {
    // Filenames are random (uuid-based) and never overwritten in place —
    // safe to cache forever once fetched.
    return "public, max-age=31536000, immutable";
  }
  // temp/* is a pre-account draft's own upload: not meant to be cached by
  // shared caches, and short-lived (see the cleanup worker's TTL).
  return "private, no-store";
}

interface Params {
  params: Promise<{ key: string[] }>;
}

async function resolveKeyOrError(params: Params["params"]): Promise<{ key: string } | { error: NextResponse }> {
  const { key: segments } = await params;
  const key = resolveObjectKey(segments);
  if (!key) {
    return { error: NextResponse.json({ error: "INVALID_KEY" }, { status: 400 }) };
  }
  if (!isStorageConfigured()) {
    return { error: NextResponse.json({ error: "STORAGE_NOT_CONFIGURED" }, { status: 503 }) };
  }
  return { key };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const resolved = await resolveKeyOrError(params);
  if ("error" in resolved) return resolved.error;

  try {
    const object = await getObjectStream(resolved.key);
    if (!object) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", object.contentType || "application/octet-stream");
    headers.set("Cache-Control", cacheControlFor(resolved.key));
    if (object.size > 0) headers.set("Content-Length", String(object.size));
    if (object.etag) headers.set("ETag", object.etag);
    if (object.lastModified) headers.set("Last-Modified", object.lastModified.toUTCString());

    return new NextResponse(object.stream, { status: 200, headers });
  } catch (err) {
    // Never forward the underlying error (could reference the internal
    // S3_ENDPOINT) to the client.
    console.error("[media-proxy] failed to read object", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "MEDIA_FETCH_FAILED" }, { status: 502 });
  }
}

export async function HEAD(_req: NextRequest, { params }: Params) {
  const resolved = await resolveKeyOrError(params);
  if ("error" in resolved) return new NextResponse(null, { status: resolved.error.status });

  try {
    const meta = await statFile(resolved.key);
    if (!meta) {
      return new NextResponse(null, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", meta.contentType || "application/octet-stream");
    headers.set("Cache-Control", cacheControlFor(resolved.key));
    if (meta.size > 0) headers.set("Content-Length", String(meta.size));
    if (meta.etag) headers.set("ETag", meta.etag);
    if (meta.lastModified) headers.set("Last-Modified", meta.lastModified.toUTCString());

    return new NextResponse(null, { status: 200, headers });
  } catch (err) {
    console.error("[media-proxy] HEAD failed", { error: err instanceof Error ? err.message : String(err) });
    return new NextResponse(null, { status: 502 });
  }
}
