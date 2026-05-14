import { z } from "zod";
export { PLANS, type PlanId } from "@/lib/payment/plans";

export const EVENT_TYPES = [
  { value: "WEDDING" as const, label: "Үйлену той", emoji: "💍", dualName: true },
  { value: "BIRTHDAY" as const, label: "Туылған күн", emoji: "🎂", dualName: false },
  { value: "BABY_SHOWER" as const, label: "Нәресте тойы", emoji: "👶", dualName: false },
  { value: "ENGAGEMENT" as const, label: "Қалыңдық той", emoji: "💒", dualName: true },
  { value: "ANNIVERSARY" as const, label: "Мерейтой", emoji: "🥂", dualName: true },
  { value: "CORPORATE" as const, label: "Корпоратив", emoji: "🏢", dualName: false },
] as const;

export const THEMES = [
  {
    id: "ROSE_GOLD" as const,
    name: "Rose Gold",
    desc: "Романтикалық, нәзік",
    gradient: "from-rose-50 via-pink-50 to-rose-100",
    accent: "#f43f5e",
    textColor: "#4c0519",
    dark: false,
  },
  {
    id: "MIDNIGHT" as const,
    name: "Midnight Blue",
    desc: "Элегантты, салтанатты",
    gradient: "from-slate-900 via-blue-950 to-slate-800",
    accent: "#60a5fa",
    textColor: "#eff6ff",
    dark: true,
  },
  {
    id: "EMERALD" as const,
    name: "Emerald Garden",
    desc: "Табиғи, жаңа",
    gradient: "from-emerald-50 via-green-50 to-teal-100",
    accent: "#10b981",
    textColor: "#064e3b",
    dark: false,
  },
  {
    id: "IVORY" as const,
    name: "Ivory Classic",
    desc: "Классикалық, мәртебелі",
    gradient: "from-amber-50 via-yellow-50 to-amber-100",
    accent: "#d97706",
    textColor: "#451a03",
    dark: false,
  },
  {
    id: "KAZAKH" as const,
    name: "Kazakh Heritage",
    desc: "Ұлттық, ерекше",
    gradient: "from-red-700 via-amber-600 to-red-800",
    accent: "#fbbf24",
    textColor: "#fef3c7",
    dark: true,
  },
  {
    id: "PINK_UZATU" as const,
    name: "Ұзату",
    desc: "Нәзік, романтикалық",
    gradient: "from-pink-100 via-rose-50 to-fuchsia-100",
    accent: "#ec4899",
    textColor: "#831843",
    dark: false,
  },
  {
    id: "KIDS_BIRTHDAY" as const,
    name: "Балалар тойы",
    desc: "Шапшаң, қуанышты",
    gradient: "from-yellow-100 via-orange-50 to-pink-100",
    accent: "#f97316",
    textColor: "#7c2d12",
    dark: false,
  },
] as const;

export type EventTypeValue = (typeof EVENT_TYPES)[number]["value"];
export type ThemeId = (typeof THEMES)[number]["id"];

export const createInviteSchema = z.object({
  plan: z.enum(["BASIC", "STANDARD", "PREMIUM"], {
    message: "Жоспарды таңдаңыз",
  }),
  eventType: z.enum([
    "WEDDING",
    "BIRTHDAY",
    "BABY_SHOWER",
    "ENGAGEMENT",
    "ANNIVERSARY",
    "CORPORATE",
  ]),
  person1: z.string().min(1, "Атыңызды енгізіңіз").max(50),
  person2: z.string().max(50).optional(),
  title: z.string().min(2, "Тақырып міндетті").max(100),
  date: z.string().min(1, "Күнді таңдаңыз"),
  time: z.string().min(1, "Уақытты таңдаңыз"),
  locationName: z.string().min(1, "Орнын енгізіңіз").max(200),
  mapUrl: z
    .string()
    .url("Жарамды URL енгізіңіз")
    .optional()
    .or(z.literal("")),
  theme: z.enum([
    "ROSE_GOLD",
    "MIDNIGHT",
    "EMERALD",
    "IVORY",
    "KAZAKH",
    "PINK_UZATU",
    "KIDS_BIRTHDAY",
  ]),
  message: z.string().max(500).optional(),
});

export type CreateInviteFormData = z.infer<typeof createInviteSchema>;

export const STEP_FIELDS: Record<number, (keyof CreateInviteFormData)[]> = {
  0: ["plan"],
  1: ["eventType"],
  2: ["person1", "title"],
  3: ["date", "time"],
  4: ["locationName"],
  5: ["theme"],
  6: [],
  7: [],
};

export const STEPS = [
  { label: "Жоспар" },
  { label: "Іс-шара" },
  { label: "Есімдер" },
  { label: "Уақыт" },
  { label: "Орны" },
  { label: "Тема" },
  { label: "Алдын ала" },
  { label: "Төлем" },
];
