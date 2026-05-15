import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

async function _listQuery(where: Prisma.InviteWhereInput) {
  return db.invite.findMany({
    where,
    include: { _count: { select: { guests: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

async function _detailQuery(where: Prisma.InviteWhereUniqueInput) {
  return db.invite.findUnique({
    where,
    include: { _count: { select: { guests: true } } },
  });
}

export type InviteWithCount = Awaited<ReturnType<typeof _listQuery>>[0];
export type InviteDetail = NonNullable<Awaited<ReturnType<typeof _detailQuery>>>;

export function listInvites(userId: string) {
  return _listQuery({ userId });
}

export async function getInvite(
  id: string,
  userId: string,
  role: "USER" | "ADMIN"
): Promise<InviteDetail | null> {
  const invite = await _detailQuery({ id });
  if (!invite) return null;
  if (role !== "ADMIN" && invite.userId !== userId) return null;
  return invite;
}
