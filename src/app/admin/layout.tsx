import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV_LINKS = [
  { href: "/admin", label: "Шолу", exact: true },
  { href: "/admin/invites", label: "Шақырулар" },
  { href: "/admin/users", label: "Пайдаланушылар" },
  { href: "/admin/payments", label: "Төлемдер" },
  { href: "/admin/settings", label: "Баптаулар" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-zinc-50">
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

      {/* Sub-nav */}
      <div className="bg-white border-b border-zinc-100">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-3 text-sm font-medium text-zinc-500 hover:text-zinc-900 whitespace-nowrap border-b-2 border-transparent hover:border-zinc-300 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
