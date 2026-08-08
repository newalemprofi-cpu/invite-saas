import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const siteSchema = z.object({
  heroTitle: z.string().max(200).optional(),
  heroSubtitle: z.string().max(500).optional(),
  heroCtaPrimary: z.string().max(60).optional(),
  heroCtaSecondary: z.string().max(60).optional(),
  pricingAmount: z.string().max(20).optional(),
  pricingPeriod: z.string().max(50).optional(),
  pricingFeatures: z.array(z.string()).optional(),
  contactWhatsapp: z.string().max(30).optional(),
  contactEmail: z.string().max(100).optional(),
  kaspiLink: z.string().max(500).optional(),
  seoTitle: z.string().max(150).optional(),
  seoDescription: z.string().max(300).optional(),
  footerText: z.string().max(200).optional(),
  announcementBar: z.string().max(200).optional(),
  announcementEnabled: z.boolean().optional(),
});

const SITE_KEY = "site_content";

export async function GET() {
  try {
    const setting = await db.siteSettings.findUnique({ where: { key: SITE_KEY } });
    return NextResponse.json(setting?.value ?? {});
  } catch {
    return NextResponse.json({});
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = siteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const existing = await db.siteSettings.findUnique({ where: { key: SITE_KEY } });
  const current = (existing?.value as Record<string, unknown>) ?? {};

  const updated = await db.siteSettings.upsert({
    where: { key: SITE_KEY },
    create: { key: SITE_KEY, value: { ...current, ...parsed.data } },
    update: { value: { ...current, ...parsed.data } },
  });

  return NextResponse.json(updated.value);
}
