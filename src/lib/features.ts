/**
 * Canonical optional-feature keys (§15) — the stable internal identity of
 * every purchasable add-on, plus the free QR toggle. Admin-configured
 * enabled/price/copy lives in lib/feature-pricing.ts (SiteSettings-backed,
 * same defaults()/getX()/updateX() convention as admin-config.ts etc.);
 * THIS file only defines the fixed set of keys and the approved default
 * KK/RU copy (§16) so the admin settings form has real starting values
 * before an admin ever edits them.
 */

export const FEATURE_KEYS = ["music", "gallery", "rsvp", "map", "wishes", "analytics"] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export function isFeatureKey(value: string): value is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(value);
}

export interface FeatureCopy {
  titleKk: string;
  titleRu: string;
  descKk: string;
  descRu: string;
}

// Approved customer-facing copy (§16). "RSVP" is the internal key only —
// never shown to KK/RU customers as the primary label (§16/§28).
export const FEATURE_DEFAULT_COPY: Record<FeatureKey, FeatureCopy> = {
  music: {
    titleKk: "Музыка",
    titleRu: "Музыка",
    descKk: "Шақыру ашылғанда фондық музыка ойнатылады.",
    descRu: "При открытии приглашения включается фоновая музыка.",
  },
  gallery: {
    titleKk: "Галерея",
    titleRu: "Галерея",
    descKk: "Қонақтарға бірнеше естелік суретті көрсетіңіз.",
    descRu: "Покажите гостям несколько памятных фотографий.",
  },
  rsvp: {
    titleKk: "Қатысуды растау",
    titleRu: "Подтверждение участия",
    descKk: "Қонақтар тойға келетінін немесе келмейтінін белгілей алады.",
    descRu: "Гости смогут отметить, придут они на торжество или нет.",
  },
  map: {
    titleKk: "Карта",
    titleRu: "Карта",
    descKk: "Қонақтар той өтетін орынды картадан бірден аша алады.",
    descRu: "Гости смогут сразу открыть место проведения на карте.",
  },
  wishes: {
    titleKk: "Тілек",
    titleRu: "Пожелания",
    descKk: "Қонақтар сізге онлайн тілек қалдыра алады.",
    descRu: "Гости смогут оставить вам онлайн-пожелание.",
  },
  analytics: {
    titleKk: "Статистика",
    titleRu: "Статистика",
    descKk: "Шақыру қаралымдарын және қонақтардың жауаптарын бақылаңыз.",
    descRu: "Отслеживайте просмотры приглашения и ответы гостей.",
  },
};

export const QR_DEFAULT_COPY: FeatureCopy = {
  titleKk: "QR-код",
  titleRu: "QR-код",
  descKk: "Шақыруыңызға QR-код автоматты түрде жасалады. Оны қағаз шақыруға немесе басқа материалдарға қолдана аласыз.",
  descRu: "Для вашего приглашения автоматически создаётся QR-код. Его можно использовать на бумажном приглашении или других материалах.",
};

export const FEATURE_DEFAULT_PRICE: Record<FeatureKey, number> = {
  music: 500,
  gallery: 500,
  rsvp: 500,
  map: 300,
  wishes: 500,
  analytics: 700,
};
