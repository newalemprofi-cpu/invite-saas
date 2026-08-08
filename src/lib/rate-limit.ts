/**
 * Distributed, Redis-backed rate limiting. Fixed-window counter per key,
 * incremented and expired atomically in a single Lua script so concurrent
 * requests (multiple app instances, parallel requests) can never race their
 * way past the limit via a non-atomic GET-then-SET.
 *
 * Policy lives here, isolated from callers, so limits can change without
 * touching route handlers.
 */
import type { Redis } from "ioredis";
import { getRedisClient } from "@/lib/redis";

// KEYS[1] = counter key
// ARGV[1] = limit
// ARGV[2] = window (seconds)
// Returns [currentCount, ttlSecondsRemaining]
const INCR_AND_EXPIRE_LUA = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[2])
end
local ttl = redis.call("TTL", KEYS[1])
if ttl < 0 then
  redis.call("EXPIRE", KEYS[1], ARGV[2])
  ttl = tonumber(ARGV[2])
end
return {current, ttl}
`;

type RateLimitRedis = Redis & {
  rlIncrAndExpire(key: string, limit: number, windowSeconds: number): Promise<[number, number]>;
};

let commandDefined = false;
function withCommand(redis: Redis): RateLimitRedis {
  if (!commandDefined) {
    redis.defineCommand("rlIncrAndExpire", { numberOfKeys: 1, lua: INCR_AND_EXPIRE_LUA });
    commandDefined = true;
  }
  return redis as RateLimitRedis;
}

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("Rate limiter backend (Redis) is unavailable.");
    this.name = "RateLimitUnavailableError";
  }
}

export interface RateLimitOutcome {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSeconds: number;
}

/**
 * Atomically increments the counter for `key` and reports whether it's
 * still within `limit` for the current fixed window. Throws
 * RateLimitUnavailableError if Redis can't be reached — callers must fail
 * closed (reject the request) rather than silently skip the check.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitOutcome> {
  const redis = withCommand(getRedisClient());
  let result: [number, number];
  try {
    result = await redis.rlIncrAndExpire(key, limit, windowSeconds);
  } catch (err) {
    console.error("[rate-limit] redis command failed:", err instanceof Error ? err.message : err);
    throw new RateLimitUnavailableError();
  }
  const [count, ttl] = result;
  return {
    allowed: count <= limit,
    count,
    limit,
    retryAfterSeconds: Math.max(ttl, 1),
  };
}

// ── Anonymous upload policy ─────────────────────────────────────────────

export interface AnonymousUploadRateLimitParams {
  ip: string;
  draftToken: string;
}

export type AnonymousUploadRateLimitResult =
  | { ok: true }
  | { ok: false; reason: "ip" | "draft"; retryAfterSeconds: number };

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Enforces both the per-IP and per-draftToken limits for
 * POST /api/uploads/anonymous. Checks IP first (cheaper to exhaust, covers
 * the "many draftTokens from one abuser" case); draft-scoped limit catches
 * a single draft being hammered from rotating IPs.
 */
export async function checkAnonymousUploadRateLimit(
  params: AnonymousUploadRateLimitParams
): Promise<AnonymousUploadRateLimitResult> {
  const windowSeconds = envInt("ANON_UPLOAD_RATE_WINDOW_SECONDS", 600);
  const ipLimit = envInt("ANON_UPLOAD_RATE_LIMIT_IP", 20);
  const draftLimit = envInt("ANON_UPLOAD_RATE_LIMIT_DRAFT", 12);

  const ipResult = await checkRateLimit(`ratelimit:anon-upload:ip:${params.ip}`, ipLimit, windowSeconds);
  if (!ipResult.allowed) {
    console.warn("[rate-limit] anonymous upload rejected", { scope: "ip", retryAfterSeconds: ipResult.retryAfterSeconds });
    return { ok: false, reason: "ip", retryAfterSeconds: ipResult.retryAfterSeconds };
  }

  const draftResult = await checkRateLimit(`ratelimit:anon-upload:draft:${params.draftToken}`, draftLimit, windowSeconds);
  if (!draftResult.allowed) {
    console.warn("[rate-limit] anonymous upload rejected", { scope: "draft", retryAfterSeconds: draftResult.retryAfterSeconds });
    return { ok: false, reason: "draft", retryAfterSeconds: draftResult.retryAfterSeconds };
  }

  return { ok: true };
}
