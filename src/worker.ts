/**
 * Standalone maintenance worker — runs as its own process/container,
 * never inside the Next.js web process. Consumes the "maintenance" BullMQ
 * queue; today that's just anonymous-upload cleanup, but it's the one
 * place future background jobs (payment reconciliation, digest emails,
 * etc.) get added without ever blocking a web request.
 *
 * Start with: npm run worker            (tsx, dev)
 *             node dist-worker/worker.js (compiled, production — see
 *             package.json's build:worker / start:worker scripts)
 */
import { Worker, type Job } from "bullmq";
import { getQueueConnection } from "@/lib/queue/connection";
import { MAINTENANCE_QUEUE_NAME, JOB_CLEANUP_ANONYMOUS_UPLOADS, getMaintenanceQueue } from "@/lib/queue/queues";
import { cleanupExpiredAnonymousUploads } from "@/lib/queue/jobs";
import { closeRedisClient, isRedisConfigured } from "@/lib/redis";

const CLEANUP_SCHEDULER_ID = "anonymous-upload-cleanup";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function processJob(job: Job): Promise<unknown> {
  console.log("[worker] job started", { name: job.name, id: job.id, attempt: job.attemptsMade + 1 });

  switch (job.name) {
    case JOB_CLEANUP_ANONYMOUS_UPLOADS:
      return cleanupExpiredAnonymousUploads();
    default:
      // Unknown job name landed in a queue this worker owns — fail loudly
      // rather than silently succeeding, so it surfaces in monitoring.
      throw new Error(`No processor registered for job "${job.name}"`);
  }
}

async function main() {
  if (!isRedisConfigured()) {
    console.error("[worker] REDIS_URL is not configured — exiting.");
    process.exit(1);
  }

  const worker = new Worker(MAINTENANCE_QUEUE_NAME, processJob, {
    connection: getQueueConnection(),
    concurrency: 2,
  });

  worker.on("completed", (job, result) => {
    console.log("[worker] job completed", { name: job.name, id: job.id, result });
  });
  worker.on("failed", (job, err) => {
    console.error("[worker] job failed", {
      name: job?.name,
      id: job?.id,
      attempt: job ? job.attemptsMade : undefined,
      error: err.message,
    });
  });
  worker.on("error", (err) => {
    // Connection-level errors (e.g. Redis blip) — ioredis will keep
    // retrying underneath; this is just visibility, not fatal.
    console.error("[worker] connection error", { error: err.message });
  });

  await worker.waitUntilReady();

  // Idempotent: re-asserting the same schedulerId on every boot updates the
  // existing schedule instead of creating a duplicate, so restarts/deploys
  // never end up running cleanup twice as often.
  const everyHours = envInt("ANON_UPLOAD_CLEANUP_EVERY_HOURS", 6);
  await getMaintenanceQueue().upsertJobScheduler(
    CLEANUP_SCHEDULER_ID,
    { every: everyHours * 60 * 60 * 1000 },
    { name: JOB_CLEANUP_ANONYMOUS_UPLOADS, opts: { removeOnComplete: { count: 20 }, removeOnFail: { count: 50 } } }
  );

  console.log("WORKER_READY", { queue: MAINTENANCE_QUEUE_NAME, cleanupEveryHours: everyHours });

  let shuttingDown = false;
  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("[worker] shutting down", { signal });
    try {
      await worker.close();
    } catch (err) {
      console.error("[worker] error closing worker", { error: err instanceof Error ? err.message : String(err) });
    }
    await closeRedisClient();
    process.exit(0);
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[worker] fatal startup error", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
