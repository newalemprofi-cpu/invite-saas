import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/admin/cron/expire-invites
 *
 * Marks all PUBLISHED invites whose expiresAt is in the past as EXPIRED.
 * Protected by Authorization: Bearer <CRON_SECRET>.
 * Designed to be called by n8n (or any HTTP cron) on a schedule.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const { count } = await db.invite.updateMany({
    where: {
      status: "PUBLISHED",
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  if (count > 0) {
    await db.auditLog.create({
      data: {
        action: "CRON_INVITES_EXPIRED",
        entity: "Invite",
        entityId: "batch",
        meta: { count, runAt: now.toISOString() },
      },
    });
  }

  return NextResponse.json({ expired: count, runAt: now.toISOString() });
}
