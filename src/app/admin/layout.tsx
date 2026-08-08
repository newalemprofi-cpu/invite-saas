import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Шолу" },
  { href: "/admin/invites", label: "Шақырулар" },
  { href: "/admin/users", label: "Пайдаланушылар" },
  { href: "/admin/payments", label: "Төлемдер" },
  { href: "/admin/analytics", label: "Аналитика" },
  { href: "/admin/templates", label: "Шаблондар" },
  { href: "/admin/site", label: "Сайт CMS" },
  { href: "/admin/settings", label: "Баптаулар" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen" style={{ background: "var(--ivory)" }}>
      <header style={{ background: "var(--charcoal)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="font-serif text-xl font-semibold" style={{ color: "var(--gold)" }}>Шақыру</Link>
            <span className="label-caps px-2 py-0.5 rounded-full text-[9px]" style={{ background: "rgba(196,150,62,0.15)", color: "var(--gold)", border: "1px solid rgba(196,150,62,0.25)" }}>Admin</span>
          </div>
          <Link href="/dashboard" className="text-sm font-medium" style={{ color: "#6E6560" }}>← Dashboard</Link>
        </div>
      </header>

      <div style={{ background: "white", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-0 overflow-x-auto">
            {NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 border-transparent transition-colors"
                style={{ color: "var(--muted)" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
