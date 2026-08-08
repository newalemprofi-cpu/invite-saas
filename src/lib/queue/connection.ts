/**
 * Shared BullMQ connection — one dedicated ioredis client reused across
 * every Queue/Worker in the process (not a pool-per-queue). Deliberately
 * separate from the rate limiter's client; see src/lib/redis.ts for why
 * BullMQ can't share a connection tuned for fail-fast behavior.
 */
import { getQueueRedisClient } from "@/lib/redis";
import type { ConnectionOptions } from "bullmq";

export function getQueueConnection(): ConnectionOptions {
  return getQueueRedisClient();
}
