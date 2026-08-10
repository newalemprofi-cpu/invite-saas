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
