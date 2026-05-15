import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listInvites, type InviteWithCount } from "@/lib/data/invites";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { CopyButton } from "@/components/dashboard/CopyButton";

export const metadata: Metadata = { title: "Dashboard — Шақыру" };

function relativeDate(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diff === 0) return "Бүгін";
  if (diff === 1) return "Кеше";
  if (diff < 7) return `${diff} күн бұрын`;
  if (diff < 30) return `${Math.floor(diff / 7)} апта бұрын`;
  return date.toLocaleDateString("kk-KZ");
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 text-center">
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

function InviteCard({ invite, appUrl }: { invite: InviteWithCount; appUrl: string }) {
  const shareUrl = `${appUrl}/i/${invite.slug}`;

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-900 truncate">{invite.title}</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {relativeDate(invite.createdAt)} ·{" "}
            {invite._count.guests === 0
              ? "қонақ жоқ"
              : `${invite._count.guests} қонақ`}
          </p>
        </div>
        <StatusBadge status={invite.status} />
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-zinc-50">
        <CopyButton text={shareUrl} />
        <Link
          href={`/dashboard/invites/${invite.id}`}
          className="ml-auto inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          Басқару
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-3xl">
        💌
      </div>
      <div>
        <p className="font-semibold text-zinc-800">Шақырулар жоқ</p>
        <p className="text-sm text-zinc-400 mt-1">Алғашқы шақыруыңызды жасаңыз</p>
      </div>
      <Link
        href="/create"
        className="mt-2 inline-flex h-10 items-center gap-2 rounded-xl bg-rose-500 px-5 text-sm font-semibold text-white shadow-sm shadow-rose-200 hover:bg-rose-600 transition-colors"
      >
        + Жаңа шақыру
      </Link>
    </div>
  );
}

export default async function DashboardPage() {
  const session = (await getSession())!;
  const invites = await listInvites(session.userId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const stats = {
    total: invites.length,
    published: invites.filter((i) => i.status === "PUBLISHED").length,
    guests: invites.reduce((s, i) => s + i._count.guests, 0),
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Менің шақыруларым</h1>
        <Link
          href="/create"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white shadow-sm shadow-rose-200 hover:bg-rose-600 transition-colors"
        >
          + Жаңа
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Барлығы" value={stats.total} />
        <StatCard label="Жарияланды" value={stats.published} />
        <StatCard label="Қонақтар" value={stats.guests} />
      </div>

      {invites.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-3">
          {invites.map((invite) => (
            <InviteCard key={invite.id} invite={invite} appUrl={appUrl} />
          ))}
        </div>
      )}
    </main>
  );
}
