import { z } from "zod";

export const EVENT_TYPES = [
  { value: "WEDDING" as const, label: "Үйлену той", emoji: "💍", dualName: true },
  { value: "BIRTHDAY" as const, label: "Туылған күн", emoji: "🎂", dualName: false },
  { value: "BABY_SHOWER" as const, label: "Нәресте тойы", emoji: "👶", dualName: false },
  { value: "ENGAGEMENT" as const, label: "Қалыңдық той", emoji: "💒", dualName: true },
  { value: "ANNIVERSARY" as const, label: "Мерейтой", emoji: "🥂", dualName: true },
  { value: "CORPORATE" as const, label: "Корпоратив", emoji: "🏢", dualName: false },
] as const;

// Kept for backward compatibility with old invites stored in DB
export const THEMES = [
  { id: "ROSE_GOLD" as const, name: "Rose Gold", desc: "Романтикалық, нәзік", gradient: "from-rose-50 via-pink-50 to-rose-100", accent: "#f43f5e", textColor: "#4c0519", dark: false },
  { id: "MIDNIGHT" as const, name: "Midnight Blue", desc: "Элегантты, салтанатты", gradient: "from-slate-900 via-blue-950 to-slate-800", accent: "#60a5fa", textColor: "#eff6ff", dark: true },
  { id: "EMERALD" as const, name: "Emerald Garden", desc: "Табиғи, жаңа", gradient: "from-emerald-50 via-green-50 to-teal-100", accent: "#10b981", textColor: "#064e3b", dark: false },
  { id: "IVORY" as const, name: "Ivory Classic", desc: "Классикалық, мәртебелі", gradient: "from-amber-50 via-yellow-50 to-amber-100", accent: "#d97706", textColor: "#451a03", dark: false },
  { id: "KAZAKH" as const, name: "Kazakh Heritage", desc: "Ұлттық, ерекше", gradient: "from-red-700 via-amber-600 to-red-800", accent: "#fbbf24", textColor: "#fef3c7", dark: true },
  { id: "PINK_UZATU" as const, name: "Ұзату", desc: "Нәзік, романтикалық", gradient: "from-pink-100 via-rose-50 to-fuchsia-100", accent: "#ec4899", textColor: "#831843", dark: false },
  { id: "KIDS_BIRTHDAY" as const, name: "Балалар тойы", desc: "Шапшаң, қуанышты", gradient: "from-yellow-100 via-orange-50 to-pink-100", accent: "#f97316", textColor: "#7c2d12", dark: false },
] as const;

export const CATEGORIES = [
  { id: "all", label: "Барлығы" },
  { id: "wedding", label: "Үйлену той" },
  { id: "uzatu", label: "Қыз ұзату" },
  { id: "birthday", label: "Туған күн" },
  { id: "kids", label: "Сүндет той" },
  { id: "corporate", label: "Корпоратив" },
  { id: "minimal", label: "Минимал" },
  { id: "premium", label: "Премиум" },
] as const;

export const TEMPLATES = [
  {
    id: "uzatu_premium",
    name: "Ұзату Premium",
    description: "Нәзік, романтикалық",
    categories: ["uzatu", "all", "premium"],
    gradient: "from-pink-100 via-rose-50 to-fuchsia-100",
    accent: "#ec4899",
    textColor: "#831843",
    dark: false,
    emoji: "🌸",
  },
  {
    id: "wedding_classic",
    name: "Үйлену Classic",
    description: "Классикалық, нәзік",
    categories: ["wedding", "all"],
    gradient: "from-rose-50 via-pink-50 to-rose-100",
    accent: "#f43f5e",
    textColor: "#4c0519",
    dark: false,
    emoji: "💍",
  },
  {
    id: "luxury_gold",
    name: "Luxury Gold",
    description: "Сәнді, алтын",
    categories: ["wedding", "uzatu", "all", "premium"],
    gradient: "from-amber-50 via-yellow-50 to-amber-100",
    accent: "#d97706",
    textColor: "#451a03",
    dark: false,
    emoji: "✨",
  },
  {
    id: "minimal_white",
    name: "Minimal White",
    description: "Таза, минималист",
    categories: ["all", "minimal", "corporate"],
    gradient: "from-gray-50 via-white to-gray-100",
    accent: "#374151",
    textColor: "#111827",
    dark: false,
    emoji: "⬜",
  },
  {
    id: "kazakh_ornament",
    name: "Қазақ үлгісі",
    description: "Ұлттық, ерекше",
    categories: ["wedding", "uzatu", "all"],
    gradient: "from-red-700 via-amber-600 to-red-800",
    accent: "#fbbf24",
    textColor: "#fef3c7",
    dark: true,
    emoji: "🏵️",
  },
  {
    id: "modern_dark",
    name: "Modern Dark",
    description: "Элегантты, салтанатты",
    categories: ["all", "minimal", "corporate", "premium"],
    gradient: "from-slate-900 via-blue-950 to-slate-800",
    accent: "#60a5fa",
    textColor: "#eff6ff",
    dark: true,
    emoji: "🌙",
  },
  {
    id: "kids_birthday",
    name: "Балалар тойы",
    description: "Шапшаң, қуанышты",
    categories: ["birthday", "kids", "all"],
    gradient: "from-yellow-100 via-orange-50 to-pink-100",
    accent: "#f97316",
    textColor: "#7c2d12",
    dark: false,
    emoji: "🎂",
  },
  {
    id: "corporate_clean",
    name: "Corporate Clean",
    description: "Кәсіби, таза",
    categories: ["corporate", "all", "minimal"],
    gradient: "from-blue-50 via-indigo-50 to-blue-100",
    accent: "#3b82f6",
    textColor: "#1e3a8a",
    dark: false,
    emoji: "🏢",
  },
] as const;

export const BLOCKS_CONFIG = [
  { id: "hero", nameKk: "Басты бөлім", icon: "🎉", description: "Аттар мен іс-шара атауы" },
  { id: "date", nameKk: "Күн мен уақыт", icon: "📅", description: "Іс-шара күні мен уақыты" },
  { id: "countdown", nameKk: "Кері санақ", icon: "⏱️", description: "Іс-шараға дейінгі санақ" },
  { id: "invitation_text", nameKk: "Шақыру мәтіні", icon: "✉️", description: "Жеке шақыру хаты" },
  { id: "program", nameKk: "Бағдарлама", icon: "📋", description: "Іс-шара бағдарламасы" },
  { id: "gallery", nameKk: "Галерея", icon: "🖼️", description: "Фото галерея" },
  { id: "map", nameKk: "Карта", icon: "📍", description: "Орынның картасы" },
  { id: "rsvp", nameKk: "RSVP", icon: "✅", description: "Қатысуды растау" },
  { id: "whatsapp", nameKk: "WhatsApp", icon: "💬", description: "WhatsApp байланысы" },
] as const;

// Legacy blocks kept for backward compat
export const BLOCKS = [
  { id: "countdown", nameKk: "Кері санақ", icon: "⏱️" },
  { id: "map", nameKk: "Карта", icon: "📍" },
  { id: "music", nameKk: "Музыка", icon: "🎵" },
  { id: "gallery", nameKk: "Галерея", icon: "🖼️" },
  { id: "program", nameKk: "Бағдарлама", icon: "📋" },
  { id: "dress_code", nameKk: "Dress code", icon: "👗" },
] as const;

export const DEFAULT_BLOCKS = ["hero", "date", "rsvp"];

export type EventTypeValue = (typeof EVENT_TYPES)[number]["value"];
export type ThemeId = (typeof THEMES)[number]["id"];
export type TemplateId = (typeof TEMPLATES)[number]["id"];
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type BlockId = (typeof BLOCKS)[number]["id"];

export const createInviteSchema = z.object({
  template: z.string().min(1, "Шаблонды таңдаңыз"),
  eventType: z.enum([
    "WEDDING",
    "BIRTHDAY",
    "BABY_SHOWER",
    "ENGAGEMENT",
    "ANNIVERSARY",
    "CORPORATE",
  ]),
  title: z.string().max(100).optional(),
  groomName: z.string().min(1, "Атыңызды енгізіңіз").max(50),
  brideName: z.string().max(50).optional(),
  date: z.string().min(1, "Күнді таңдаңыз"),
  time: z.string().min(1, "Уақытты таңдаңыз"),
  location: z.string().min(1, "Орнын енгізіңіз").max(200),
  mapLink: z.string().url("Жарамды URL енгізіңіз").optional().or(z.literal("")),
  whatsapp: z.string().max(20).optional(),
  invitationText: z.string().max(800).optional(),
  enabledBlocks: z.array(z.string()).optional(),
});

export type CreateInviteFormData = z.infer<typeof createInviteSchema>;

export const STEP_FIELDS: Record<number, (keyof CreateInviteFormData)[]> = {
  0: ["template"],
  1: ["groomName", "date", "time", "location"],
  2: [],
  3: [],
};

export const STEPS = [
  { label: "Шаблон" },
  { label: "Мәлімет" },
  { label: "Блоктар" },
  { label: "Алдын ала" },
];
