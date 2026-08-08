/**
 * Redis connections, shared across the app rather than opened per request —
 * Redis is a real backing service here (rate limiting, BullMQ), not a
 * per-call cache.
 *
 * Two separate ioredis clients are exported, deliberately NOT one:
 *
 *  - getRedisClient()      general-purpose (rate limiting). Bounded retries
 *                          + a command timeout, so a single command fails
 *                          fast if Redis is down. This is what lets the
 *                          anonymous-upload route return a controlled 503
 *                          instead of hanging the request indefinitely.
 *
 *  - getQueueRedisClient() BullMQ only. BullMQ *requires*
 *                          `maxRetriesPerRequest: null` (it manages its own
 *                          retry loop around long-lived blocking commands);
 *                          giving that same client to the rate limiter is
 *                          exactly what makes its commands queue forever
 *                          during an outage instead of failing.
 *
 * Sharing one option set between these two would force a choice between
 * "BullMQ works" and "rate limiter fails fast" — they're incompatible
 * requirements, hence two connections instead of one.
 */
import Redis from "ioredis";

let generalClient: Redis | null = null;
let queueClient: Redis | null = null;
let hasLoggedConnect = false;

function retryStrategy(attempt: number): number {
  // Reconnect with backoff, capped at 10s — never give up permanently.
  return Math.min(attempt * 500, 10_000);
}

function onConnected(): void {
  if (!hasLoggedConnect) {
    hasLoggedConnect = true;
    console.log("[redis] connected");
  }
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

function requireUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not configured.");
  return url;
}

/** General-purpose client (rate limiting). Fails fast when Redis is down. */
export function getRedisClient(): Redis {
  if (generalClient) return generalClient;

  generalClient = new Redis(requireUrl(), {
    lazyConnect: true,
    retryStrategy,
    maxRetriesPerRequest: 1,
    commandTimeout: 1_500,
  });

  generalClient.on("error", (err) => {
    // Never log the URL (may contain credentials) — just the failure.
    console.error("[redis] connection error:", err.message);
  });
  generalClient.on("connect", onConnected);

  return generalClient;
}

/** BullMQ-dedicated client. Long-lived, patient — never used for one-off request-scoped checks. */
export function getQueueRedisClient(): Redis {
  if (queueClient) return queueClient;

  queueClient = new Redis(requireUrl(), {
    lazyConnect: true,
    retryStrategy,
    maxRetriesPerRequest: null,
  });

  queueClient.on("error", (err) => {
    console.error("[redis:queue] connection error:", err.message);
  });
  queueClient.on("connect", onConnected);

  return queueClient;
}

export async function closeRedisClient(): Promise<void> {
  const clients = [generalClient, queueClient];
  generalClient = null;
  queueClient = null;
  await Promise.all(
    clients.map((c) => c?.quit().catch(() => c.disconnect()))
  );
}
