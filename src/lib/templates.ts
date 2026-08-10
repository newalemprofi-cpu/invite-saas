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
