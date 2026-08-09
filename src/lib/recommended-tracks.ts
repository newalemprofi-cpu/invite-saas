/**
 * Admin-curated "recommended songs" catalog for the constructor's Media
 * tab. Every row is backed by a real, admin-uploaded audio object under
 * `music/recommended/<file>` in the same private MinIO bucket everything
 * else uses — never a title-only placeholder. See prisma/schema.prisma's
 * RecommendedTrack model and /admin/music for the management UI.
 */
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { uploadFile, deleteFile, getPublicUrl } from "@/lib/storage";
import { validateUpload } from "@/lib/media-validation";

export interface PlayableTrack {
  id: string;
  title: string;
  artist: string | null;
  url: string;
  duration: number | null;
}

/** Enabled tracks, in admin-configured order — what the constructor offers. */
export async function getEnabledRecommendedTracks(): Promise<PlayableTrack[]> {
  const rows = await db.recommendedTrack.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    artist: r.artist,
    url: getPublicUrl(r.key),
    duration: r.duration,
  }));
}

/** Full list for the admin UI, including disabled rows. */
export async function getAllRecommendedTracks() {
  const rows = await db.recommendedTrack.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({ ...r, url: getPublicUrl(r.key) }));
}

export class InvalidAudioFileError extends Error {}

/** Uploads the audio file and creates its catalog row. Admin-only caller enforces auth. */
export async function createRecommendedTrack(params: {
  title: string;
  artist: string | null;
  file: File;
}): Promise<void> {
  const buffer = Buffer.from(await params.file.arrayBuffer());
  const validated = validateUpload("audio", params.file.type, buffer.byteLength, buffer);
  if (!validated) throw new InvalidAudioFileError();

  const key = `music/recommended/${randomUUID()}.${validated.ext}`;
  await uploadFile({ key, contentType: validated.mime, body: buffer });

  const maxOrder = await db.recommendedTrack.aggregate({ _max: { sortOrder: true } });

  await db.recommendedTrack.create({
    data: {
      title: params.title,
      artist: params.artist,
      key,
      mimeType: validated.mime,
      size: buffer.byteLength,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function setRecommendedTrackEnabled(id: string, enabled: boolean): Promise<void> {
  await db.recommendedTrack.update({ where: { id }, data: { enabled } });
}

export async function updateRecommendedTrackOrder(orderedIds: string[]): Promise<void> {
  await db.$transaction(
    orderedIds.map((id, i) => db.recommendedTrack.update({ where: { id }, data: { sortOrder: i } }))
  );
}

export async function deleteRecommendedTrack(id: string): Promise<void> {
  const row = await db.recommendedTrack.findUnique({ where: { id }, select: { key: true } });
  if (!row) return;
  await db.recommendedTrack.delete({ where: { id } });
  await deleteFile(row.key).catch((err) => {
    console.error("[recommended-tracks] failed to delete media object", {
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
