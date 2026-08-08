import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { resolveLang } from "@/lib/i18n";
import { safeRedirectTarget, buildRegisterUrl } from "@/lib/auth-redirect";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Кіру — Шақыру",
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ from?: string; lang?: string }>;
}

const T = {
  kk: { tagline: "Жүйеге кіріңіз", noAccount: "Тіркелмегенсіз бе?", register: "Тіркелу" },
  ru: { tagline: "Войдите в аккаунт", noAccount: "Ещё нет аккаунта?", register: "Регистрация" },
} as const;

export default async function LoginPage({ searchParams }: Props) {
  const { from, lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);
  const t = T[lang];

  // Canonical rule: an already-authenticated visitor never sees the auth
  // form — they're bounced straight to their intended destination (or
  // /dashboard). This is what prevents an authenticated user from ever
  // getting stuck in a login loop just by landing on this URL.
  const session = await getSession();
  if (session) redirect(safeRedirectTarget(from));

  const registerHref = buildRegisterUrl({ from, lang });

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-bold text-rose-500 tracking-tight">
            Шақыру
          </Link>
          <p className="mt-1 text-sm text-zinc-500">{t.tagline}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <LoginForm from={from} lang={lang} />

          <div className="mt-5 text-center">
            <p className="text-sm text-zinc-500">
              {t.noAccount}{" "}
              <Link
                href={registerHref}
                className="font-semibold text-rose-500 hover:text-rose-600 transition-colors"
              >
                {t.register}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
