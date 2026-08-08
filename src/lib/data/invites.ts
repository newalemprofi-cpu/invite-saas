import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getTemplate } from "@/lib/templates";
import { getDbTemplate } from "@/lib/db-templates";
import { getProductSettings } from "@/lib/product";
import { generateInviteSlug } from "@/lib/slug";
import { extractKeyFromPublicUrl, moveFile, statFile } from "@/lib/storage";

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

async function generateUniqueSlug(name1: string, name2?: string | null): Promise<string> {
  let slug = generateInviteSlug(name1, name2 ?? undefined);
  for (let i = 0; i < 6; i++) {
    const hit = await db.invite.findUnique({ where: { slug } });
    if (!hit) return slug;
    if (i === 5) throw new Error("Unable to generate a unique slug");
    slug = generateInviteSlug(name1, name2 ?? undefined);
  }
  return slug;
}

/**
 * Creates a fresh DRAFT invite pre-filled from a template's demo data.
 * Used by the (legacy) quick-create API route. The primary customer flow
 * now goes through the anonymous constructor + claimAnonymousInvite below.
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

  const slug = await generateUniqueSlug(tmpl.demoName1, tmpl.demoName2);
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

interface ClaimInput {
  userId: string;
  draftToken: string;
  templateSlug: string;
  data: Record<string, unknown>;
}

interface ClaimResult {
  id: string;
  created: boolean;
  forbidden?: boolean;
}

// Fields in the editor's JSON blob that may point at an anonymous temp upload.
const TEMP_IMAGE_FIELDS = ["bgImageUrl"] as const;
const TEMP_AUDIO_FIELDS = ["musicUrl"] as const;

/**
 * Attaches an anonymous, pre-account draft to an authenticated user: creates
 * the real Invite (or returns the existing one if this draftToken was
 * already claimed — see the unique constraint on sourceDraftToken), then
 * moves any temp/<draftToken>/... uploads into the invite's own namespace.
 */
export async function claimAnonymousInvite(input: ClaimInput): Promise<ClaimResult> {
  const existing = await db.invite.findUnique({ where: { sourceDraftToken: input.draftToken } });
  if (existing) {
    if (existing.userId !== input.userId) return { id: existing.id, created: false, forbidden: true };
    return { id: existing.id, created: false };
  }

  const tmpl = (await getDbTemplate(input.templateSlug)) ?? getTemplate(input.templateSlug);
  if (!tmpl) throw new TemplateNotFoundError(input.templateSlug);

  const rawData = { ...input.data };
  const groomName = (typeof rawData.groomName === "string" && rawData.groomName) || tmpl.demoName1;
  const brideName = (typeof rawData.brideName === "string" && rawData.brideName) || tmpl.demoName2 || undefined;

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

  const slug = await generateUniqueSlug(groomName, brideName);
  const expiresAt = new Date(Date.now() + activeDays * 24 * 60 * 60 * 1000);

  let invite: { id: string };
  try {
    invite = await db.invite.create({
      data: {
        slug,
        title: brideName ? `${groomName} & ${brideName}` : groomName,
        status: "DRAFT",
        userId: input.userId,
        expiresAt,
        sourceDraftToken: input.draftToken,
        data: {
          ...rawData,
          templateSlug: tmpl.slug,
          priceSnapshot: price,
          activeDaysSnapshot: activeDays,
          productKey,
        },
      },
      select: { id: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Lost a create race against a duplicate/parallel claim of the same
      // draft — replay idempotently instead of erroring or duplicating.
      const race = await db.invite.findUnique({ where: { sourceDraftToken: input.draftToken } });
      if (race) {
        if (race.userId !== input.userId) return { id: race.id, created: false, forbidden: true };
        return { id: race.id, created: false };
      }
    }
    throw err;
  }

  await claimTempMedia(input.draftToken, invite.id, rawData);

  return { id: invite.id, created: true };
}

/**
 * Outcome of trying to claim one media reference:
 *  - "external": not one of our own temp uploads (e.g. empty, or already a
 *    permanent URL) — leave the field exactly as the client sent it.
 *  - "moved": successfully relocated into the invite's namespace.
 *  - "expired": was a temp upload for this draftToken, but the object is
 *    gone (cleanup worker already deleted it, or it never finished
 *    uploading) — the reference must be dropped, not silently kept broken.
 */
type ClaimMediaOutcome = { status: "external" } | { status: "moved"; url: string } | { status: "expired" };

async function claimTempMedia(draftToken: string, inviteId: string, data: Record<string, unknown>): Promise<void> {
  const updates: Record<string, unknown> = {};

  for (const field of TEMP_IMAGE_FIELDS) {
    const url = data[field];
    if (typeof url === "string" && url) {
      const outcome = await tryClaimOne(draftToken, inviteId, "image", url);
      if (outcome.status === "moved") updates[field] = outcome.url;
      else if (outcome.status === "expired") updates[field] = "";
    }
  }
  for (const field of TEMP_AUDIO_FIELDS) {
    const url = data[field];
    if (typeof url === "string" && url) {
      const outcome = await tryClaimOne(draftToken, inviteId, "audio", url);
      if (outcome.status === "moved") updates[field] = outcome.url;
      else if (outcome.status === "expired") updates[field] = "";
    }
  }

  const galleryUrls = Array.isArray(data.galleryUrls) ? (data.galleryUrls as unknown[]) : [];
  if (galleryUrls.length > 0) {
    const outcomes = await Promise.all(
      galleryUrls.map((u) =>
        typeof u === "string" && u
          ? tryClaimOne(draftToken, inviteId, "image", u)
          : ({ status: "external" } as ClaimMediaOutcome)
      )
    );
    const anyChange = outcomes.some((o) => o.status !== "external");
    if (anyChange) {
      // Moved URLs get rewritten; expired ones are dropped from the array
      // entirely (an empty string in a gallery makes no sense); everything
      // else (non-temp URLs) passes through untouched.
      updates.galleryUrls = galleryUrls
        .map((u, i) => {
          const outcome = outcomes[i];
          if (outcome.status === "moved") return outcome.url;
          if (outcome.status === "expired") return null;
          return u;
        })
        .filter((u): u is string => typeof u === "string");
    }
  }

  if (Object.keys(updates).length === 0) return;

  const invite = await db.invite.findUnique({ where: { id: inviteId }, select: { data: true } });
  const merged = { ...((invite?.data as Record<string, unknown>) ?? {}), ...updates };
  await db.invite.update({ where: { id: inviteId }, data: { data: merged as Prisma.InputJsonValue } });
}

/**
 * Moves a single temp upload into the invite's namespace. Only ever touches
 * objects under temp/<draftToken>/ — the caller only knows its own random
 * draftToken, so this can't be used to claim another user's media. Never
 * throws: a missing/expired source object (already swept by the cleanup
 * worker) is a normal, expected outcome, not a claim failure.
 */
async function tryClaimOne(
  draftToken: string,
  inviteId: string,
  kind: "image" | "audio",
  url: string
): Promise<ClaimMediaOutcome> {
  const key = extractKeyFromPublicUrl(url);
  if (!key || !key.startsWith(`temp/${draftToken}/`)) return { status: "external" };

  const filename = key.split("/").pop();
  if (!filename) return { status: "expired" };
  const newKey = `invites/${inviteId}/${kind}/${filename}`;

  try {
    const newUrl = await moveFile(key, newKey);
    const stat = await statFile(newKey);
    const ext = filename.split(".").pop() ?? "bin";
    await db.media.create({
      data: {
        type: kind === "image" ? "IMAGE" : "AUDIO",
        url: newUrl,
        key: newKey,
        mimeType: stat?.contentType ?? (kind === "image" ? `image/${ext}` : `audio/${ext}`),
        size: stat?.size ?? 0,
        inviteId,
      },
    });
    return { status: "moved", url: newUrl };
  } catch (err) {
    // Most commonly: the object no longer exists (expired and cleaned up,
    // or the upload was abandoned mid-draft). Log without the draftToken
    // or full URL — kind + inviteId is enough to investigate safely.
    console.warn("[claim] anonymous upload missing or expired, dropping reference", {
      kind,
      inviteId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: "expired" };
  }
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
