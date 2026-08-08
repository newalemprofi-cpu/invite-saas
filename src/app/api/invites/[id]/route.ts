import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyN8nSecret } from "@/lib/n8n-auth";
import { getSession } from "@/lib/auth";
import { deleteFile } from "@/lib/storage";

const patchSchema = z.object({
  // Basic fields
  title: z.string().min(1).max(100).optional(),
  groomName: z.string().min(1).max(50).optional(),
  brideName: z.string().max(50).optional().or(z.literal("")),
  date: z.string().optional(),
  time: z.string().optional(),
  location: z.string().max(200).optional(),
  mapLink: z.string().url().optional().or(z.literal("")),
  whatsapp: z.string().max(20).optional(),
  organizerPhone: z.string().max(20).optional(),
  invitationText: z.string().max(2000).optional(),
  // Blocks (legacy)
  enabledBlocks: z.array(z.string()).optional(),
  // Sections (ordered, new)
  sections: z.array(z.object({ id: z.string(), enabled: z.boolean() })).optional(),
  // Design
  bgColor: z.string().max(30).optional(),
  accentColor: z.string().max(30).optional(),
  fontFamily: z.string().max(30).optional(),
  animationStyle: z.string().max(30).optional(),
  templateSlug: z.string().max(60).optional(),
  // Background
  bgType: z.enum(["color", "gradient", "image", "video"]).optional(),
  bgImageUrl: z.string().max(500).optional().or(z.literal("")),
  bgVideoUrl: z.string().max(500).optional().or(z.literal("")),
  bgGradient: z.string().max(200).optional(),
  bgBlur: z.number().min(0).max(20).optional(),
  bgOpacity: z.number().min(0).max(1).optional(),
  bgOverlay: z.string().max(30).optional(),
  // Media
  galleryUrls: z.array(z.string()).optional(),
  musicUrl: z.string().max(500).optional().or(z.literal("")),
  musicTitle: z.string().max(100).optional(),
  musicEnabled: z.boolean().optional(),
  musicLoop: z.boolean().optional(),
  musicAutoplay: z.boolean().optional(),
  // Block-specific content
  loveStory: z.string().max(2000).optional(),
  dressCode: z.string().max(500).optional(),
  wishesText: z.string().max(1000).optional(),
  contactsText: z.string().max(500).optional(),
  giftInfo: z.string().max(500).optional(),
  videoUrl: z.string().max(500).optional().or(z.literal("")),
  programItems: z.array(z.object({ time: z.string(), label: z.string() })).optional(),
  rsvpText: z.string().max(500).optional(),
  programText: z.string().max(1000).optional(),
  // Legacy (N8N webhook compat)
  locationName: z.string().max(200).optional(),
  mapUrl: z.string().url().optional().or(z.literal("")),
  message: z.string().max(500).optional(),
  theme: z.string().optional(),
});

interface Props {
  params: Promise<{ id: string }>;
}

async function resolveAuth(req: NextRequest, inviteUserId?: string): Promise<{ ok: boolean; isAdmin: boolean }> {
  const isN8n = verifyN8nSecret(req.headers.get("authorization"));
  if (isN8n) return { ok: true, isAdmin: true };
  const session = await getSession();
  if (!session) return { ok: false, isAdmin: false };
  if (session.role === "ADMIN") return { ok: true, isAdmin: true };
  if (inviteUserId && session.userId === inviteUserId) return { ok: true, isAdmin: false };
  return { ok: false, isAdmin: false };
}

export async function GET(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const invite = await db.invite.findUnique({
    where: { id },
    include: { _count: { select: { guests: true } } },
  });
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await resolveAuth(req, invite.userId);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(invite);
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const invite = await db.invite.findUnique({ where: { id }, select: { userId: true, data: true } });
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await resolveAuth(req, invite.userId);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation error" }, { status: 400 });

  const { title, groomName, brideName, ...dataFields } = parsed.data;
  const existing = (invite.data as Record<string, unknown>) ?? {};

  let newTitle: string | undefined;
  if (title) {
    newTitle = title;
  } else if (groomName) {
    const bName = brideName !== undefined ? brideName : (existing.brideName as string | undefined);
    newTitle = bName ? `${groomName} & ${bName}` : groomName;
  }

  const updated = await db.invite.update({
    where: { id },
    data: {
      ...(newTitle ? { title: newTitle } : {}),
      data: {
        ...existing,
        ...dataFields,
        ...(groomName !== undefined ? { groomName } : {}),
        ...(brideName !== undefined ? { brideName: brideName || null } : {}),
      },
    },
    select: { id: true, slug: true, title: true, status: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/invites/[id] — owner (or admin) only. Not exposed to the n8n
 * webhook integration: nothing currently needs automation access to a
 * destructive action, so it isn't given any (smallest safe surface).
 */
export async function DELETE(req: NextRequest, { params }: Props) {
  const { id } = await params;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const invite = await db.invite.findUnique({
    where: { id },
    select: { userId: true, media: { select: { key: true } } },
  });
  if (!invite) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (invite.userId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    await db.invite.delete({ where: { id } });
  } catch (err) {
    // Payment.invite is `onDelete: Restrict` (financial records are never
    // cascade-deleted) — an invite that ever reached checkout can't be
    // hard-deleted. Surface that clearly instead of a raw 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2003" || err.code === "P2014")) {
      return NextResponse.json({ error: "HAS_PAYMENTS" }, { status: 409 });
    }
    console.error("[invite-delete] failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  }

  // Guest/Media/AiConversation rows cascade-delete with the Invite in
  // Postgres, but the underlying S3/MinIO objects don't — clean those up
  // now that the DB delete succeeded. Best-effort: a stray orphaned object
  // is a minor storage cost, not a correctness issue worth failing the
  // request over (the invite is already gone).
  await Promise.all(
    invite.media.map((m) =>
      deleteFile(m.key).catch((err) => {
        console.error("[invite-delete] failed to delete media object", {
          error: err instanceof Error ? err.message : String(err),
        });
      })
    )
  );

  return NextResponse.json({ ok: true });
}
