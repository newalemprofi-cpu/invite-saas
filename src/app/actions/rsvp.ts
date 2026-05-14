"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";

// ─── Rate limiter ────────────────────────────────────────────────────────────
// In-memory: works for single-instance. Replace with Redis for multi-instance.
const rateLimitStore = new Map<string, { count: number; firstAt: number }>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const key = `rsvp:${ip}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.firstAt > WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, firstAt: now });
    return false;
  }
  if (entry.count >= MAX_REQUESTS) return true;
  entry.count++;
  return false;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const rsvpSchema = z.object({
  name: z.string().min(1, "Атыңызды енгізіңіз").max(100),
  phone: z
    .string()
    .max(20)
    .optional()
    .transform((v) => v?.trim() || undefined),
  status: z.enum(["COMING", "NOT_COMING", "MAYBE"]),
  peopleCount: z.coerce.number().int().min(1).max(20),
  comment: z.string().max(500).optional(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type RSVPResult =
  | { success: true }
  | { duplicate: true }
  | { error: string };

// ─── Action ──────────────────────────────────────────────────────────────────

export async function submitRSVP(
  inviteId: string,
  raw: unknown
): Promise<RSVPResult> {
  // Rate limit by IP
  const store = await headers();
  const ip =
    store.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    store.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return { error: "Тым көп сұраныс. Кейінірек қайталаңыз." };
  }

  // Validate input
  const parsed = rsvpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };
  }
  const data = parsed.data;

  // Re-verify invite is still published and not expired (don't trust client state)
  const invite = await db.invite.findUnique({
    where: { id: inviteId },
    select: { status: true, expiresAt: true },
  });
  if (!invite || invite.status !== "PUBLISHED") {
    return { error: "Шақыру белсенді емес" };
  }
  if (invite.expiresAt !== null && invite.expiresAt < new Date()) {
    return { error: "Шақырудың мерзімі аяқталды" };
  }

  // Duplicate check — only when phone provided
  if (data.phone) {
    const existing = await db.guest.findFirst({
      where: { inviteId, phone: data.phone },
      select: { id: true },
    });
    if (existing) return { duplicate: true };
  }

  await db.guest.create({
    data: {
      inviteId,
      name: data.name,
      phone: data.phone ?? null,
      status: data.status,
      peopleCount: data.peopleCount,
      note: data.comment ?? null,
    },
  });

  return { success: true };
}
