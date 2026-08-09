import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PromoCodesManager } from "./PromoCodesManager";

export const metadata: Metadata = { title: "Промокодтар — Admin" };
export const dynamic = "force-dynamic";

export default async function PromoCodesPage() {
  const promos = await db.promoCode.findMany({ orderBy: { createdAt: "desc" } });

  const confirmedStats = await db.promoCodeUsage.groupBy({
    by: ["promoCodeId"],
    where: { status: "CONFIRMED" },
    _count: { _all: true },
    _sum: { discountAmount: true },
  });
  const statsByPromo = new Map(
    confirmedStats.map((s) => [s.promoCodeId, { paidConversions: s._count._all, totalDiscount: Number(s._sum.discountAmount ?? 0) }])
  );

  const initial = promos.map((p) => ({
    id: p.id,
    code: p.code,
    type: p.type,
    value: Number(p.value),
    minAmount: p.minAmount != null ? Number(p.minAmount) : null,
    maxDiscount: p.maxDiscount != null ? Number(p.maxDiscount) : null,
    usageLimit: p.usageLimit,
    usagePerUser: p.usagePerUser,
    usedCount: p.usedCount,
    startsAt: p.startsAt ? p.startsAt.toISOString() : null,
    expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
    enabled: p.enabled,
    paidConversions: statsByPromo.get(p.id)?.paidConversions ?? 0,
    totalDiscount: statsByPromo.get(p.id)?.totalDiscount ?? 0,
  }));

  return <PromoCodesManager initial={initial} />;
}
