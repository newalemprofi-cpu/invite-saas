"use server";

import { db } from "@/lib/db";
import { createInviteSchema, type CreateInviteFormData } from "@/types/invite";
import { getPlan } from "@/lib/payment/plans";
import { generateInviteSlug } from "@/lib/slug";
import { getSession } from "@/lib/auth";

type ActionResult =
  | { error: string; inviteId?: never }
  | { inviteId: string; error?: never };

function logError(label: string, err: unknown) {
  if (err instanceof Error) {
    console.error(`[${label}] ${err.message}`, err.stack ?? "");
  } else {
    try {
      console.error(`[${label}]`, JSON.stringify(err, null, 2));
    } catch {
      console.error(`[${label}]`, String(err));
    }
  }
  // Log Prisma error code when available
  const code = (err as { code?: string })?.code;
  if (code) console.error(`[${label}] Prisma code: ${code}`);
}

export async function createInviteAction(
  raw: CreateInviteFormData
): Promise<ActionResult> {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  let session;
  try {
    session = await getSession();
  } catch (err) {
    logError("createInviteAction:getSession", err);
    return { error: "Аутентификация қатесі. Қайта кіріп көріңіз." };
  }

  if (!session?.userId) {
    return { error: "Жасау үшін жүйеге кіруіңіз қажет" };
  }

  // ── 2. Validate form data ──────────────────────────────────────────────────
  const parsed = createInviteSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(", ");
    console.error("[createInviteAction:validation]", issues);
    return { error: `Деректер дұрыс емес: ${issues}` };
  }

  const data = parsed.data;

  // ── 3. Plan ────────────────────────────────────────────────────────────────
  const plan = getPlan(data.plan ?? "BASIC");
  const expiresAt = new Date(Date.now() + plan.days * 24 * 60 * 60 * 1000);

  // ── 4. Verify user row exists ──────────────────────────────────────────────
  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true },
    });
    if (!user) {
      console.error("[createInviteAction:user] not found:", session.userId);
      return { error: "Пайдаланушы табылмады. Қайта кіріп көріңіз." };
    }
  } catch (err) {
    logError("createInviteAction:userCheck", err);
    return { error: "Деректер қоры қатесі. Қайталап көріңіз." };
  }

  // ── 5. Generate unique slug ────────────────────────────────────────────────
  let slug: string;
  try {
    slug = generateInviteSlug(data.person1, data.person2);
    for (let i = 0; i < 5; i++) {
      const existing = await db.invite.findUnique({ where: { slug } });
      if (!existing) break;
      slug = generateInviteSlug(data.person1, data.person2);
      if (i === 4) {
        return { error: "Бірегей сілтеме жасау мүмкін болмады. Қайталаңыз." };
      }
    }
  } catch (err) {
    logError("createInviteAction:slug", err);
    return { error: "Деректер қоры қатесі. Қайталап көріңіз." };
  }

  // ── 6. Create invite ───────────────────────────────────────────────────────
  try {
    const title =
      data.title?.trim() ||
      (data.person2
        ? `${data.person1} & ${data.person2}`
        : data.person1) ||
      "Шақыру";

    const invite = await db.invite.create({
      data: {
        slug,
        title,
        status: "DRAFT",
        userId: session.userId,
        expiresAt,
        data: {
          plan: data.plan,
          eventType: data.eventType,
          person1: data.person1.trim(),
          person2: data.person2?.trim() ?? null,
          date: data.date,
          time: data.time,
          locationName: data.locationName.trim(),
          mapUrl: data.mapUrl?.trim() || null,
          theme: data.theme,
          message: data.message?.trim() ?? null,
        },
      },
      select: { id: true },
    });

    console.log("[createInviteAction] created:", invite.id, "user:", session.userId);
    return { inviteId: invite.id };
  } catch (err) {
    logError("createInviteAction:create", err);
    return { error: "Шақыру сақталмады. Деректер қоры қатесі." };
  }
}
