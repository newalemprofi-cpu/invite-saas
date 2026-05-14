"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function togglePublishAction(
  inviteId: string,
  publish: boolean
): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") throw new Error("Forbidden");

  const invite = await db.invite.findUnique({
    where: { id: inviteId },
    select: { id: true, status: true, title: true, expiresAt: true },
  });
  if (!invite) throw new Error("Not found");

  const now = new Date();
  // Ensure admin-published invites get at least 30 days, regardless of creation-time expiresAt
  const minExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const newExpiresAt =
    !invite.expiresAt || invite.expiresAt < minExpiry ? minExpiry : invite.expiresAt;

  await db.$transaction(async (tx) => {
    await tx.invite.update({
      where: { id: inviteId },
      data: publish
        ? { status: "PUBLISHED", publishedAt: now, expiresAt: newExpiresAt }
        : { status: "DRAFT" },
    });

    await tx.auditLog.create({
      data: {
        action: publish ? "ADMIN_INVITE_PUBLISHED" : "ADMIN_INVITE_UNPUBLISHED",
        entity: "Invite",
        entityId: inviteId,
        userId: session.userId,
        meta: { adminEmail: session.email, title: invite.title },
      },
    });
  });

  revalidatePath("/admin");
}
