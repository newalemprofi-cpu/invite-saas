import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getObjectStream } from "@/lib/storage";
import { verifyReceiptAccessToken } from "@/lib/payment/receipt-access-token";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * Fetched by the EXTERNAL extractor service only — never by the browser,
 * never session-authenticated (see receipt-access-token.ts for why a
 * signed token is used instead). Serves the PDF used for extraction
 * (`extractionMediaKey`, falling back to `mediaKey` if the upload was
 * already a PDF), not the customer-facing original when they differ.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const expires = Number(req.nextUrl.searchParams.get("expires"));
  const token = req.nextUrl.searchParams.get("token") ?? "";

  if (!verifyReceiptAccessToken(id, expires, token)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const receipt = await db.paymentReceipt.findUnique({
    where: { id },
    select: { mediaKey: true, extractionMediaKey: true },
  });
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const key = receipt.extractionMediaKey ?? receipt.mediaKey;
  try {
    const object = await getObjectStream(key);
    if (!object) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Cache-Control", "private, no-store");
    if (object.size > 0) headers.set("Content-Length", String(object.size));
    return new NextResponse(object.stream, { status: 200, headers });
  } catch (err) {
    console.error("[receipt-extractor-access] failed to read object", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load receipt" }, { status: 502 });
  }
}
