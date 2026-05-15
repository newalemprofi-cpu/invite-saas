import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getProductSettings } from "@/lib/product";
import { generateInviteSlug } from "@/lib/slug";

const schema = z.object({
  template: z.string().min(1),
  eventType: z.enum([
    "WEDDING",
    "BIRTHDAY",
    "BABY_SHOWER",
    "ENGAGEMENT",
    "ANNIVERSARY",
    "CORPORATE",
  ]),
  title: z.string().max(100).optional(),
  groomName: z.string().min(1).max(50),
  brideName: z.string().max(50).optional(),
  date: z.string().min(1),
  time: z.string().min(1),
  location: z.string().min(1).max(200),
  mapLink: z.string().url().optional().or(z.literal("")),
  whatsapp: z.string().max(20).optional(),
  invitationText: z.string().max(800).optional(),
  enabledBlocks: z.array(z.string()).default([]),
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

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пайдаланушы табылмады" }, { status: 404 });
  }

  let activeDays = 30;
  let price = 4990;
  let productKey = "INVITE";
  try {
    const product = await getProductSettings();
    activeDays = product.activeDays;
    price = product.price;
    productKey = product.productKey;
  } catch {
    // fallback to defaults
  }

  let slug = generateInviteSlug(data.groomName, data.brideName);
  for (let i = 0; i < 6; i++) {
    const hit = await db.invite.findUnique({ where: { slug } });
    if (!hit) break;
    if (i === 5) {
      return NextResponse.json(
        { error: "Бірегей сілтеме жасау мүмкін болмады" },
        { status: 500 }
      );
    }
    slug = generateInviteSlug(data.groomName, data.brideName);
  }

  const title =
    data.title?.trim() ||
    (data.brideName?.trim()
      ? `${data.groomName.trim()} & ${data.brideName.trim()}`
      : data.groomName.trim()) ||
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
          template: data.template,
          eventType: data.eventType,
          groomName: data.groomName.trim(),
          brideName: data.brideName?.trim() || null,
          date: data.date,
          time: data.time,
          location: data.location.trim(),
          mapLink: data.mapLink?.trim() || null,
          whatsapp: data.whatsapp?.trim() || null,
          invitationText: data.invitationText?.trim() || null,
          enabledBlocks: data.enabledBlocks,
          priceSnapshot: price,
          activeDaysSnapshot: activeDays,
          productKey,
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
