"use server";

import { db } from "@/lib/db";
import { createInviteSchema, type CreateInviteFormData } from "@/types/invite";
import { getPlan } from "@/lib/payment/plans";
import { generateInviteSlug } from "@/lib/slug";
import { getSession } from "@/lib/auth";

export type CreateInviteResult =
  | { ok: true; inviteId: string }
  | { ok: false; error: string };

function logErr(label: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? (err.stack ?? "") : "";
  const code = (err as Record<string, unknown>)?.code ?? "";
  console.error(`CREATE_INVITE_ERROR [${label}]`, msg, code ? `(code:${code})` : "", stack);
}

export async function createInviteAction(
  raw: CreateInviteFormData,
): Promise<CreateInviteResult> {
  // ─── outer safety net: nothing must ever throw out of a server action ───────
  try {
    return await _createInvite(raw);
  } catch (err) {
    logErr("uncaught", err);
    return { ok: false, error: "Күтпеген қате орын алды. Қайталап көріңіз." };
  }
}

async function _createInvite(raw: CreateInviteFormData): Promise<CreateInviteResult> {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  let session;
  try {
    session = await getSession();
  } catch (err) {
    logErr("getSession", err);
    return { ok: false, error: "Аутентификация қатесі. Қайта кіріп көріңіз." };
  }

  if (!session?.userId) {
    return { ok: false, error: "Жасау үшін жүйеге кіруіңіз қажет" };
  }

  // ── 2. Validate ────────────────────────────────────────────────────────────
  let data: CreateInviteFormData;
  try {
    const parsed = createInviteSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      console.error("CREATE_INVITE_ERROR [validation]", msg);
      return { ok: false, error: `Деректер дұрыс емес: ${msg}` };
    }
    data = parsed.data;
  } catch (err) {
    logErr("safeParse", err);
    return { ok: false, error: "Деректерді тексеру кезінде қате орын алды." };
  }

  // ── 3. Plan ────────────────────────────────────────────────────────────────
  let plan;
  try {
    plan = getPlan(data.plan ?? "BASIC");
  } catch (err) {
    logErr("getPlan", err);
    plan = { days: 30 };
  }
  const expiresAt = new Date(Date.now() + plan.days * 24 * 60 * 60 * 1000);

  // ── 4. Verify user exists in DB ────────────────────────────────────────────
  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true },
    });
    if (!user) {
      console.error("CREATE_INVITE_ERROR [user] not found:", session.userId);
      return { ok: false, error: "Пайдаланушы табылмады. Қайта кіріп көріңіз." };
    }
  } catch (err) {
    logErr("userCheck", err);
    return { ok: false, error: "Деректер қоры қатесі (user). Қайталап көріңіз." };
  }

  // ── 5. Unique slug ─────────────────────────────────────────────────────────
  let slug: string;
  try {
    slug = generateInviteSlug(data.person1, data.person2);
    for (let i = 0; i < 6; i++) {
      const hit = await db.invite.findUnique({ where: { slug } });
      if (!hit) break;
      if (i === 5) {
        return { ok: false, error: "Бірегей сілтеме жасау мүмкін болмады. Қайталаңыз." };
      }
      slug = generateInviteSlug(data.person1, data.person2);
    }
  } catch (err) {
    logErr("slug", err);
    return { ok: false, error: "Деректер қоры қатесі (slug). Қайталап көріңіз." };
  }

  // ── 6. Build safe payload ──────────────────────────────────────────────────
  const title =
    data.title?.trim() ||
    (data.person2?.trim()
      ? `${data.person1.trim()} & ${data.person2.trim()}`
      : data.person1.trim()) ||
    "Шақыру";

  const inviteData = {
    plan: data.plan,
    eventType: data.eventType,
    person1: data.person1.trim(),
    person2: data.person2?.trim() || null,
    date: data.date,
    time: data.time,
    locationName: data.locationName.trim(),
    mapUrl: data.mapUrl?.trim() || null,
    theme: data.theme,
    message: data.message?.trim() || null,
  };

  console.log("CREATE_INVITE payload:", JSON.stringify({
    slug, title, userId: session.userId, plan: data.plan, expiresAt,
  }));

  // ── 7. Insert ──────────────────────────────────────────────────────────────
  try {
    const invite = await db.invite.create({
      data: {
        slug,
        title,
        status: "DRAFT",
        userId: session.userId,
        expiresAt,
        data: inviteData,
      },
      select: { id: true },
    });

    console.log("CREATE_INVITE success:", invite.id, "user:", session.userId);
    return { ok: true, inviteId: invite.id };
  } catch (err) {
    logErr("db.create", err);
    return { ok: false, error: "Шақыру сақталмады. Деректер қоры қатесі." };
  }
}
