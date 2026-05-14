"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

const loginSchema = z.object({
  email: z.string().email("Жарамды email енгізіңіз"),
  password: z.string().min(1, "Парольді енгізіңіз"),
});

const registerSchema = z.object({
  name: z.string().min(1, "Атыңызды енгізіңіз").max(100),
  email: z.string().email("Жарамды email енгізіңіз"),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, "Пароль кем дегенде 8 таңбадан тұруы керек"),
});

export async function loginAction(
  raw: unknown
): Promise<{ error: string } | void> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  // Constant-time: always verify even if user missing (prevents timing attack)
  const hash = user?.passwordHash ?? "$2b$12$invalidhashinvalidhashinvalidhashx";
  const valid = await verifyPassword(password, hash);

  if (!user || !user.passwordHash || !valid)
    return { error: "Қате email немесе пароль" };

  await createSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  redirect("/dashboard");
}

export async function registerAction(
  raw: unknown
): Promise<{ error: string } | void> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };

  const { name, email, phone, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Бұл email тіркелген" };

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

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/auth/login");
}
