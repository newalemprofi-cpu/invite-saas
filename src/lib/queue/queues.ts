/**
 * Queue definitions shared between the web app (enqueues jobs) and the
 * worker (consumes them — see src/worker.ts). Only one queue exists right
 * now; add new job *names* to it rather than new queues unless a job needs
 * genuinely different concurrency/priority handling.
 */
import { Queue, type JobsOptions } from "bullmq";
import { getQueueConnection } from "./connection";

export const MAINTENANCE_QUEUE_NAME = "maintenance";

export const JOB_CLEANUP_ANONYMOUS_UPLOADS = "cleanup-anonymous-uploads";

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

let maintenanceQueue: Queue | null = null;

/** Lazily created — never opens a Redis connection at module-import time. */
export function getMaintenanceQueue(): Queue {
  if (maintenanceQueue) return maintenanceQueue;
  maintenanceQueue = new Queue(MAINTENANCE_QUEUE_NAME, {
    connection: getQueueConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  return maintenanceQueue;
}

/** Enqueues a one-off cleanup run (used by the manual cron endpoint). */
export async function enqueueCleanupAnonymousUploads() {
  return getMaintenanceQueue().add(JOB_CLEANUP_ANONYMOUS_UPLOADS, {});
}
