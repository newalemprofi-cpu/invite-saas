import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PendingPayments } from "./PendingPayments";
import { InviteTable, type AdminInvite } from "./InviteTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const metadata: Metadata = { title: "Admin — Шақыру" };
export const dynamic = "force-dynamic";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "amber" | "emerald" | "rose" | "blue";
}) {
  const colors = {
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    blue: "text-blue-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 text-center">
      <p
        className={`text-2xl font-bold ${accent ? colors[accent] : "text-zinc-900"}`}
      >
        {value}
      </p>
      <p className="text-xs font-medium text-zinc-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-zinc-900 mb-4">{children}</h2>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const [
    pendingPayments,
    inviteGroups,
    totalUsers,
    recentLogs,
    revenueAgg,
    allUsersData,
    allInvitesData,
    allPaymentsData,
  ] = await Promise.all([
    db.payment.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { name: true, email: true } },
        invite: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.invite.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    db.user.count(),
    db.auditLog.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, name: true } } },
    }),
    db.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { invites: true } },
      },
    }),
    db.invite.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
        _count: { select: { guests: true } },
      },
    }),
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { email: true, name: true } },
        invite: { select: { title: true, slug: true } },
      },
    }),
  ]);

  // ── Derived stats ────────────────────────────────────────────────────────
  const inviteStats = Object.fromEntries(
    inviteGroups.map((g) => [g.status, g._count.id])
  );
  const totalInvites = Object.values(inviteStats).reduce((a, b) => a + b, 0);
  const publishedCount = inviteStats["PUBLISHED"] ?? 0;
  const expiredCount = inviteStats["EXPIRED"] ?? 0;
  const revenue = Number(revenueAgg._sum.amount ?? 0);

  // ── Serialize for client components ─────────────────────────────────────
  const serializedPending = pendingPayments.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    createdAt: p.createdAt.toISOString(),
    rawPayload: p.rawPayload as Record<string, unknown> | null,
    user: p.user,
    invite: p.invite,
  }));

  const serializedInvites: AdminInvite[] = allInvitesData.map((inv) => ({
    id: inv.id,
    title: inv.title,
    slug: inv.slug,
    status: inv.status,
    createdAt: inv.createdAt.toISOString(),
    expiresAt: inv.expiresAt?.toISOString() ?? null,
    user: inv.user,
    _count: inv._count,
  }));

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-100 px-4">
        <div className="max-w-6xl mx-auto h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-rose-500 text-lg">Шақыру</span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              Admin
            </span>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <section>
          <SectionHeading>Жалпы статистика</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Пайдаланушылар" value={totalUsers} accent="blue" />
            <StatCard label="Шақырулар" value={totalInvites} />
            <StatCard label="Жарияланған" value={publishedCount} accent="emerald" />
            <StatCard label="Мерзімі өткен" value={expiredCount} />
            <StatCard
              label="Күтілуде"
              value={pendingPayments.length}
              accent={pendingPayments.length > 0 ? "amber" : undefined}
              sub="Төлем расталуын күтеді"
            />
            <StatCard
              label="Табыс"
              value={`${revenue.toLocaleString("kk-KZ")} ₸`}
              accent="rose"
              sub="Расталған төлемдер"
            />
          </div>
        </section>

        {/* ── Invite status breakdown ────────────────────────────────────── */}
        <section>
          <SectionHeading>Шақыру статустары</SectionHeading>
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

        {/* ── Pending payments ──────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeading>Расталуды күтетін төлемдер</SectionHeading>
            {pendingPayments.length > 0 && (
              <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1">
                {pendingPayments.length}
              </span>
            )}
          </div>
          <PendingPayments payments={serializedPending} />
        </section>

        {/* ── All invites ───────────────────────────────────────────────── */}
        <section>
          <SectionHeading>Барлық шақырулар ({totalInvites})</SectionHeading>
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <InviteTable invites={serializedInvites} />
          </div>
        </section>

        {/* ── All users ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeading>Пайдаланушылар ({totalUsers})</SectionHeading>
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            {allUsersData.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">
                Пайдаланушы жоқ
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                        Аты
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Рөл
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                        Шақырулар
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                        Тіркелген
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsersData.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-zinc-800 font-medium text-xs">
                          {u.email}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell">
                          {u.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {u.role === "ADMIN" ? (
                            <span className="rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5">
                              Admin
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-medium px-2 py-0.5">
                              User
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-zinc-700 hidden sm:table-cell">
                          {u._count.invites}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-zinc-400 tabular-nums hidden md:table-cell">
                          {u.createdAt.toLocaleDateString("kk-KZ", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ── All payments ──────────────────────────────────────────────── */}
        <section>
          <SectionHeading>
            Соңғы төлемдер ({allPaymentsData.length})
          </SectionHeading>
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            {allPaymentsData.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">
                Төлем жоқ
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Пайдаланушы
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                        Шақыру
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Статус
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Сомасы
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                        Күні
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPaymentsData.map((p) => {
                      const statusColors: Record<string, string> = {
                        PENDING:
                          "bg-amber-100 text-amber-700",
                        PAID: "bg-emerald-100 text-emerald-700",
                        FAILED: "bg-red-100 text-red-600",
                        EXPIRED: "bg-zinc-100 text-zinc-500",
                      };
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="text-xs font-medium text-zinc-800">
                              {p.user.name ?? p.user.email}
                            </p>
                            <p className="text-[10px] font-mono text-zinc-400">
                              {p.id.slice(-8).toUpperCase()}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500 hidden md:table-cell">
                            {p.invite.title}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[p.status] ?? "bg-zinc-100 text-zinc-500"}`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-zinc-800 tabular-nums">
                            {Number(p.amount).toLocaleString("kk-KZ")} ₸
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-zinc-400 tabular-nums hidden sm:table-cell">
                            {p.createdAt.toLocaleDateString("kk-KZ", {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ── Audit log ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeading>Соңғы өзгерістер</SectionHeading>
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">
                Жазбалар жоқ
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Іс-әрекет
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                      Пайдаланушы
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Уақыт
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <code className="text-xs bg-zinc-100 rounded px-1.5 py-0.5 text-zinc-700">
                          {log.action}
                        </code>
                        <span className="ml-2 text-xs text-zinc-500">
                          {log.entity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell">
                        {log.user?.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-400 tabular-nums">
                        {log.createdAt.toLocaleString("kk-KZ", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
