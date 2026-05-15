import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PendingPayments } from "../PendingPayments";
import { InviteTable, type AdminInvite } from "../InviteTable";

export const metadata: Metadata = { title: "Шақырулар — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  const [pendingPayments, allInvitesData] = await Promise.all([
    db.payment.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { name: true, email: true } },
        invite: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.invite.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
        _count: { select: { guests: true } },
      },
    }),
  ]);

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Шақырулар</h1>
        <p className="text-sm text-zinc-500 mt-1">{allInvitesData.length} шақыру барлығы</p>
      </div>

      {/* Pending payments */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-900">Расталуды күтетін төлемдер</h2>
          {pendingPayments.length > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1">
              {pendingPayments.length}
            </span>
          )}
        </div>
        <PendingPayments payments={serializedPending} />
      </section>

      {/* All invites */}
      <section>
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Барлық шақырулар</h2>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <InviteTable invites={serializedInvites} />
        </div>
      </section>
    </div>
  );
}
