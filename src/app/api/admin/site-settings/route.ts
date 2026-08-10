import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getSiteContent, updateSiteContent } from "@/lib/site-content";

const siteSchema = z.object({
  heroTitle: z.string().max(200).optional(),
  heroTitleRu: z.string().max(200).optional(),
  heroSubtitle: z.string().max(500).optional(),
  heroSubtitleRu: z.string().max(500).optional(),
  heroCtaPrimary: z.string().max(60).optional(),
  heroCtaPrimaryRu: z.string().max(60).optional(),
  heroCtaSecondary: z.string().max(60).optional(),
  heroCtaSecondaryRu: z.string().max(60).optional(),
  hiddenCategories: z.array(z.string()).optional(),
  categoryOrder: z.array(z.string()).optional(),
  featuredTemplateSlugs: z.array(z.string()).optional(),
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

export async function GET() {
  const content = await getSiteContent();
  return NextResponse.json(content);
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

  const updated = await updateSiteContent(parsed.data);
  return NextResponse.json(updated);
}
