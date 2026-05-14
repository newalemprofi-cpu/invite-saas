import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyN8nSecret } from "@/lib/n8n-auth";
import { getSession } from "@/lib/auth";
import { generateInviteSlug } from "@/lib/slug";

/**
 * POST /api/invites/create
 *
 * REST endpoint for n8n workflows or admin scripts.
 * Auth: Authorization: Bearer <N8N_WEBHOOK_SECRET>  OR  admin session.
 */

const schema = z.object({
  userId: z.string().uuid(),
  eventType: z.enum([
    "WEDDING",
    "BIRTHDAY",
    "BABY_SHOWER",
    "ENGAGEMENT",
    "ANNIVERSARY",
    "CORPORATE",
  ]),
  title: z.string().min(2).max(100),
  person1: z.string().min(1).max(50),
  person2: z.string().max(50).optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  locationName: z.string().max(200).optional(),
  mapUrl: z.string().url().optional().or(z.literal("")),
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
    .default("ROSE_GOLD"),
  message: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const isN8n = verifyN8nSecret(authHeader);

  if (!isN8n) {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

  // Verify target user exists
  const userExists = await db.user.findUnique({
    where: { id: data.userId },
    select: { id: true },
  });
  if (!userExists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let slug = generateInviteSlug(data.person1, data.person2);
  let attempts = 0;
  while (await db.invite.findUnique({ where: { slug } })) {
    slug = generateInviteSlug(data.person1, data.person2);
    if (++attempts > 10) {
      return NextResponse.json(
        { error: "Could not generate unique slug" },
        { status: 500 }
      );
    }
  }

  const invite = await db.invite.create({
    data: {
      slug,
      title: data.title,
      status: "DRAFT",
      userId: data.userId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      data: {
        eventType: data.eventType,
        person1: data.person1,
        person2: data.person2 ?? null,
        date: data.date ?? null,
        time: data.time ?? null,
        locationName: data.locationName ?? null,
        mapUrl: data.mapUrl ?? null,
        theme: data.theme,
        message: data.message ?? null,
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json(invite, { status: 201 });
}
