import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getObjectStream } from "@/lib/storage";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * Deliberately NOT served through the generic /api/media/[...key] proxy:
 * that proxy has no per-object ownership check (by design — invite gallery
 * media is meant to be publicly viewable once published). A payment
 * receipt is a financial document and must only ever be visible to the
 * customer who owns the Payment or an admin — so this route re-implements
 * the same storage read but with a real authorization check first, and a
 * `receipts/` key is never added to that proxy's allowlist.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const receipt = await db.paymentReceipt.findUnique({
    where: { id },
    select: { mediaKey: true, payment: { select: { userId: true } } },
  });
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (receipt.payment.userId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const object = await getObjectStream(receipt.mediaKey);
    if (!object) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const headers = new Headers();
    headers.set("Content-Type", object.contentType || "application/octet-stream");
    headers.set("Cache-Control", "private, no-store");
    if (object.size > 0) headers.set("Content-Length", String(object.size));
    return new NextResponse(object.stream, { status: 200, headers });
  } catch (err) {
    console.error("[receipt-image] failed to read object", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load receipt" }, { status: 502 });
  }
}
