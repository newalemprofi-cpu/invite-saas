"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createInviteSchema, type CreateInviteFormData } from "@/types/invite";
import { generateInviteSlug } from "@/lib/slug";
import { getSession } from "@/lib/auth";

export async function createInviteAction(
  raw: CreateInviteFormData
): Promise<{ error: string } | void> {
  const session = await getSession();
  if (!session) return { error: "Жасау үшін жүйеге кіруіңіз қажет" };

  const parsed = createInviteSchema.safeParse(raw);
  if (!parsed.success)
    return { error: "Деректер дұрыс емес. Барлық өрістерді толтырыңыз." };

  const data = parsed.data;
  let inviteId: string;

  try {
    let slug = generateInviteSlug(data.person1, data.person2);
    let attempts = 0;
    while (await db.invite.findUnique({ where: { slug } })) {
      slug = generateInviteSlug(data.person1, data.person2);
      if (++attempts > 5) throw new Error("Unique slug generation failed.");
    }

    const invite = await db.invite.create({
      data: {
        slug,
        title: data.title,
        status: "DRAFT",
        userId: session.userId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        data: {
          eventType: data.eventType,
          person1: data.person1,
          person2: data.person2 ?? null,
          date: data.date,
          time: data.time,
          locationName: data.locationName,
          mapUrl: data.mapUrl ?? null,
          theme: data.theme,
          message: data.message ?? null,
        },
      },
    });

    inviteId = invite.id;
  } catch (err) {
    console.error("[createInviteAction]", err);
    return { error: "Қате орын алды. Қайталап көріңіз." };
  }

  redirect(`/dashboard/invites/${inviteId}`);
}
