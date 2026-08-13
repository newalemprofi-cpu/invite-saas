import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getSiteContent, updateSiteContent } from "@/lib/site-content";
import { EVENT_CATEGORIES } from "@/lib/event-categories";

const HEX_COLOR = z.string().regex(/^#[0-9a-fA-F]{6}$/, "HEX түсі дұрыс форматта болуы керек (мысалы, #D6A84B)");

// Keys are restricted to existing canonical category ids (§ INTERNAL
// CATEGORY ID MUST NOT BE EDITABLE) — this endpoint can only override
// DISPLAY copy for a category that already exists, never introduce or
// rename one.
const CATEGORY_CONTENT = z.object({
  titleKk: z.string().max(60).default(""),
  titleRu: z.string().max(60).default(""),
  descriptionKk: z.string().max(200).default(""),
  descriptionRu: z.string().max(200).default(""),
});
const categoryContentSchema = z.record(z.string(), CATEGORY_CONTENT).optional();

const siteSchema = z.object({
  heroTitle: z.string().max(200).optional(),
  heroTitleRu: z.string().max(200).optional(),
  heroSubtitle: z.string().max(500).optional(),
  heroSubtitleRu: z.string().max(500).optional(),
  heroCtaPrimary: z.string().max(60).optional(),
  heroCtaPrimaryRu: z.string().max(60).optional(),
  heroCtaSecondary: z.string().max(60).optional(),
  heroCtaSecondaryRu: z.string().max(60).optional(),
  companyDescriptionKk: z.string().max(400).optional(),
  companyDescriptionRu: z.string().max(400).optional(),
  primaryColor: HEX_COLOR.optional(),
  primaryColorForeground: HEX_COLOR.optional(),
  heroPreviewTemplateSlug: z.string().max(120).optional(),
  hiddenCategories: z.array(z.string()).optional(),
  categoryOrder: z.array(z.string()).optional(),
  categoryContent: categoryContentSchema,
  featuredTemplateSlugs: z.array(z.string()).optional(),
  pricingAmount: z.string().max(20).optional(),
  pricingPeriod: z.string().max(50).optional(),
  pricingFeatures: z.array(z.string()).optional(),
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

  const data = { ...parsed.data };
  if (data.categoryContent) {
    const validIds = new Set(EVENT_CATEGORIES.map((c) => c.id));
    data.categoryContent = Object.fromEntries(
      Object.entries(data.categoryContent).filter(([id]) => validIds.has(id))
    );
  }

  const updated = await updateSiteContent(data);
  return NextResponse.json(updated);
}
