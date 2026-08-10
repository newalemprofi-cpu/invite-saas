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

export interface SiteContent {
  heroTitle: string;
  heroTitleRu: string;
  heroSubtitle: string;
  heroSubtitleRu: string;
  heroCtaPrimary: string;
  heroCtaPrimaryRu: string;
  heroCtaSecondary: string;
  heroCtaSecondaryRu: string;

  /** Event-category id (see lib/event-categories.ts) -> uploaded cover image storage key. */
  categoryCovers: Record<string, string>;
  /** Event-category ids to hide from the homepage gallery entirely. */
  hiddenCategories: string[];
  /** Event-category ids in the order they should display; any id not listed keeps the default order, appended after the listed ones. */
  categoryOrder: string[];
  /** InviteTemplate slugs to show in the homepage's "featured templates" row, in order. */
  featuredTemplateSlugs: string[];

  // Pre-existing fields, unchanged shape — kept here so this module remains
  // the single read/write path for the whole "site_content" blob.
  pricingAmount: string;
  pricingPeriod: string;
  pricingFeatures: string[];
  contactWhatsapp: string;
  contactEmail: string;
  kaspiLink: string;
  seoTitle: string;
  seoDescription: string;
  footerText: string;
  announcementBar: string;
  announcementEnabled: boolean;
}

const SITE_KEY = "site_content";

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

    categoryCovers: {},
    hiddenCategories: [],
    categoryOrder: [],
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
    contactWhatsapp: "",
    contactEmail: "",
    kaspiLink: "",
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
      categoryCovers: v.categoryCovers && typeof v.categoryCovers === "object" ? v.categoryCovers : d.categoryCovers,
      hiddenCategories: Array.isArray(v.hiddenCategories) ? v.hiddenCategories : d.hiddenCategories,
      categoryOrder: Array.isArray(v.categoryOrder) ? v.categoryOrder : d.categoryOrder,
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
