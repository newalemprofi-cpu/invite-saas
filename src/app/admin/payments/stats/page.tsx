import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Статистика — Admin" };
export const dynamic = "force-dynamic";

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-400 mt-1">{label}</p>
    </div>
  );
}

export default async function PaymentStatsPage() {
  const payments = await db.payment.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { amount: true },
  });

  const byStatus = Object.fromEntries(
    payments.map((p) => [p.status, { count: p._count._all, sum: Number(p._sum.amount ?? 0) }])
  ) as Record<string, { count: number; sum: number }>;

  const paid = byStatus.PAID ?? { count: 0, sum: 0 };
  const pending = byStatus.PENDING ?? { count: 0, sum: 0 };
  const failed = byStatus.FAILED ?? { count: 0, sum: 0 };
  const totalCount = Object.values(byStatus).reduce((s, v) => s + v.count, 0);

  const byProvider = await db.payment.groupBy({
    by: ["provider"],
    where: { status: "PAID" },
    _count: { _all: true },
    _sum: { amount: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Төлем статистикасы</h1>
        <p className="text-sm text-zinc-500 mt-1">{totalCount} төлем барлығы</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card label="Табыс (PAID)" value={`${paid.sum.toLocaleString("kk-KZ")} ₸`} />
        <Card label="Расталды" value={String(paid.count)} />
        <Card label="Күтуде" value={String(pending.count)} />
        <Card label="Сәтсіз/қабылданбады" value={String(failed.count)} />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 pt-4 pb-2">
          Провайдер бойынша (тек PAID)
        </p>
        {byProvider.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">Деректер жоқ</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {byProvider.map((p) => (
                <tr key={p.provider} className="border-t border-zinc-50">
                  <td className="px-4 py-3 text-zinc-700">{p.provider}</td>
                  <td className="px-4 py-3 text-right text-zinc-500">{p._count._all} төлем</td>
                  <td className="px-4 py-3 text-right font-bold text-zinc-800 tabular-nums">
                    {Number(p._sum.amount ?? 0).toLocaleString("kk-KZ")} ₸
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
