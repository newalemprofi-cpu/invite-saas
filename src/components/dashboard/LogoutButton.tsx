"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { resolveLang } from "@/lib/i18n";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  const lang = resolveLang(useSearchParams().get("lang"));
  const label = lang === "ru" ? "Выйти" : "Шығу";

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => logoutAction())}
      className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors disabled:opacity-50"
    >
      {pending ? "..." : label}
    </button>
  );
}
