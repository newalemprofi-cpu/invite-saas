import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isStorageConfigured, uploadFile } from "@/lib/storage";
import { validateUpload, type UploadKind } from "@/lib/media-validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const inviteId = form.get("inviteId");
  const kind = form.get("kind");
  const file = form.get("file");

  if (typeof inviteId !== "string" || !inviteId) {
    return NextResponse.json({ error: "MISSING_INVITE_ID" }, { status: 400 });
  }
  if (kind !== "image" && kind !== "audio") {
    return NextResponse.json({ error: "INVALID_KIND" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
  }

  const invite = await db.invite.findUnique({ where: { id: inviteId }, select: { userId: true } });
  if (!invite) return NextResponse.json({ error: "INVITE_NOT_FOUND" }, { status: 404 });
  if (invite.userId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "STORAGE_NOT_CONFIGURED" }, { status: 503 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validated = validateUpload(kind as UploadKind, file.type, buffer.byteLength, buffer);
  if (!validated) {
    return NextResponse.json({ error: "INVALID_FILE" }, { status: 422 });
  }

  const key = `invites/${inviteId}/${kind}/${randomUUID()}.${validated.ext}`;

  try {
    const url = await uploadFile({ key, contentType: validated.mime, body: buffer });
    const media = await db.media.create({
      data: {
        type: kind === "image" ? "IMAGE" : "AUDIO",
        url,
        key,
        mimeType: validated.mime,
        size: buffer.byteLength,
        inviteId,
      },
      select: { id: true, url: true },
    });
    return NextResponse.json(media, { status: 201 });
  } catch (err) {
    console.error("UPLOAD_ERROR", err);
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}
