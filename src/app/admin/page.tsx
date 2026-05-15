import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const metadata: Metadata = { title: "Admin — Шақыру" };
export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  sub,
  accent,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "amber" | "emerald" | "rose" | "blue";
  href?: string;
}) {
  const colors = {
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    blue: "text-blue-600",
  };
  const card = (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 text-center hover:shadow-md transition-shadow">
      <p className={`text-2xl font-bold ${accent ? colors[accent] : "text-zinc-900"}`}>
        {value}
      </p>
      <p className="text-xs font-medium text-zinc-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export default async function AdminOverviewPage() {
  const [inviteGroups, totalUsers, pendingPayments, revenueAgg] = await Promise.all([
    db.invite.groupBy({ by: ["status"], _count: { id: true } }),
    db.user.count(),
    db.payment.count({ where: { status: "PENDING" } }),
    db.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
  ]);

  const inviteStats = Object.fromEntries(
    inviteGroups.map((g) => [g.status, g._count.id])
  );
  const totalInvites = Object.values(inviteStats).reduce((a, b) => a + b, 0);
  const publishedCount = inviteStats["PUBLISHED"] ?? 0;
  const revenue = Number(revenueAgg._sum.amount ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Шолу</h1>
        <p className="text-sm text-zinc-500 mt-1">Жалпы статистика</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Пайдаланушылар" value={totalUsers} accent="blue" href="/admin/users" />
        <StatCard label="Шақырулар" value={totalInvites} href="/admin/invites" />
        <StatCard label="Жарияланған" value={publishedCount} accent="emerald" href="/admin/invites" />
        <StatCard
          label="Күтілуде"
          value={pendingPayments}
          accent={pendingPayments > 0 ? "amber" : undefined}
          sub="Төлем расталуын күтеді"
          href="/admin/payments"
        />
        <StatCard
          label="Табыс"
          value={`${revenue.toLocaleString("kk-KZ")} ₸`}
          accent="rose"
          sub="Расталған төлемдер"
          href="/admin/payments"
        />
      </div>

      {/* Status breakdown */}
      <section>
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Шақыру статустары</h2>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex flex-wrap gap-3">
          {Object.entries(inviteStats).map(([status, count]) => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2"
            >
              <StatusBadge status={status as never} />
              <span className="text-sm font-bold text-zinc-700">{count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Жылдам өту</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/admin/invites", label: "Шақырулар", desc: "Жариялау және басқару", emoji: "📋" },
            { href: "/admin/users", label: "Пайдаланушылар", desc: "Тіркелген аккаунттар", emoji: "👥" },
            { href: "/admin/payments", label: "Төлемдер", desc: "Растау және тарих", emoji: "💳" },
            { href: "/admin/settings", label: "Баптаулар", desc: "Баға және параметрлер", emoji: "⚙️" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 hover:shadow-md hover:border-zinc-200 transition-all flex flex-col gap-2"
            >
              <span className="text-2xl">{item.emoji}</span>
              <p className="font-semibold text-zinc-900">{item.label}</p>
              <p className="text-xs text-zinc-500">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
