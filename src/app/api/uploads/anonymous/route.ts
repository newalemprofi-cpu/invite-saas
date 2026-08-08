import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isStorageConfigured, uploadFile } from "@/lib/storage";
import { validateUpload, type UploadKind } from "@/lib/media-validation";
import { getClientIp } from "@/lib/get-client-ip";
import { checkAnonymousUploadRateLimit, RateLimitUnavailableError } from "@/lib/rate-limit";
import { isRedisConfigured } from "@/lib/redis";

export const runtime = "nodejs";

// Matches crypto.randomUUID() output from lib/anonymousDraft.ts.
const DRAFT_TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Upload endpoint for the pre-account constructor. No session is required —
 * files are stored under temp/<draftToken>/... rather than being attached to
 * an Invite (none exists yet). Only /api/invites/claim (which requires the
 * exact same random draftToken) can ever move these into a real invite.
 *
 * Being unauthenticated, this is the one upload path exposed to anonymous
 * abuse, so it's rate-limited per IP and per draftToken (see rate-limit.ts).
 * A Redis outage fails the request closed (503) rather than skipping the
 * check — an open-by-default limiter isn't a limiter.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const draftToken = form.get("draftToken");
  const kind = form.get("kind");
  const file = form.get("file");

  if (typeof draftToken !== "string" || !DRAFT_TOKEN_RE.test(draftToken)) {
    return NextResponse.json({ error: "INVALID_DRAFT_TOKEN" }, { status: 400 });
  }
  if (kind !== "image" && kind !== "audio") {
    return NextResponse.json({ error: "INVALID_KIND" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
  }

  if (!isRedisConfigured()) {
    console.error("[uploads/anonymous] REDIS_URL is not configured — refusing to bypass rate limiting");
    return NextResponse.json({ error: "RATE_LIMITER_UNAVAILABLE" }, { status: 503 });
  }

  const ip = getClientIp(req);
  try {
    const rate = await checkAnonymousUploadRateLimit({ ip, draftToken });
    if (!rate.ok) {
      return NextResponse.json(
        { error: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }
  } catch (err) {
    if (err instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "RATE_LIMITER_UNAVAILABLE" }, { status: 503 });
    }
    throw err;
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "STORAGE_NOT_CONFIGURED" }, { status: 503 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validated = validateUpload(kind as UploadKind, file.type, buffer.byteLength, buffer);
  if (!validated) {
    return NextResponse.json({ error: "INVALID_FILE" }, { status: 422 });
  }

  const key = `temp/${draftToken}/${kind}/${randomUUID()}.${validated.ext}`;

  try {
    const url = await uploadFile({ key, contentType: validated.mime, body: buffer });
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    console.error("ANON_UPLOAD_ERROR", err);
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}
