"use client";

import { useState, useTransition } from "react";
import { togglePublishAction } from "./actions";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { cn } from "@/lib/utils";

export interface AdminInvite {
  id: string;
  title: string;
  slug: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  user: { email: string; name: string | null };
  _count: { guests: number };
}

function ToggleButton({ invite }: { invite: AdminInvite }) {
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const isPublished = invite.status === "PUBLISHED";
  const isDisabled =
    invite.status === "EXPIRED" || invite.status === "CANCELLED";

  const handle = () => {
    setErr(null);
    startTransition(async () => {
      try {
        await togglePublishAction(invite.id, !isPublished);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Қате");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handle}
        disabled={isPending || isDisabled}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          isPublished
            ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
        )}
      >
        {isPending ? "..." : isPublished ? "Жасыру" : "Жариялау"}
      </button>
      {err && <p className="text-[10px] text-red-500 text-right">{err}</p>}
    </div>
  );
}

export function InviteTable({ invites }: { invites: AdminInvite[] }) {
  if (invites.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-400 py-8">Шақыру жоқ</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Тақырып
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">
              Иесі
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Статус
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
              Қонақтар
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden lg:table-cell">
              Мерзім
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Іс-әрекет
            </th>
          </tr>
        </thead>
        <tbody>
          {invites.map((inv) => (
            <tr
              key={inv.id}
              className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors"
            >
              <td className="px-4 py-3">
                <p className="font-medium text-zinc-900 truncate max-w-[180px]">
                  {inv.title}
                </p>
                <p className="text-[11px] font-mono text-zinc-400">
                  /{inv.slug}
                </p>
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500 hidden md:table-cell">
                {inv.user.name ?? inv.user.email}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={inv.status as never} />
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-zinc-700 hidden sm:table-cell">
                {inv._count.guests}
              </td>
              <td className="px-4 py-3 text-right text-xs text-zinc-400 tabular-nums hidden lg:table-cell">
                {inv.expiresAt
                  ? new Date(inv.expiresAt).toLocaleDateString("kk-KZ", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                <ToggleButton invite={inv} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
