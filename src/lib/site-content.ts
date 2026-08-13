/**
 * Admin-manageable homepage/site copy — the existing generic SiteSettings
 * key/value store (same pattern as admin-config.ts, payment-providers.ts,
 * receipts/settings.ts), key "site_content". This module is the one place
 * that reads/writes it; the admin API route and the homepage both go
 * through here instead of touching `db.siteSettings` directly, so the two
 * can never drift on shape.
 *
 * Bare fields (heroTitle, heroSubtitle, ...) are the Kazakh value; the
 * matching `*Ru` field is the Russian override — same convention already
 * used by InviteTemplate.description/descriptionRu.
 */
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface CategoryContentOverride {
  titleKk: string;
  titleRu: string;
  descriptionKk: string;
  descriptionRu: string;
}

export interface SiteContent {
  heroTitle: string;
  heroTitleRu: string;
  heroSubtitle: string;
  heroSubtitleRu: string;
  heroCtaPrimary: string;
  heroCtaPrimaryRu: string;
  heroCtaSecondary: string;
  heroCtaSecondaryRu: string;

  /** Short marketing blurb shown in the footer — operational contact channels (phone/email/social) live in admin-config.ts instead, this is copy. */
  companyDescriptionKk: string;
  companyDescriptionRu: string;

  /**
   * The public marketing site's primary CTA color (Site CMS → "Сайт
   * түстері") — deliberately separate from InviteTemplate.accent, which
   * styles individual invitation designs and must never be touched by
   * this. Only ever applied on the marketing pages (/, /templates,
   * /templates/[slug]); every other route keeps the hardcoded gold
   * default via globals.css's :root fallback.
   */
  primaryColor: string;
  primaryColorForeground: string;

  /**
   * Homepage hero phone-mockup preview content (Site CMS → "Hero алдын ала
   * көрінісі"). Priority on read (see src/app/page.tsx): heroPreviewImage
   * (custom admin upload) wins if set; else heroPreviewTemplateSlug (an
   * existing, real InviteTemplate) is rendered; else the homepage falls
   * back to the first featured/active template. Never a fake/synthetic
   * template record.
   */
  heroPreviewTemplateSlug: string;
  /** Storage key (never a raw URL) of an admin-uploaded custom hero screenshot; empty string = none set. */
  heroPreviewImage: string;

  /** Event-category id (see lib/event-categories.ts) -> uploaded cover image storage key. */
  categoryCovers: Record<string, string>;
  /** Event-category ids to hide from the homepage gallery entirely. */
  hiddenCategories: string[];
  /** Event-category ids in the order they should display; any id not listed keeps the default order, appended after the listed ones. */
  categoryOrder: string[];
  /**
   * Event-category id -> admin-editable customer-facing copy override.
   * Keys are always one of EVENT_CATEGORIES' canonical ids (see
   * lib/event-categories.ts) — this table only ever overrides DISPLAY copy
   * for an existing category, it never introduces or renames a category
   * id. Any field left empty falls back to the canonical labelKk/labelRu
   * (title) or renders nothing (description) — see src/app/page.tsx.
   */
  categoryContent: Record<string, CategoryContentOverride>;
  /** InviteTemplate slugs to show in the homepage's "featured templates" row, in order. */
  featuredTemplateSlugs: string[];

  // Pre-existing fields, unchanged shape — kept here so this module remains
  // the single read/write path for the whole "site_content" blob.
  // (contactWhatsapp/contactEmail/kaspiLink were removed here — they were
  // never read anywhere on the customer-facing site and duplicated
  // admin-config.ts's orderWhatsapp/receiptWhatsapp/companyEmail/kaspiLink,
  // which are now the one source of truth for that operational contact
  // data. See the task this was cleaned up for.)
  pricingAmount: string;
  pricingPeriod: string;
  pricingFeatures: string[];
  seoTitle: string;
  seoDescription: string;
  footerText: string;
  announcementBar: string;
  announcementEnabled: boolean;
}

const SITE_KEY = "site_content";
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/** Defense in depth against a malformed/partial stored blob — always returns fully-shaped entries, never lets a missing field reach a render as `undefined`. */
function sanitizeCategoryContent(raw: unknown): Record<string, CategoryContentOverride> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, CategoryContentOverride> = {};
  for (const [id, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Partial<CategoryContentOverride>;
    out[id] = {
      titleKk: typeof e.titleKk === "string" ? e.titleKk : "",
      titleRu: typeof e.titleRu === "string" ? e.titleRu : "",
      descriptionKk: typeof e.descriptionKk === "string" ? e.descriptionKk : "",
      descriptionRu: typeof e.descriptionRu === "string" ? e.descriptionRu : "",
    };
  }
  return out;
}

export function defaultSiteContent(): SiteContent {
  return {
    heroTitle: "Ерекше күніңізге\nерекше шақыру",
    heroTitleRu: "Особенному дню —\nособенное приглашение",
    heroSubtitle: "Дайын дизайнды таңдаңыз, ақпаратыңызды енгізіңіз — шақыру бірнеше минутта дайын.",
    heroSubtitleRu: "Выберите готовый дизайн, укажите данные — приглашение готово за пару минут.",
    heroCtaPrimary: "Шақыру жасау",
    heroCtaPrimaryRu: "Создать приглашение",
    heroCtaSecondary: "Шаблондарды көру",
    heroCtaSecondaryRu: "Смотреть шаблоны",

    companyDescriptionKk: "Shaqyru — заманауи цифрлық шақыру жасау сервисі. Дайын үлгіні таңдап, бірнеше минут ішінде шақыруыңызды дайындаңыз.",
    companyDescriptionRu: "Shaqyru — современный сервис создания цифровых приглашений. Выберите готовый шаблон и подготовьте приглашение за пару минут.",

    // Matches the original hardcoded gold theme exactly — an admin who
    // never touches this setting sees zero visual change.
    primaryColor: "#C4963E",
    primaryColorForeground: "#1C1917",

    heroPreviewTemplateSlug: "",
    heroPreviewImage: "",

    categoryCovers: {},
    hiddenCategories: [],
    categoryOrder: [],
    categoryContent: {},
    featuredTemplateSlugs: [],

    pricingAmount: "4 990",
    pricingPeriod: "90 күн белсенді",
    pricingFeatures: [
      "Кез-келген шаблонды таңдаңыз",
      "Шексіз RSVP жинау",
      "Бөлісу сілтемесі",
      "Визуалды редактор",
      "WhatsApp интеграциясы",
      "Картадан орынды қосу",
    ],
    seoTitle: "Шақыру — Премиум цифрлы шақырулар",
    seoDescription: "Элегантты цифрлы шақырулар. Үйлену той, ұзату, туылған күн үшін.",
    footerText: "Қазақстандық премиум цифрлы шақыру сервисі",
    announcementBar: "",
    announcementEnabled: false,
  };
}

export async function getSiteContent(): Promise<SiteContent> {
  const d = defaultSiteContent();
  try {
    const row = await db.siteSettings.findUnique({ where: { key: SITE_KEY } });
    if (!row) return d;
    const v = (row.value ?? {}) as Partial<SiteContent>;
    return {
      ...d,
      ...v,
      // Defense in depth: even though the API route validates hex format
      // before writing, never let a malformed stored value reach a CSS
      // custom property (which would just silently drop the whole
      // declaration and could look like a broken/transparent button).
      primaryColor: v.primaryColor && HEX_COLOR_RE.test(v.primaryColor) ? v.primaryColor : d.primaryColor,
      primaryColorForeground: v.primaryColorForeground && HEX_COLOR_RE.test(v.primaryColorForeground) ? v.primaryColorForeground : d.primaryColorForeground,
      categoryCovers: v.categoryCovers && typeof v.categoryCovers === "object" ? v.categoryCovers : d.categoryCovers,
      hiddenCategories: Array.isArray(v.hiddenCategories) ? v.hiddenCategories : d.hiddenCategories,
      categoryOrder: Array.isArray(v.categoryOrder) ? v.categoryOrder : d.categoryOrder,
      categoryContent: sanitizeCategoryContent(v.categoryContent),
      featuredTemplateSlugs: Array.isArray(v.featuredTemplateSlugs) ? v.featuredTemplateSlugs : d.featuredTemplateSlugs,
      pricingFeatures: Array.isArray(v.pricingFeatures) ? v.pricingFeatures : d.pricingFeatures,
    };
  } catch {
    return d;
  }
}

export async function updateSiteContent(patch: Partial<SiteContent>): Promise<SiteContent> {
  const current = await getSiteContent();
  const merged: SiteContent = { ...current, ...patch };
  const jsonValue = merged as unknown as Prisma.InputJsonValue;
  await db.siteSettings.upsert({
    where: { key: SITE_KEY },
    update: { value: jsonValue },
    create: { key: SITE_KEY, value: jsonValue },
  });
  return merged;
}
