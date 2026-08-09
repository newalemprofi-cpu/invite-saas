import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PendingPayments } from "../../PendingPayments";

export const metadata: Metadata = { title: "Қолмен төлемдер — Admin" };
export const dynamic = "force-dynamic";

export default async function ManualPaymentsPage() {
  const pendingPayments = await db.payment.findMany({
    where: { status: "PENDING" },
    include: {
      user: { select: { name: true, email: true } },
      invite: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const serialized = pendingPayments.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    createdAt: p.createdAt.toISOString(),
    rawPayload: p.rawPayload as Record<string, unknown> | null,
    user: p.user,
    invite: p.invite,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Қолмен төлемдер</h1>
          <p className="text-sm text-zinc-500 mt-1">Расталуды күтетін Kaspi төлемдері</p>
        </div>
        {serialized.length > 0 && (
          <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1">
            {serialized.length}
          </span>
        )}
      </div>
      <PendingPayments payments={serialized} />
    </div>
  );
}
