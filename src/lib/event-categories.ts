/**
 * The 8 customer-facing event categories shown on the homepage's category
 * gallery. Single source of truth — the homepage, the admin CMS's
 * cover-image manager, and anything else that needs "which categories
 * exist" all import from here instead of keeping their own copies.
 *
 * `cat` is the broader `/templates?cat=` filter bucket these map onto (see
 * TEMPLATE_FILTERS in lib/templates.ts) — several event ids intentionally
 * share one `cat` (e.g. tusaukeser/birthday both filter into "birthday"),
 * matching how template filtering already worked before this redesign.
 */
import type { Lang } from "@/lib/i18n";

export interface EventCategory {
  /** Stable identity, never shown to the customer and never renamed. */
  id: string;
  /** The /templates?cat= bucket this category's templates live in. */
  cat: string;
  emoji: string;
  labelKk: string;
  labelRu: string;
}

// RU labels reuse existing project wording where it exists (wedding/birthday/
// corporate match TEMPLATE_FILTERS in lib/templates.ts). The four
// Kazakhstan-specific ceremonies had no prior translation anywhere in the
// codebase before this project's onboarding-localization fix — same
// phrasing carried over here.
export const EVENT_CATEGORIES: EventCategory[] = [
  { id: "wedding", cat: "wedding", emoji: "💍", labelKk: "Үйлену той", labelRu: "Свадьба" },
  { id: "uzatu", cat: "uzatu", emoji: "🌸", labelKk: "Қыз ұзату", labelRu: "Проводы невесты" },
  { id: "tusaukeser", cat: "birthday", emoji: "👶", labelKk: "Тұсаукесер", labelRu: "Первый шаг" },
  { id: "besiktoi", cat: "kazakh", emoji: "🍼", labelKk: "Бесік той", labelRu: "Праздник колыбели" },
  { id: "birthday", cat: "birthday", emoji: "🎂", labelKk: "Туған күн", labelRu: "День рождения" },
  { id: "sundettoi", cat: "kazakh", emoji: "⭐", labelKk: "Сүндет той", labelRu: "Обряд сундет" },
  { id: "kudalyk", cat: "kazakh", emoji: "🤝", labelKk: "Құдалық", labelRu: "Сватовство" },
  { id: "corporate", cat: "corporate", emoji: "🏢", labelKk: "Корпоратив", labelRu: "Корпоратив" },
];

export function eventCategoryLabel(c: EventCategory, lang: Lang): string {
  return lang === "ru" ? c.labelRu : c.labelKk;
}
