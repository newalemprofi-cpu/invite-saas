"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { resolveLang, type Lang } from "@/lib/i18n";
import { safeRedirectTarget } from "@/lib/auth-redirect";

const MESSAGES = {
  kk: {
    email: "Жарамды email енгізіңіз",
    password: "Парольді енгізіңіз",
    passwordMin: "Пароль кем дегенде 8 таңбадан тұруы керек",
    name: "Атыңызды енгізіңіз",
    invalid: "Деректер дұрыс емес",
    badCredentials: "Қате email немесе пароль",
    emailTaken: "Бұл email тіркелген",
  },
  ru: {
    email: "Введите корректный email",
    password: "Введите пароль",
    passwordMin: "Пароль должен содержать минимум 8 символов",
    name: "Введите ваше имя",
    invalid: "Данные указаны неверно",
    badCredentials: "Неверный email или пароль",
    emailTaken: "Этот email уже зарегистрирован",
  },
} as const;

function schemas(lang: Lang) {
  const m = MESSAGES[lang];
  return {
    login: z.object({
      email: z.string().email(m.email),
      password: z.string().min(1, m.password),
    }),
    register: z.object({
      name: z.string().min(1, m.name).max(100),
      email: z.string().email(m.email),
      phone: z.string().optional(),
      password: z.string().min(8, m.passwordMin),
    }),
  };
}

export async function loginAction(
  raw: unknown,
  from?: string,
  langInput?: string
): Promise<{ error: string } | void> {
  const lang = resolveLang(langInput);
  const m = MESSAGES[lang];
  const parsed = schemas(lang).login.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? m.invalid };

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  // Constant-time: always verify even if user missing (prevents timing attack)
  const hash = user?.passwordHash ?? "$2b$12$invalidhashinvalidhashinvalidhashx";
  const valid = await verifyPassword(password, hash);

  if (!user || !user.passwordHash || !valid) return { error: m.badCredentials };

  await createSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  redirect(safeRedirectTarget(from));
}

export async function registerAction(
  raw: unknown,
  from?: string,
  langInput?: string
): Promise<{ error: string } | void> {
  const lang = resolveLang(langInput);
  const m = MESSAGES[lang];
  const parsed = schemas(lang).register.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? m.invalid };

  const { name, email, phone, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: m.emailTaken };

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { name, email, phone: phone ?? null, passwordHash, role: "USER" },
  });

  await createSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  redirect(safeRedirectTarget(from));
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/auth/login");
}
