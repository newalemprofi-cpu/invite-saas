import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getProductSettings } from "@/lib/product";
import { validateAndCalculatePromo } from "@/lib/promo-codes";

const schema = z.object({
  inviteId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  lang: z.enum(["kk", "ru"]).default("kk"),
});

const PAYABLE_STATUSES = new Set(["DRAFT", "PENDING_PAYMENT", "EXPIRED"]);

/**
 * POST /api/payments/promo/validate
 *
 * Checkout preview only — never creates a Payment or reserves a usage
 * slot (see reservePromoUsage in lib/promo-codes.ts, which only ever runs
 * inside /api/payments/create's transaction). This just lets the customer
 * see the discount breakdown before committing to a payment method; the
 * authoritative validation + atomic reservation happens again at actual
 * checkout, so a code that stops being valid between preview and submit
 * (e.g. someone else just used the last slot) is still safely rejected.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { inviteId, code, lang } = parsed.data;

  const invite = await db.invite.findUnique({ where: { id: inviteId }, select: { id: true, userId: true, status: true } });
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (session.role !== "ADMIN" && invite.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!PAYABLE_STATUSES.has(invite.status)) {
    return NextResponse.json({ error: `Cannot pay for invite with status ${invite.status}` }, { status: 409 });
  }

  const product = await getProductSettings();
  const result = await validateAndCalculatePromo({ code, amount: product.price, userId: session.userId, lang });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message, code: result.code }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: result.message,
    code: result.promo.code,
    originalAmount: product.price,
    discountAmount: result.discountAmount,
    finalAmount: result.finalAmount,
  });
}
