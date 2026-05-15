import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Пайдаланушылар — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      _count: { select: { invites: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Пайдаланушылар</h1>
        <p className="text-sm text-zinc-500 mt-1">{users.length} пайдаланушы тіркелген</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        {users.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">Пайдаланушы жоқ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Аты</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Рөл</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Шақырулар</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">Тіркелген</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-zinc-800 font-medium text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell">{u.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {u.role === "ADMIN" ? (
                        <span className="rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5">Admin</span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-medium px-2 py-0.5">User</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-zinc-700 hidden sm:table-cell">
                      {u._count.invites}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-400 tabular-nums hidden md:table-cell">
                      {u.createdAt.toLocaleDateString("kk-KZ", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
