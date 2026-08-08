import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { TEMPLATE_FILTERS, localizeTemplate } from "@/lib/templates";
import { getDbTemplates } from "@/lib/db-templates";
import { getAdminConfig } from "@/lib/admin-config";
import { resolveLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Шаблондар — Шақыру",
  description: "Премиум цифрлы шақырулар. Үйлену той, ұзату, туылған күн үшін.",
};

const T = {
  kk: {
    myInvitations: "Менің шақыруларым",
    login: "Кіру",
    register: "Тіркелу",
    kicker: "Шаблондар",
    title: "Өз тойыңызға лайықты дизайн",
    subtitle: "Кез-келген шаблонды таңдап, нақты уақытта редакциялаңыз. Kaspi арқылы төлеп — бірден бөлісіңіз.",
    choose: "Таңдау →",
    premium: "Premium",
    empty: "Бұл санатта шаблондар жоқ",
    footer: "Қазақстандық премиум цифрлы шақыру сервисі",
  },
  ru: {
    myInvitations: "Мои приглашения",
    login: "Войти",
    register: "Регистрация",
    kicker: "Шаблоны",
    title: "Дизайн, достойный вашего праздника",
    subtitle: "Выберите любой шаблон и редактируйте его в реальном времени. Оплатите через Kaspi — и сразу делитесь.",
    choose: "Выбрать →",
    premium: "Premium",
    empty: "В этой категории пока нет шаблонов",
    footer: "Премиальный сервис цифровых приглашений в Казахстане",
  },
} as const;

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; lang?: string }>;
}) {
  const { cat = "all", lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);
  const t = T[lang];
  const [session, templates, config] = await Promise.all([
    getSession(),
    getDbTemplates({ cat, activeOnly: true }),
    getAdminConfig(),
  ]);

  return (
    <div className="min-h-screen" style={{ background: "var(--ivory)" }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{ background: "rgba(250,248,243,0.9)", borderBottom: "1px solid var(--border)" }}
      >
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-semibold" style={{ color: "var(--charcoal)" }}>
            Шақыру
          </Link>
          <div className="flex items-center gap-3">
            {session ? (
              <Link href={`/dashboard?lang=${lang}`} className="btn-outline text-sm px-5 py-2.5">{t.myInvitations}</Link>
            ) : (
              <>
                <Link href={`/auth/login?from=${encodeURIComponent(`/templates?lang=${lang}`)}&lang=${lang}`} className="text-sm font-medium" style={{ color: "var(--muted)" }}>{t.login}</Link>
                <Link href={`/auth/register?from=${encodeURIComponent(`/templates?lang=${lang}`)}&lang=${lang}`} className="btn-gold text-sm">{t.register}</Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Heading */}
        <div className="text-center mb-12">
          <p className="label-caps mb-3" style={{ color: "var(--gold)" }}>{t.kicker}</p>
          <h1 className="heading-display text-4xl sm:text-5xl mb-4" style={{ color: "var(--charcoal)" }}>
            {t.title}
          </h1>
          <p className="text-base max-w-lg mx-auto" style={{ color: "var(--muted)" }}>
            {t.subtitle}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {TEMPLATE_FILTERS.map((f) => {
            const isActive = cat === f.id;
            const href = f.id === "all" ? `/templates?lang=${lang}` : `/templates?cat=${f.id}&lang=${lang}`;
            return (
              <Link
                key={f.id}
                href={href}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={
                  isActive
                    ? { background: "var(--charcoal)", color: "#FAF8F3" }
                    : { background: "white", color: "var(--muted)", border: "1px solid var(--border)" }
                }
              >
                {lang === "ru" ? f.label : f.labelKk}
              </Link>
            );
          })}
        </div>

        {/* Template grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map((tmpl) => {
            const localized = localizeTemplate(tmpl, lang);
            return (
              <Link
                key={tmpl.id}
                href={`/templates/${tmpl.slug}?lang=${lang}`}
                className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                style={{ background: tmpl.bg, boxShadow: "0 2px 16px rgba(28,25,23,0.06)" }}
              >
                <div
                  className={`h-48 bg-gradient-to-br ${tmpl.gradient} flex flex-col items-center justify-center gap-3 p-5`}
                >
                  <span className="text-5xl drop-shadow-sm">{tmpl.emoji}</span>
                  <div className="text-center">
                    <p className="font-serif text-lg font-semibold leading-tight" style={{ color: tmpl.textDark }}>
                      {tmpl.demoName1}{tmpl.demoName2 ? ` & ${tmpl.demoName2}` : ""}
                    </p>
                  </div>
                </div>

                <div className="p-4" style={{ background: tmpl.bg }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-sm leading-tight" style={{ color: tmpl.textDark }}>
                        {localized.name}
                      </h3>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: tmpl.textMuted }}>
                        {localized.description}
                      </p>
                    </div>
                    {tmpl.isPremium && (
                      <span
                        className="label-caps shrink-0 px-2 py-0.5 rounded-full text-[9px]"
                        style={{ background: "rgba(196,150,62,0.12)", color: "var(--gold-dark)", border: "1px solid rgba(196,150,62,0.2)" }}
                      >
                        {t.premium}
                      </span>
                    )}
                  </div>
                  <div
                    className="flex items-center justify-between pt-2"
                    style={{ borderTop: `1px solid ${tmpl.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}` }}
                  >
                    <p className="font-serif font-semibold" style={{ color: tmpl.accent }}>
                      {config.price.toLocaleString("kk-KZ")} ₸
                    </p>
                    <span className="text-xs font-medium group-hover:underline transition-all" style={{ color: tmpl.accent }}>
                      {t.choose}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-20">
            <p style={{ color: "var(--muted)" }}>{t.empty}</p>
          </div>
        )}
      </main>

      <footer
        className="mt-16 py-8 px-4 text-center text-sm"
        style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}
      >
        <Link href="/" style={{ color: "var(--gold)" }}>Шақыру</Link>{" "}
        · {t.footer}
      </footer>
    </div>
  );
}
