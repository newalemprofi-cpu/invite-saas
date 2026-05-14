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
    <div className="min-h-screen bg-zinc-50">
      {/* Nav */}
      <header className="sticky top-0 z-20 bg-white border-b border-zinc-100">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="font-bold text-rose-500 text-lg tracking-tight"
          >
            Шақыру
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-zinc-500 truncate max-w-[200px]">
              {session.name ?? session.email}
            </span>
            {session.role === "ADMIN" && (
              <Link
                href="/admin"
                className="text-xs font-medium text-amber-600 bg-amber-50 rounded-full px-2.5 py-1 hover:bg-amber-100 transition-colors"
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
