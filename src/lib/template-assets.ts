import { db } from "@/lib/db";
import { resolveStoredImage } from "@/lib/storage";

/**
 * The Template Asset Library's category registry (§14) — a closed set,
 * validated on write, used both by the upload Server Action and the
 * Admin Builder's asset picker UI.
 */
export const ASSET_CATEGORIES = ["background", "decoration", "frame", "texture"] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export function isAssetCategory(value: unknown): value is AssetCategory {
  return typeof value === "string" && (ASSET_CATEGORIES as readonly string[]).includes(value);
}

export interface TemplateAssetDTO {
  id: string;
  name: string;
  category: AssetCategory;
  url: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

function toDTO(row: {
  id: string; name: string; category: string; storageKey: string; mimeType: string;
  width: number | null; height: number | null; createdAt: Date;
}): TemplateAssetDTO {
  return {
    id: row.id,
    name: row.name,
    category: (isAssetCategory(row.category) ? row.category : "decoration"),
    url: resolveStoredImage(row.storageKey) ?? "",
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listTemplateAssets(category?: AssetCategory): Promise<TemplateAssetDTO[]> {
  const rows = await db.templateAsset.findMany({
    where: category ? { category } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDTO);
}

/**
 * Resolves an `assetId` (as stored inside a template's visualConfig) to a
 * loadable image URL, or `null` if the asset no longer exists — the
 * renderer treats `null` exactly like "no decoration configured" (skips
 * it silently), never throws. Never resolves an arbitrary raw URL from
 * the config itself (only ever a database-verified storage key), so a
 * malformed/tampered assetId can't be used to inject an arbitrary image
 * source.
 */
export async function resolveAssetUrl(assetId: string | undefined): Promise<string | null> {
  if (!assetId) return null;
  const row = await db.templateAsset.findUnique({ where: { id: assetId }, select: { storageKey: true } });
  if (!row) return null;
  return resolveStoredImage(row.storageKey);
}

/** Batch variant — used by InvitationView so a section with multiple
 * decoration instances needs only one DB round trip. */
export async function resolveAssetUrls(assetIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(assetIds.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await db.templateAsset.findMany({ where: { id: { in: unique } }, select: { id: true, storageKey: true } });
  const map = new Map<string, string>();
  for (const row of rows) {
    const url = resolveStoredImage(row.storageKey);
    if (url) map.set(row.id, url);
  }
  return map;
}
