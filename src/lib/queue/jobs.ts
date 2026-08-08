/**
 * Job implementations, consumed only by the worker (src/worker.ts). Kept
 * separate from queues.ts so the web app's enqueue path doesn't need to
 * pull in the cleanup implementation itself.
 */
import { deleteFile, isStorageConfigured, listObjectsUnderPrefix } from "@/lib/storage";

const TEMP_PREFIX = "temp/";

export interface CleanupResult {
  scanned: number;
  deleted: number;
  failed: number;
  skipped: number;
}

// Float, not int: fractional hours (e.g. "0.5") are a legitimate config
// for short TTLs, and it costs nothing to support them.
function envHours(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseFloat(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Deletes anonymous uploads (temp/<draftToken>/...) older than the
 * configured TTL. Only ever touches the temp/ prefix — invites/* (claimed,
 * permanent media) is never in scope, by construction (different prefix).
 * A single object failing to delete does not abort the run; it's counted
 * and the scan continues.
 */
export async function cleanupExpiredAnonymousUploads(): Promise<CleanupResult> {
  const result: CleanupResult = { scanned: 0, deleted: 0, failed: 0, skipped: 0 };

  if (!isStorageConfigured()) {
    console.warn("[cleanup] storage not configured, skipping run");
    return result;
  }

  const ttlHours = envHours("ANONYMOUS_UPLOAD_TTL_HOURS", 48);
  const cutoff = Date.now() - ttlHours * 60 * 60 * 1000;

  const objects = await listObjectsUnderPrefix(TEMP_PREFIX);
  result.scanned = objects.length;

  for (const obj of objects) {
    // Defense in depth: even though we only listed temp/, refuse to ever
    // touch anything that isn't under it.
    if (!obj.key.startsWith(TEMP_PREFIX)) {
      result.skipped++;
      continue;
    }

    const isExpired = obj.lastModified !== null && obj.lastModified.getTime() < cutoff;
    if (!isExpired) {
      result.skipped++;
      continue;
    }

    try {
      await deleteFile(obj.key);
      result.deleted++;
    } catch (err) {
      result.failed++;
      console.error("[cleanup] failed to delete object", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  console.log("[cleanup] run complete", result);
  return result;
}
