import { NextRequest, NextResponse } from "next/server";
import { enqueueCleanupAnonymousUploads } from "@/lib/queue/queues";
import { isRedisConfigured } from "@/lib/redis";

/**
 * POST /api/admin/cron/cleanup-anonymous-uploads
 *
 * Manual/fallback trigger for the anonymous-upload cleanup job — the
 * worker already runs this on its own schedule (see src/worker.ts), so
 * this endpoint exists only for an on-demand nudge from Coolify/n8n or
 * during incident response. It enqueues and returns immediately; the
 * actual S3 scan/delete work happens in the worker process, never inside
 * this HTTP request.
 *
 * Protected by Authorization: Bearer <CRON_SECRET>, same convention as
 * /api/admin/cron/expire-invites.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isRedisConfigured()) {
    return NextResponse.json({ error: "QUEUE_UNAVAILABLE" }, { status: 503 });
  }

  try {
    const job = await enqueueCleanupAnonymousUploads();
    return NextResponse.json({ ok: true, queued: true, jobId: job.id });
  } catch (err) {
    console.error("[cron/cleanup-anonymous-uploads] failed to enqueue", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, queued: false, error: "ENQUEUE_FAILED" }, { status: 503 });
  }
}
