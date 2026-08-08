import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/dashboard/LogoutButton";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  return (
    <div className="min-h-screen" style={{ background: "var(--ivory)" }}>
      <header
        className="sticky top-0 z-20 backdrop-blur"
        style={{
          background: "rgba(250,248,243,0.9)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="font-serif text-xl font-semibold"
            style={{ color: "var(--charcoal)" }}
          >
            Шақыру
          </Link>

          <div className="flex items-center gap-4">
            <span
              className="hidden sm:block text-sm truncate max-w-[200px]"
              style={{ color: "var(--muted)" }}
            >
              {session.name ?? session.email}
            </span>
            {session.role === "ADMIN" && (
              <Link
                href="/admin"
                className="label-caps px-3 py-1 rounded-full transition-colors"
                style={{
                  background: "rgba(196,150,62,0.1)",
                  color: "var(--gold-dark)",
                  border: "1px solid rgba(196,150,62,0.2)",
                }}
              >
                Admin
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
