import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseAndValidatePromoInput, isValidationFailure } from "@/lib/promo-codes-validation";

function adminOnly() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return adminOnly();

  const promos = await db.promoCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Paid conversions + total discount granted per promo — PENDING/FAILED
  // reservations are deliberately excluded (only CONFIRMED usages are
  // actual successful redemptions, see PromoUsageStatus).
  const confirmedStats = await db.promoCodeUsage.groupBy({
    by: ["promoCodeId"],
    where: { status: "CONFIRMED" },
    _count: { _all: true },
    _sum: { discountAmount: true },
  });
  const statsByPromo = new Map(
    confirmedStats.map((s) => [s.promoCodeId, { paidConversions: s._count._all, totalDiscount: Number(s._sum.discountAmount ?? 0) }])
  );

  return NextResponse.json(
    promos.map((p) => ({
      ...p,
      value: Number(p.value),
      minAmount: p.minAmount != null ? Number(p.minAmount) : null,
      maxDiscount: p.maxDiscount != null ? Number(p.maxDiscount) : null,
      paidConversions: statsByPromo.get(p.id)?.paidConversions ?? 0,
      totalDiscount: statsByPromo.get(p.id)?.totalDiscount ?? 0,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return adminOnly();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseAndValidatePromoInput(body);
  if (isValidationFailure(parsed)) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const promo = await db.promoCode.create({ data: parsed });
    return NextResponse.json(promo, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Бұл код бұрын тіркелген" }, { status: 409 });
    }
    console.error("CREATE_PROMO_ERR", err);
    return NextResponse.json({ error: "Сервер қатесі" }, { status: 500 });
  }
}
