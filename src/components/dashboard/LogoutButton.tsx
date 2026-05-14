"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => logoutAction())}
      className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors disabled:opacity-50"
    >
      {pending ? "..." : "Шығу"}
    </button>
  );
}
