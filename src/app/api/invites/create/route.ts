import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getProductSettings } from "@/lib/product";
import { generateInviteSlug } from "@/lib/slug";

const schema = z.object({
  eventType: z.enum([
    "WEDDING",
    "BIRTHDAY",
    "BABY_SHOWER",
    "ENGAGEMENT",
    "ANNIVERSARY",
    "CORPORATE",
  ]),
  theme: z.enum([
    "ROSE_GOLD",
    "MIDNIGHT",
    "EMERALD",
    "IVORY",
    "KAZAKH",
    "PINK_UZATU",
    "KIDS_BIRTHDAY",
  ]),
  blocks: z.array(z.string()).default([]),
  person1: z.string().min(1).max(50),
  person2: z.string().max(50).optional(),
  title: z.string().max(100).optional(),
  date: z.string().min(1),
  time: z.string().min(1),
  locationName: z.string().min(1).max(200),
  mapUrl: z.string().url().optional().or(z.literal("")),
  message: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Жүйеге кіруіңіз қажет" }, { status: 401 });
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
      { error: parsed.error.issues[0]?.message ?? "Деректер қате" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Verify user exists
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пайдаланушы табылмады" }, { status: 404 });
  }

  // Get product settings for expiry
  let activeDays = 30;
  try {
    const product = await getProductSettings();
    activeDays = product.activeDays;
  } catch {
    // fallback to 30 days
  }

  // Generate unique slug
  let slug = generateInviteSlug(data.person1, data.person2);
  for (let i = 0; i < 6; i++) {
    const hit = await db.invite.findUnique({ where: { slug } });
    if (!hit) break;
    if (i === 5) {
      return NextResponse.json(
        { error: "Бірегей сілтеме жасау мүмкін болмады" },
        { status: 500 }
      );
    }
    slug = generateInviteSlug(data.person1, data.person2);
  }

  const title =
    data.title?.trim() ||
    (data.person2?.trim()
      ? `${data.person1.trim()} & ${data.person2.trim()}`
      : data.person1.trim()) ||
    "Шақыру";

  const expiresAt = new Date(Date.now() + activeDays * 24 * 60 * 60 * 1000);

  try {
    const invite = await db.invite.create({
      data: {
        slug,
        title,
        status: "DRAFT",
        userId: session.userId,
        expiresAt,
        data: {
          eventType: data.eventType,
          theme: data.theme,
          blocks: data.blocks,
          person1: data.person1.trim(),
          person2: data.person2?.trim() || null,
          date: data.date,
          time: data.time,
          locationName: data.locationName.trim(),
          mapUrl: data.mapUrl?.trim() || null,
          message: data.message?.trim() || null,
        },
      },
      select: { id: true, slug: true, title: true },
    });

    return NextResponse.json(invite, { status: 201 });
  } catch (err) {
    console.error("CREATE_INVITE_ERROR", err);
    return NextResponse.json(
      { error: "Шақыру сақталмады. Қайталаңыз." },
      { status: 500 }
    );
  }
}
