"use server";

import { db } from "@/lib/db";
import { createInviteSchema, type CreateInviteFormData } from "@/types/invite";
import { getProductSettings } from "@/lib/product";
import { generateInviteSlug } from "@/lib/slug";
import { getSession } from "@/lib/auth";

export type CreateInviteResult =
  | { ok: true; inviteId: string }
  | { ok: false; error: string };

function logErr(label: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as Record<string, unknown>)?.code ?? "";
  console.error(`CREATE_INVITE_ERROR [${label}]`, msg, code ? `(code:${code})` : "");
}

export async function createInviteAction(
  raw: CreateInviteFormData
): Promise<CreateInviteResult> {
  try {
    return await _createInvite(raw);
  } catch (err) {
    logErr("uncaught", err);
    return { ok: false, error: "Күтпеген қате орын алды. Қайталап көріңіз." };
  }
}

async function _createInvite(raw: CreateInviteFormData): Promise<CreateInviteResult> {
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

  const parsed = createInviteSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, error: `Деректер дұрыс емес: ${msg}` };
  }
  const data = parsed.data;

  let activeDays = 30;
  let price = 4990;
  let productKey = "INVITE";
  try {
    const product = await getProductSettings();
    activeDays = product.activeDays;
    price = product.price;
    productKey = product.productKey;
  } catch (err) {
    logErr("getProductSettings", err);
  }

  const expiresAt = new Date(Date.now() + activeDays * 24 * 60 * 60 * 1000);

  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true },
    });
    if (!user) {
      return { ok: false, error: "Пайдаланушы табылмады. Қайта кіріп көріңіз." };
    }
  } catch (err) {
    logErr("userCheck", err);
    return { ok: false, error: "Деректер қоры қатесі (user). Қайталап көріңіз." };
  }

  let slug: string;
  try {
    slug = generateInviteSlug(data.groomName, data.brideName);
    for (let i = 0; i < 6; i++) {
      const hit = await db.invite.findUnique({ where: { slug } });
      if (!hit) break;
      if (i === 5) {
        return { ok: false, error: "Бірегей сілтеме жасау мүмкін болмады. Қайталаңыз." };
      }
      slug = generateInviteSlug(data.groomName, data.brideName);
    }
  } catch (err) {
    logErr("slug", err);
    return { ok: false, error: "Деректер қоры қатесі (slug). Қайталап көріңіз." };
  }

  const title =
    data.title?.trim() ||
    (data.brideName?.trim()
      ? `${data.groomName.trim()} & ${data.brideName.trim()}`
      : data.groomName.trim()) ||
    "Шақыру";

  try {
    const invite = await db.invite.create({
      data: {
        slug,
        title,
        status: "DRAFT",
        userId: session.userId,
        expiresAt,
        data: {
          template: data.template,
          eventType: data.eventType,
          groomName: data.groomName.trim(),
          brideName: data.brideName?.trim() || null,
          date: data.date,
          time: data.time,
          location: data.location.trim(),
          mapLink: data.mapLink?.trim() || null,
          whatsapp: data.whatsapp?.trim() || null,
          invitationText: data.invitationText?.trim() || null,
          enabledBlocks: data.enabledBlocks ?? [],
          priceSnapshot: price,
          activeDaysSnapshot: activeDays,
          productKey,
        },
      },
      select: { id: true },
    });

    return { ok: true, inviteId: invite.id };
  } catch (err) {
    logErr("db.create", err);
    return { ok: false, error: "Шақыру сақталмады. Деректер қоры қатесі." };
  }
}
