import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyN8nSecret } from "@/lib/n8n-auth";

/**
 * POST /api/guests/rsvp
 *
 * REST RSVP endpoint for n8n workflows (e.g. chatbot-driven RSVPs).
 * Auth: Authorization: Bearer <N8N_WEBHOOK_SECRET>
 */

const schema = z.object({
  inviteId: z.string().uuid(),
  name: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  status: z.enum(["COMING", "NOT_COMING", "MAYBE"]).default("COMING"),
  peopleCount: z.coerce.number().int().min(1).max(20).default(1),
  comment: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  if (!verifyN8nSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const invite = await db.invite.findUnique({
    where: { id: data.inviteId },
    select: { status: true, expiresAt: true },
  });

  if (!invite || invite.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Invite not found or not published" },
      { status: 404 }
    );
  }

  // Runtime expiry check
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  // Duplicate prevention
  if (data.phone) {
    const existing = await db.guest.findFirst({
      where: { inviteId: data.inviteId, phone: data.phone },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Duplicate RSVP for this phone number", duplicate: true },
        { status: 409 }
      );
    }
  }

  const guest = await db.guest.create({
    data: {
      inviteId: data.inviteId,
      name: data.name,
      phone: data.phone ?? null,
      status: data.status,
      peopleCount: data.peopleCount,
      note: data.comment ?? null,
    },
    select: {
      id: true,
      name: true,
      status: true,
      peopleCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json(guest, { status: 201 });
}
