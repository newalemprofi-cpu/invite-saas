import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyN8nSecret } from "@/lib/n8n-auth";
import { getSession } from "@/lib/auth";

/**
 * GET  /api/invites/[id]  — fetch invite (session or N8N_WEBHOOK_SECRET)
 * PATCH /api/invites/[id] — update invite data fields (session or N8N_WEBHOOK_SECRET)
 */

const patchSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  locationName: z.string().max(200).optional(),
  mapUrl: z.string().url().optional().or(z.literal("")),
  message: z.string().max(500).optional(),
  theme: z
    .enum([
      "ROSE_GOLD",
      "MIDNIGHT",
      "EMERALD",
      "IVORY",
      "KAZAKH",
      "PINK_UZATU",
      "KIDS_BIRTHDAY",
    ])
    .optional(),
});

interface Props {
  params: Promise<{ id: string }>;
}

async function resolveAuth(
  req: NextRequest,
  inviteUserId?: string
): Promise<{ ok: boolean; isAdmin: boolean }> {
  const isN8n = verifyN8nSecret(req.headers.get("authorization"));
  if (isN8n) return { ok: true, isAdmin: true };

  const session = await getSession();
  if (!session) return { ok: false, isAdmin: false };
  if (session.role === "ADMIN") return { ok: true, isAdmin: true };
  if (inviteUserId && session.userId === inviteUserId)
    return { ok: true, isAdmin: false };
  return { ok: false, isAdmin: false };
}

export async function GET(req: NextRequest, { params }: Props) {
  const { id } = await params;

  const invite = await db.invite.findUnique({
    where: { id },
    include: { _count: { select: { guests: true } } },
  });
  if (!invite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await resolveAuth(req, invite.userId);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(invite);
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params;

  const invite = await db.invite.findUnique({
    where: { id },
    select: { userId: true, data: true },
  });
  if (!invite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await resolveAuth(req, invite.userId);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 }
    );
  }

  const { title, theme, ...dataFields } = parsed.data;

  const updated = await db.invite.update({
    where: { id },
    data: {
      ...(title ? { title } : {}),
      data: {
        ...(invite.data as object),
        ...dataFields,
        ...(theme ? { theme } : {}),
      },
    },
    select: { id: true, slug: true, title: true, status: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}
