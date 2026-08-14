import type { TemplateDemoContent } from "@/lib/template-demo";
import type { VisualConfig } from "@/lib/visual-config";

export interface Template {
  id: string;
  slug: string;
  name: string;
  nameKk: string;
  nameRu: string;
  category: TemplateCategory;
  style: string;
  description: string;
  descKk: string;
  descRu: string;
  price: number;
  isPremium: boolean;
  tags: string[];
  tagsKk: string[];
  tagsRu: string[];
  // Visual tokens for preview & editor
  bg: string;
  gradient: string;
  accent: string;
  textDark: string;
  textMuted: string;
  dark: boolean;
  emoji: string;
  // Demo names shown on landing / template card
  demoName1: string;
  demoName2?: string;
  // Real photo overrides for the gradient/emoji card, admin-uploaded via
  // /admin/templates — already resolved to a loadable URL (see
  // lib/storage.ts's resolveStoredImage()), null when not set. Absent from
  // the hardcoded seed TEMPLATES below; only ever populated by
  // rowToTemplate() in db-templates.ts from real DB rows.
  previewImage?: string | null;
  demoImage?: string | null;
  /** Admin-managed content for the full "Толық көру" demo — see lib/template-demo.ts. Absent/undefined for the hardcoded seed TEMPLATES below; only ever populated by rowToTemplate() from a real DB row. */
  demoContent?: TemplateDemoContent | null;
  /**
   * Admin Template Builder's versioned visual composition config — see
   * lib/visual-config.ts. `null`/`undefined` means "no builder config
   * saved for this template" — InvitationView/WeddingHero fall back to
   * their existing legacy rendering (hardcoded wedding-template-layouts.ts
   * entry, or the plain generic layout) exactly as before this field
   * existed. Absent from the hardcoded seed TEMPLATES below (those 13
   * seed templates, including the 5 flagship Wedding ones, deliberately
   * keep rendering through the legacy path — see §6/§28 of the Template
   * Builder task for why they are not force-converted); only ever
   * populated by rowToTemplate() from a real DB row that an admin has
   * actually configured through the Builder.
   */
  visualConfig?: VisualConfig | null;
}

export type TemplateCategory =
  | "wedding"
  | "uzatu"
  | "birthday"
  | "corporate"
  | "minimal"
  | "kazakh";

export interface TemplateFilter {
  id: string;
  label: string;
  labelKk: string;
}

export const TEMPLATE_FILTERS: TemplateFilter[] = [
  { id: "all", label: "Все", labelKk: "Барлығы" },
  { id: "wedding", label: "Свадьба", labelKk: "Үйлену той" },
  { id: "uzatu", label: "Ұзату", labelKk: "Қыз ұзату" },
  { id: "birthday", label: "День рождения", labelKk: "Туылған күн" },
  { id: "kazakh", label: "Казахский", labelKk: "Қазақша" },
  { id: "corporate", label: "Корпоратив", labelKk: "Корпоратив" },
  { id: "minimal", label: "Минимал", labelKk: "Минимал" },
];

export const TEMPLATES: Template[] = [
  {
    id: "wedding-rose",
    slug: "wedding-rose",
    name: "Rose Garden",
    nameKk: "Гүл бағы",
    nameRu: "Розовый сад",
    category: "wedding",
    style: "romantic",
    description: "Romantic rose gold with delicate floral details",
    descKk: "Нәзік гүлді безендірулермен романтикалық розалы-алтын стиль",
    descRu: "Романтичное розовое золото с нежными цветочными деталями",
    price: 4990,
    isPremium: false,
    tags: ["romantic", "floral", "soft"],
    tagsKk: ["романтикалық", "гүлді", "нәзік"],
    tagsRu: ["романтичный", "цветочный", "нежный"],
    bg: "#FFF5F7",
    gradient: "from-rose-50 via-pink-50 to-fuchsia-50",
    accent: "#D6658B",
    textDark: "#5C1A35",
    textMuted: "#B07088",
    dark: false,
    emoji: "🌹",
    demoName1: "Айдар",
    demoName2: "Айгерім",
  },
  {
    id: "wedding-gold",
    slug: "wedding-gold",
    name: "Golden Luxe",
    nameKk: "Алтын сән",
    nameRu: "Золотая роскошь",
    category: "wedding",
    style: "luxury",
    description: "Timeless luxury: gold calligraphy on ivory canvas",
    descKk: "Фил сүйегі фонда алтын каллиграфия: мәңгілік сән",
    descRu: "Вечная роскошь: золотая каллиграфия на кремовом фоне",
    price: 6990,
    isPremium: true,
    tags: ["luxury", "gold", "elegant"],
    tagsKk: ["сәнді", "алтын", "элегантты"],
    tagsRu: ["роскошный", "золотой", "элегантный"],
    bg: "#FAF7EE",
    gradient: "from-amber-50 via-yellow-50 to-stone-100",
    accent: "#C4963E",
    textDark: "#4A3200",
    textMuted: "#9A7B2F",
    dark: false,
    emoji: "✨",
    demoName1: "Нурлан",
    demoName2: "Дильназ",
  },
  {
    id: "wedding-midnight",
    slug: "wedding-midnight",
    name: "Midnight Romance",
    nameKk: "Түнгі романтика",
    nameRu: "Полуночная романтика",
    category: "wedding",
    style: "dramatic",
    description: "Deep navy velvet with shimmering gold accents",
    descKk: "Жарқыраған алтын акценттермен терең темір-синді бархат",
    descRu: "Глубокий тёмно-синий бархат с мерцающими золотыми акцентами",
    price: 6990,
    isPremium: true,
    tags: ["dark", "dramatic", "premium"],
    tagsKk: ["қою түс", "драмалық", "премиум"],
    tagsRu: ["тёмный", "драматичный", "премиум"],
    bg: "#0F1729",
    gradient: "from-slate-900 via-blue-950 to-slate-900",
    accent: "#C4963E",
    textDark: "#F0E6D3",
    textMuted: "#8A9CC2",
    dark: true,
    emoji: "🌙",
    demoName1: "Бекзат",
    demoName2: "Мадина",
  },
  {
    id: "uzatu-blossom",
    slug: "uzatu-blossom",
    name: "Blossom",
    nameKk: "Гүл ашылуы",
    nameRu: "Цветение",
    category: "uzatu",
    style: "tender",
    description: "Tender pink sakura for the kazakh uzatu ceremony",
    descKk: "Қазақтың ұзату тойы үшін нәзік қызғылт сакура стилі",
    descRu: "Нежная розовая сакура для казахского той узату",
    price: 4990,
    isPremium: false,
    tags: ["pink", "tender", "ceremony"],
    tagsKk: ["қызғылт", "нәзік", "салтанат"],
    tagsRu: ["розовый", "нежный", "церемония"],
    bg: "#FFF0F6",
    gradient: "from-pink-100 via-rose-50 to-fuchsia-100",
    accent: "#E879A4",
    textDark: "#7A1840",
    textMuted: "#C07090",
    dark: false,
    emoji: "🌸",
    demoName1: "Алия",
  },
  {
    id: "kazakh-heritage",
    slug: "kazakh-heritage",
    name: "Қазақ үлгісі",
    nameKk: "Мұра",
    nameRu: "Казахское наследие",
    category: "kazakh",
    style: "national",
    description: "National ornaments, red & gold — proud and beautiful",
    descKk: "Ұлттық өрнектер, қызыл мен алтын — мақтанышты және сұлу",
    descRu: "Национальные орнаменты, красный и золотой — гордо и красиво",
    price: 5990,
    isPremium: false,
    tags: ["national", "kazakh", "ornament"],
    tagsKk: ["ұлттық", "қазақша", "өрнек"],
    tagsRu: ["национальный", "казахский", "орнамент"],
    bg: "#7F1D1D",
    gradient: "from-red-800 via-red-700 to-amber-700",
    accent: "#FBBF24",
    textDark: "#FEF3C7",
    textMuted: "#FCD34D",
    dark: true,
    emoji: "🏵️",
    demoName1: "Ерлан",
    demoName2: "Гульнар",
  },
  {
    id: "minimal-ivory",
    slug: "minimal-ivory",
    name: "Pure Ivory",
    nameKk: "Таза ақ",
    nameRu: "Чистая слоновая кость",
    category: "minimal",
    style: "minimal",
    description: "Clean white canvas, typography-first design",
    descKk: "Таза ақ фон, типографияға негізделген дизайн",
    descRu: "Чистый белый фон, дизайн на основе типографики",
    price: 3990,
    isPremium: false,
    tags: ["minimal", "clean", "typographic"],
    tagsKk: ["минимал", "таза", "типографика"],
    tagsRu: ["минимализм", "чистый", "типографика"],
    bg: "#FAFAF9",
    gradient: "from-stone-50 via-white to-stone-50",
    accent: "#44403C",
    textDark: "#1C1917",
    textMuted: "#78716C",
    dark: false,
    emoji: "◻️",
    demoName1: "Асан",
    demoName2: "Зарина",
  },
  {
    id: "birthday-festive",
    slug: "birthday-festive",
    name: "Celebration",
    nameKk: "Мерей",
    nameRu: "Праздник",
    category: "birthday",
    style: "festive",
    description: "Vibrant and joyful birthday celebration",
    descKk: "Жарқын және қуанышты туылған күн тойы",
    descRu: "Яркое и радостное празднование дня рождения",
    price: 3990,
    isPremium: false,
    tags: ["colorful", "festive", "fun"],
    tagsKk: ["түрлі-түсті", "мерекелік", "қызықты"],
    tagsRu: ["яркий", "праздничный", "весёлый"],
    bg: "#F5F3FF",
    gradient: "from-violet-100 via-purple-50 to-pink-100",
    accent: "#A855F7",
    textDark: "#3B0764",
    textMuted: "#7C3AED",
    dark: false,
    emoji: "🎂",
    demoName1: "Дамир",
  },
  {
    id: "corporate-clean",
    slug: "corporate-clean",
    name: "Executive",
    nameKk: "Іскерлік",
    nameRu: "Деловой",
    category: "corporate",
    style: "professional",
    description: "Professional and clean corporate event invitation",
    descKk: "Кәсіби және таза корпоративтік іс-шара шақыруы",
    descRu: "Профессиональное и чистое приглашение на корпоративное мероприятие",
    price: 4990,
    isPremium: false,
    tags: ["business", "professional", "clean"],
    tagsKk: ["бизнес", "кәсіби", "таза"],
    tagsRu: ["бизнес", "профессиональный", "чистый"],
    bg: "#F0F7FF",
    gradient: "from-blue-50 via-indigo-50 to-blue-100",
    accent: "#3B82F6",
    textDark: "#1E3A5F",
    textMuted: "#3B82F6",
    dark: false,
    emoji: "🏢",
    demoName1: "ТОО «Компания»",
  },
  {
    id: "zaure-premium",
    slug: "zaure-premium",
    name: "Zaure Premium",
    nameKk: "Зауре Премиум",
    nameRu: "Zaure Premium",
    category: "wedding",
    style: "floral",
    description: "Elegant beige floral wedding invitation",
    descKk: "Нәзік бежевый гүлді үйлену той шақыруы",
    descRu: "Элегантное бежевое цветочное свадебное приглашение",
    price: 6990,
    isPremium: true,
    tags: ["premium", "wedding", "floral", "beige", "gold"],
    tagsKk: ["премиум", "үйлену той", "гүлді", "бежевый", "алтын"],
    tagsRu: ["премиум", "свадьба", "цветочный", "бежевый", "золотой"],
    bg: "#F9F4ED",
    gradient: "from-amber-50 via-stone-50 to-rose-50",
    accent: "#B8925A",
    textDark: "#3C2810",
    textMuted: "#9C7D5A",
    dark: false,
    emoji: "🌸",
    demoName1: "Зауре",
    demoName2: "Нұрсұлтан",
  },
  // ── 5 flagship production Wedding templates ─────────────────────────
  // Each has a matching entry in lib/wedding-template-layouts.ts keyed by
  // slug, which is what actually gives it a genuinely different visual
  // COMPOSITION (photo placement/framing/decor) — see WeddingHero.tsx.
  // The tokens below (bg/gradient/accent/textDark/textMuted/dark) remain
  // meaningful on their own: they still drive the admin CMS card, the
  // /templates grid fallback, and section-level colors (ambient glow,
  // countdown numbers, etc.) exactly like every other template.
  {
    id: "wedding-romantic",
    slug: "wedding-romantic",
    name: "Romantic",
    nameKk: "Романтик",
    nameRu: "Романтика",
    category: "wedding",
    style: "romantic-full-photo",
    description: "Full-photo romantic wedding invitation with a soft blush palette",
    descKk: "Толық фотосуретті романтикалық шақыру, жұмсақ раушан реңкте",
    descRu: "Романтичное приглашение с фото на весь экран в нежной розовой гамме",
    price: 5990,
    isPremium: true,
    tags: ["romantic", "full-photo", "elegant"],
    tagsKk: ["романтикалық", "фотосурет", "элегантты"],
    tagsRu: ["романтичный", "фото", "элегантный"],
    bg: "#FBF1F2",
    gradient: "from-rose-100 via-pink-50 to-amber-50",
    accent: "#C46E86",
    textDark: "#4A1F2C",
    textMuted: "#9C6A78",
    dark: false,
    emoji: "🌹",
    demoName1: "Ерлан",
    demoName2: "Аружан",
  },
  {
    id: "wedding-classic-gold",
    slug: "wedding-classic-gold",
    name: "Classic Gold",
    nameKk: "Алтын сән",
    nameRu: "Золотая классика",
    category: "wedding",
    style: "classic-top-photo",
    description: "Formal, timeless invitation with the photo framed at the top",
    descKk: "Фото жоғарғы жағында орналасқан ресми, мәңгілік шақыру",
    descRu: "Формальное, вневременное приглашение с фото в верхней части",
    price: 5990,
    isPremium: true,
    tags: ["classic", "gold", "formal"],
    tagsKk: ["классикалық", "алтын", "ресми"],
    tagsRu: ["классический", "золотой", "формальный"],
    bg: "#FBF7EC",
    gradient: "from-amber-50 via-yellow-50 to-stone-50",
    accent: "#B8923E",
    textDark: "#3A2E10",
    textMuted: "#8A7440",
    dark: false,
    emoji: "✨",
    demoName1: "Асхат",
    demoName2: "Динара",
  },
  {
    id: "wedding-floral-watercolor",
    slug: "wedding-floral-watercolor",
    name: "Floral Watercolor",
    nameKk: "Гүлді акварель",
    nameRu: "Цветочная акварель",
    category: "wedding",
    style: "floral-framed-photo",
    description: "Airy, natural invitation with a framed portrait and watercolor florals",
    descKk: "Жеңіл әрі табиғи, дөңгелек фотосурет пен акварель гүлдер",
    descRu: "Лёгкое природное приглашение с портретом в рамке и акварельными цветами",
    price: 5990,
    isPremium: true,
    tags: ["floral", "watercolor", "natural"],
    tagsKk: ["гүлді", "акварель", "табиғи"],
    tagsRu: ["цветочный", "акварель", "природный"],
    bg: "#F5F8F0",
    gradient: "from-green-50 via-stone-50 to-amber-50",
    accent: "#7A9A66",
    textDark: "#2C3820",
    textMuted: "#6E8560",
    dark: false,
    emoji: "🌿",
    demoName1: "Алишер",
    demoName2: "Камилла",
  },
  {
    id: "wedding-dark-luxury",
    slug: "wedding-dark-luxury",
    name: "Dark Luxury",
    nameKk: "Dark Luxury",
    nameRu: "Dark Luxury",
    category: "wedding",
    style: "dark-photo-fade",
    description: "Premium evening invitation — photo fading into a dark, gold-accented composition",
    descKk: "Премиум кешкі шақыру — фото қараңғы, алтын акцентті фонға еніп кетеді",
    descRu: "Премиальное вечернее приглашение — фото растворяется в тёмной композиции с золотом",
    price: 6990,
    isPremium: true,
    tags: ["dark", "luxury", "gold", "premium"],
    tagsKk: ["қою түс", "сәнді", "алтын", "премиум"],
    tagsRu: ["тёмный", "роскошный", "золотой", "премиум"],
    bg: "#151210",
    gradient: "from-stone-900 via-neutral-900 to-stone-950",
    accent: "#C9A961",
    textDark: "#F0E6D3",
    textMuted: "#B7A57E",
    dark: true,
    emoji: "🖤",
    demoName1: "Бекзат",
    demoName2: "Мадина",
  },
  {
    id: "wedding-kazakh-ethno",
    slug: "wedding-kazakh-ethno",
    name: "Kazakh Ethno",
    nameKk: "Ұлттық нақыш",
    nameRu: "Национальный стиль",
    category: "wedding",
    style: "ethno-arched-photo",
    description: "Modern premium Kazakh wedding design with an arched ornamental photo frame",
    descKk: "Заманауи премиум қазақ той дизайны, доғал өрнекті фото жақтауымен",
    descRu: "Современный премиальный казахский свадебный дизайн с аркой-рамкой для фото",
    price: 6990,
    isPremium: true,
    tags: ["kazakh", "ethno", "national", "premium"],
    tagsKk: ["қазақша", "ұлттық", "өрнек", "премиум"],
    tagsRu: ["казахский", "национальный", "орнамент", "премиум"],
    bg: "#FBF4E7",
    gradient: "from-amber-50 via-stone-50 to-yellow-50",
    accent: "#A67C3D",
    textDark: "#3E2D14",
    textMuted: "#8A6C3E",
    dark: false,
    emoji: "🏵️",
    demoName1: "Нұрлан",
    demoName2: "Гүлмира",
  },
];

export function getTemplate(slug: string): Template | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}

export function getTemplatesByCategory(category: string): Template[] {
  if (category === "all") return TEMPLATES;
  return TEMPLATES.filter((t) => t.category === category);
}

/** Customer-facing name/description/tags for the given language. */
export function localizeTemplate(
  tmpl: Pick<Template, "name" | "nameKk" | "nameRu" | "description" | "descKk" | "descRu" | "tags" | "tagsKk" | "tagsRu">,
  lang: "kk" | "ru"
): { name: string; description: string; tags: string[] } {
  if (lang === "ru") {
    return {
      name: tmpl.nameRu || tmpl.name,
      description: tmpl.descRu || tmpl.description,
      tags: tmpl.tagsRu.length > 0 ? tmpl.tagsRu : tmpl.tags,
    };
  }
  return {
    name: tmpl.nameKk || tmpl.name,
    description: tmpl.descKk || tmpl.description,
    tags: tmpl.tagsKk.length > 0 ? tmpl.tagsKk : tmpl.tags,
  };
}
