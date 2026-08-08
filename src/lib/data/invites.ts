import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getTemplate } from "@/lib/templates";
import { getProductSettings } from "@/lib/product";
import { generateInviteSlug } from "@/lib/slug";

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

export class TemplateNotFoundError extends Error {}

/**
 * Creates a fresh DRAFT invite pre-filled from a template's demo data.
 * Shared by the quick-create API route and the /invitations/new flow so
 * the unique-slug retry logic lives in exactly one place.
 */
export async function createInviteFromTemplate(userId: string, templateSlug: string) {
  const tmpl = getTemplate(templateSlug);
  if (!tmpl) throw new TemplateNotFoundError(templateSlug);

  let activeDays = 90;
  const price = tmpl.price;
  let productKey = "INVITE";
  try {
    const product = await getProductSettings();
    activeDays = product.activeDays;
    productKey = product.productKey;
  } catch {
    // use defaults
  }

  let slug = generateInviteSlug(tmpl.demoName1, tmpl.demoName2);
  for (let i = 0; i < 6; i++) {
    const hit = await db.invite.findUnique({ where: { slug } });
    if (!hit) break;
    if (i === 5) throw new Error("Unable to generate a unique slug");
    slug = generateInviteSlug(tmpl.demoName1, tmpl.demoName2);
  }

  const expiresAt = new Date(Date.now() + activeDays * 24 * 60 * 60 * 1000);

  return db.invite.create({
    data: {
      slug,
      title: tmpl.demoName2 ? `${tmpl.demoName1} & ${tmpl.demoName2}` : tmpl.demoName1,
      status: "DRAFT",
      userId,
      expiresAt,
      data: {
        templateSlug: tmpl.slug,
        groomName: tmpl.demoName1,
        brideName: tmpl.demoName2 ?? null,
        date: "",
        time: "",
        location: "",
        mapLink: null,
        whatsapp: null,
        invitationText: null,
        enabledBlocks: ["hero", "date", "countdown", "rsvp"],
        priceSnapshot: price,
        activeDaysSnapshot: activeDays,
        productKey,
      },
    },
    select: { id: true, slug: true },
  });
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
