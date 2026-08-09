"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Sub-nav for the Payments admin section only — the main admin shell
// (src/app/admin/layout.tsx) is untouched; its top-level "Төлемдер" link
// still points at /admin/payments (now this section's "Төлемдер тарихы"
// landing page). Kazakh-only, matching every other existing admin screen.
const SUB_NAV = [
  { href: "/admin/payments", label: "Төлемдер тарихы" },
  { href: "/admin/payments/manual", label: "Қолмен төлемдер" },
  { href: "/admin/payments/providers", label: "Провайдерлер" },
  { href: "/admin/payments/refunds", label: "Қайтарымдар" },
  { href: "/admin/payments/promocodes", label: "Промокодтар" },
  { href: "/admin/payments/stats", label: "Статистика" },
];

export default function PaymentsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-6">
      <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-white border border-zinc-100 shadow-sm p-1.5">
        {SUB_NAV.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                active ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
