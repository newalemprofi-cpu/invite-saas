import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { resolveLang } from "@/lib/i18n";
import { safeRedirectTarget, buildLoginUrl } from "@/lib/auth-redirect";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Тіркелу — Шақыру",
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ from?: string; lang?: string }>;
}

const T = {
  kk: { tagline: "Тегін тіркеліңіз", haveAccount: "Тіркелгенсіз бе?", login: "Кіру" },
  ru: { tagline: "Зарегистрируйтесь бесплатно", haveAccount: "Уже есть аккаунт?", login: "Войти" },
} as const;

export default async function RegisterPage({ searchParams }: Props) {
  const { from, lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);
  const t = T[lang];

  // Same rule as /auth/login: an already-authenticated visitor never sees
  // the auth form.
  const session = await getSession();
  if (session) redirect(safeRedirectTarget(from));

  const loginHref = buildLoginUrl({ from, lang });

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-10">
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
          <RegisterForm from={from} lang={lang} />

          <div className="mt-5 text-center">
            <p className="text-sm text-zinc-500">
              {t.haveAccount}{" "}
              <Link
                href={loginHref}
                className="font-semibold text-rose-500 hover:text-rose-600 transition-colors"
              >
                {t.login}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
