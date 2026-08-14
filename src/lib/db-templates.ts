import { db } from "@/lib/db";
import { TEMPLATES } from "@/lib/templates";
import type { Template, TemplateCategory } from "@/lib/templates";
import type { InviteTemplate } from "@prisma/client";
import { resolveStoredImage } from "@/lib/storage";
import { parseTemplateDemoContent } from "@/lib/template-demo";
import { parseVisualConfig } from "@/lib/visual-config";

function rowToTemplate(t: InviteTemplate, price: number): Template {
  return {
    id: t.id,
    slug: t.slug,
    name: t.title,
    nameKk: t.nameKk ?? t.title,
    nameRu: t.nameRu ?? t.title,
    category: t.category as TemplateCategory,
    style: t.style,
    description: t.description ?? "",
    descKk: t.description ?? "",
    descRu: t.descriptionRu ?? t.description ?? "",
    price,
    isPremium: t.isPremium,
    tags: t.tags,
    tagsKk: t.tagsKk,
    tagsRu: t.tagsRu,
    bg: t.bg,
    gradient: t.gradient,
    accent: t.accent,
    textDark: t.textDark,
    textMuted: t.textMuted,
    dark: t.dark,
    emoji: t.emoji,
    demoName1: t.demoName1,
    demoName2: t.demoName2 ?? undefined,
    previewImage: resolveStoredImage(t.previewImage),
    demoImage: resolveStoredImage(t.demoImage),
    demoContent: parseTemplateDemoContent(t.demoContent),
    visualConfig: parseVisualConfig(t.visualConfig),
  };
}

// Guards the backfill below to run at most once per server process — the
// SAME per-process-flag pattern backfillTranslations() already uses just
// below. Deliberately NOT "only when the table is completely empty"
// anymore: that would mean a template added to the TEMPLATES array after a
// database was first seeded (e.g. these 5 new Wedding templates, added to
// an already-seeded production DB) would never appear. `skipDuplicates`
// makes re-attempting the full list on every already-seeded row a safe,
// idempotent no-op — this is a data backfill, not a schema migration.
let templatesBackfilled = false;

async function seedIfEmpty(): Promise<void> {
  if (templatesBackfilled) return;
  templatesBackfilled = true; // set eagerly: never retry within this process
  await db.inviteTemplate.createMany({
    data: TEMPLATES.map((t) => ({
      title: t.name,
      slug: t.slug,
      nameKk: t.nameKk,
      nameRu: t.nameRu,
      category: t.category,
      language: "both",
      style: t.style,
      description: t.description,
      descriptionRu: t.descRu,
      isActive: true,
      sortOrder: 0,
      isPremium: t.isPremium,
      bg: t.bg,
      gradient: t.gradient,
      accent: t.accent,
      textDark: t.textDark,
      textMuted: t.textMuted,
      dark: t.dark,
      emoji: t.emoji,
      demoName1: t.demoName1,
      demoName2: t.demoName2 ?? null,
      tags: t.tags,
      tagsKk: t.tagsKk,
      tagsRu: t.tagsRu,
    })),
    skipDuplicates: true,
  });
}

// One-time (per process) backfill of nameRu/descriptionRu/tagsKk/tagsRu for
// rows that were seeded before those columns existed. Cheap no-op once done.
let translationsBackfilled = false;

async function backfillTranslations(): Promise<void> {
  if (translationsBackfilled) return;
  translationsBackfilled = true; // set eagerly: never retry within this process
  const stale = await db.inviteTemplate.findMany({
    where: { nameRu: null },
    select: { slug: true },
  });
  if (stale.length === 0) return;
  await Promise.all(
    stale.map(({ slug }) => {
      const t = TEMPLATES.find((tmpl) => tmpl.slug === slug);
      if (!t) return Promise.resolve();
      return db.inviteTemplate.update({
        where: { slug },
        data: {
          nameRu: t.nameRu,
          descriptionRu: t.descRu,
          tagsKk: t.tagsKk,
          tagsRu: t.tagsRu,
        },
      });
    })
  );
}

function configPrice(row: { value: unknown } | null): number {
  if (!row) return 4990;
  const v = row.value as { price?: number };
  return typeof v.price === "number" && v.price > 0 ? v.price : 4990;
}

export async function getDbTemplates(opts?: {
  cat?: string;
  lang?: string;
  activeOnly?: boolean;
}): Promise<Template[]> {
  await seedIfEmpty();
  await backfillTranslations();

  const [rows, cfgRow] = await Promise.all([
    db.inviteTemplate.findMany({
      where: {
        ...(opts?.activeOnly !== false && { isActive: true }),
        ...(opts?.cat && opts.cat !== "all" && { category: opts.cat }),
        ...(opts?.lang && {
          OR: [{ language: opts.lang }, { language: "both" }],
        }),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.siteSettings.findUnique({ where: { key: "admin_config" } }),
  ]);

  const price = configPrice(cfgRow);
  return rows.map((r) => rowToTemplate(r, price));
}

export async function getDbTemplate(slug: string): Promise<Template | undefined> {
  await seedIfEmpty();
  await backfillTranslations();
  const [row, cfgRow] = await Promise.all([
    db.inviteTemplate.findUnique({ where: { slug } }),
    db.siteSettings.findUnique({ where: { key: "admin_config" } }),
  ]);
  if (!row) return undefined;
  return rowToTemplate(row, configPrice(cfgRow));
}

// Admin-only: returns raw DB records (all fields, including inactive)
export async function getAllDbTemplates(): Promise<InviteTemplate[]> {
  await seedIfEmpty();
  return db.inviteTemplate.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}
