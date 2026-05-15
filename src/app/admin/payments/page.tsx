import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Төлемдер — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const [payments, recentLogs] = await Promise.all([
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { email: true, name: true } },
        invite: { select: { title: true, slug: true } },
      },
    }),
    db.auditLog.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, name: true } } },
    }),
  ]);

  const revenue = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    PAID: "bg-emerald-100 text-emerald-700",
    FAILED: "bg-red-100 text-red-600",
    EXPIRED: "bg-zinc-100 text-zinc-500",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Төлемдер</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Барлық: {payments.length} · Табыс: {revenue.toLocaleString("kk-KZ")} ₸
        </p>
      </div>

      {/* Payments table */}
      <section>
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Төлемдер тарихы</h2>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          {payments.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">Төлем жоқ</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Пайдаланушы</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">Шақыру</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Статус</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Сомасы</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Күні</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-zinc-800">{p.user.name ?? p.user.email}</p>
                        <p className="text-[10px] font-mono text-zinc-400">{p.id.slice(-8).toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 hidden md:table-cell">{p.invite.title}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[p.status] ?? "bg-zinc-100 text-zinc-500"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-zinc-800 tabular-nums">
                        {Number(p.amount).toLocaleString("kk-KZ")} ₸
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-400 tabular-nums hidden sm:table-cell">
                        {p.createdAt.toLocaleDateString("kk-KZ", { day: "numeric", month: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Audit log */}
      <section>
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Соңғы өзгерістер</h2>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          {recentLogs.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">Жазбалар жоқ</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Іс-әрекет</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Пайдаланушы</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Уақыт</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-xs bg-zinc-100 rounded px-1.5 py-0.5 text-zinc-700">{log.action}</code>
                      <span className="ml-2 text-xs text-zinc-500">{log.entity}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell">{log.user?.email ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-400 tabular-nums">
                      {log.createdAt.toLocaleString("kk-KZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
