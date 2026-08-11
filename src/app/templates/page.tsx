import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { TEMPLATE_FILTERS, localizeTemplate, type Template } from "@/lib/templates";
import { getDbTemplates } from "@/lib/db-templates";
import { getAdminConfig } from "@/lib/admin-config";
import { resolveLang } from "@/lib/i18n";
import { getSiteContent } from "@/lib/site-content";
import { getWeddingLayout } from "@/lib/wedding-template-layouts";

/**
 * Compact (h-48) composition cue for the grid card's fallback — NOT the
 * full WeddingHero (that composition needs far more vertical room than a
 * landscape card affords), but a small, faithful visual hint of the same
 * photoMode so the 5 flagship templates are still recognizable at a glance
 * per "Template card = compact representation" without ever falling back
 * to a plain gradient-only placeholder.
 */
function WeddingCardCue({ tmpl, name }: { tmpl: Template; name: string }) {
  const layout = getWeddingLayout(tmpl.slug)!;
  const textColor = tmpl.textDark;

  if (layout.photoMode === "top-band") {
    return (
      <div className="h-48 flex flex-col" style={{ background: tmpl.dark ? "#1C1917" : "#FFFDF8" }}>
        <div className={`h-[42%] bg-gradient-to-br ${tmpl.gradient} relative shrink-0`}>
          <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: tmpl.accent, opacity: 0.6 }} />
        </div>
        <div className="flex-1 flex items-center justify-center px-3">
          <p className="font-serif text-sm font-semibold text-center leading-tight" style={{ color: textColor }}>{name}</p>
        </div>
      </div>
    );
  }

  if (layout.photoMode === "framed-oval") {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2" style={{ background: "linear-gradient(180deg,#F7FAF3,#F0F5EA)" }}>
        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${tmpl.gradient}`} style={{ boxShadow: `0 0 0 2px #F7FAF3, 0 0 0 3px ${tmpl.accent}55` }} />
        <p className="font-serif text-sm font-semibold text-center leading-tight px-3" style={{ color: textColor }}>{name}</p>
      </div>
    );
  }

  if (layout.photoMode === "fade-dark") {
    return (
      <div className="h-48 flex flex-col overflow-hidden" style={{ background: "linear-gradient(180deg,#211D19,#151210)" }}>
        <div className={`h-[55%] bg-gradient-to-br ${tmpl.gradient} shrink-0`} style={{ maskImage: "linear-gradient(180deg,black 0%,transparent 100%)", WebkitMaskImage: "linear-gradient(180deg,black 0%,transparent 100%)" }} />
        <div className="flex-1 flex items-center justify-center px-3 -mt-4">
          <p className="font-serif text-sm font-semibold text-center leading-tight" style={{ color: tmpl.accent }}>{name}</p>
        </div>
      </div>
    );
  }

  if (layout.photoMode === "arched-frame") {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2" style={{ background: "linear-gradient(180deg,#FBF4E7,#F5EAD4)" }}>
        <div className={`w-14 h-16 bg-gradient-to-br ${tmpl.gradient}`} style={{ borderRadius: "50% 50% 4px 4px", boxShadow: `0 0 0 1px ${tmpl.accent}66` }} />
        <p className="font-serif text-sm font-semibold text-center leading-tight px-3" style={{ color: textColor }}>{name}</p>
      </div>
    );
  }

  // full-bleed (Romantic): text anchored at the bottom over the gradient,
  // matching the real composition's own "photo dominant, text over it" cue.
  return (
    <div className={`h-48 bg-gradient-to-br ${tmpl.gradient} flex flex-col justify-end p-4`}>
      <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(255,255,255,0.55)" }}>
        <p className="font-serif text-sm font-semibold text-center leading-tight" style={{ color: textColor }}>{name}</p>
      </div>
    </div>
  );
}

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
  searchParams: Promise<{ cat?: string; lang?: string; eventCategory?: string }>;
}) {
  const { cat = "all", lang: langParam, eventCategory } = await searchParams;
  const lang = resolveLang(langParam);
  const t = T[lang];
  const [session, templates, config, content] = await Promise.all([
    getSession(),
    getDbTemplates({ cat, activeOnly: true }),
    getAdminConfig(),
    getSiteContent(),
  ]);

  const colorVars = {
    "--color-primary": content.primaryColor,
    "--color-primary-foreground": content.primaryColorForeground,
  } as React.CSSProperties;

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--ivory)", fontFamily: "var(--font-montserrat)", ...colorVars }}
    >
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
                href={`/templates/${tmpl.slug}?lang=${lang}${eventCategory ? `&eventCategory=${eventCategory}` : ""}`}
                className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                style={{ background: tmpl.bg, boxShadow: "0 2px 16px rgba(28,25,23,0.06)" }}
              >
                {tmpl.previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tmpl.previewImage} alt={localized.name} className="h-48 w-full object-cover" loading="lazy" />
                ) : getWeddingLayout(tmpl.slug) ? (
                  <WeddingCardCue tmpl={tmpl} name={`${tmpl.demoName1}${tmpl.demoName2 ? ` & ${tmpl.demoName2}` : ""}`} />
                ) : (
                  <div
                    className={`h-48 bg-gradient-to-br ${tmpl.gradient} flex flex-col items-center justify-center gap-3 p-5`}
                  >
                    <div className="w-8 h-px opacity-40" style={{ background: tmpl.accent }} />
                    <div className="text-center">
                      <p className="font-serif text-xl font-semibold leading-tight" style={{ color: tmpl.textDark }}>
                        {tmpl.demoName1}{tmpl.demoName2 ? ` & ${tmpl.demoName2}` : ""}
                      </p>
                    </div>
                    <div className="w-8 h-px opacity-40" style={{ background: tmpl.accent }} />
                  </div>
                )}

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
