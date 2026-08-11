"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { isEntitled } from "@/lib/entitlements";

// Mirrors src/app/actions/rsvp.ts's rate limiter exactly (in-memory,
// single-instance — same acknowledged limitation, same pattern).
const rateLimitStore = new Map<string, { count: number; firstAt: number }>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const key = `wish:${ip}`;
  const entry = rateLimitStore.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, firstAt: now });
    return false;
  }
  if (entry.count >= MAX_REQUESTS) return true;
  entry.count++;
  return false;
}

const wishSchema = z.object({
  name: z.string().min(1, "Атыңызды енгізіңіз").max(100),
  message: z.string().min(1, "Тілегіңізді жазыңыз").max(500),
});

export type SubmitWishResult = { success: true } | { error: string };

/**
 * Guest-submitted wish (the WISHES paid add-on, §15/§18) — distinct from
 * Invite.data.wishesText (the owner's own static message, unrelated).
 * Server-side re-verification, never trusting the client: invite must be
 * PUBLISHED (not expired) AND actually entitled to "wishes" — the public
 * page only renders the form when both are true, but a direct POST to this
 * action must be re-checked independently regardless of what the UI showed.
 */
export async function submitWish(inviteId: string, raw: unknown): Promise<SubmitWishResult> {
  const store = await headers();
  const ip =
    store.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    store.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return { error: "Тым көп сұраныс. Кейінірек қайталаңыз." };
  }

  const parsed = wishSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };
  }

  const invite = await db.invite.findUnique({
    where: { id: inviteId },
    select: { status: true, expiresAt: true, data: true },
  });
  if (!invite || invite.status !== "PUBLISHED") {
    return { error: "Шақыру белсенді емес" };
  }
  if (invite.expiresAt !== null && invite.expiresAt < new Date()) {
    return { error: "Шақырудың мерзімі аяқталды" };
  }
  if (!isEntitled(invite.data, "wishes")) {
    return { error: "Бұл мүмкіндік қосылмаған" };
  }

  await db.wish.create({
    data: { inviteId, name: parsed.data.name, message: parsed.data.message },
  });

  return { success: true };
}
