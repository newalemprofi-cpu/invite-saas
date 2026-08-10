import Link from "next/link";
import { COMMON, type Lang } from "@/lib/i18n";
import { buildLoginUrl } from "@/lib/auth-redirect";

interface Props {
  lang: Lang;
  authenticated: boolean;
}

const T = {
  kk: {
    templates: "Шаблондар",
    howItWorks: "Қалай жұмыс істейді",
    cta: "Шақыру жасау",
  },
  ru: {
    templates: "Шаблоны",
    howItWorks: "Как это работает",
    cta: "Создать приглашение",
  },
} as const;

/**
 * Shared marketing header — the homepage previously had its own inline
 * brand block (Latin "Shaqyru") while /templates had a different one
 * (Cyrillic "Шақыру"); this is the one wordmark going forward. Kept
 * intentionally compact on mobile: logo + a single auth link, no hamburger
 * menu — the nav links are a desktop-only affordance.
 */
export function SiteHeader({ lang, authenticated }: Props) {
  const t = T[lang];
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur"
      style={{ background: "rgba(250,248,243,0.88)", borderBottom: "1px solid var(--border)" }}
    >
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href={`/?lang=${lang}`}
          className="font-serif text-xl sm:text-2xl font-semibold shrink-0"
          style={{ color: "var(--charcoal)" }}
        >
          Шақыру
        </Link>

        <div className="hidden md:flex items-center gap-7">
          <Link href={`/templates?lang=${lang}`} className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            {t.templates}
          </Link>
          <a href="#how-it-works" className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            {t.howItWorks}
          </a>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {authenticated ? (
            <Link href={`/dashboard?lang=${lang}`} className="text-sm font-medium" style={{ color: "var(--gold-dark)" }}>
              {COMMON[lang].myInvitations}
            </Link>
          ) : (
            <Link href={buildLoginUrl({ lang })} className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              {COMMON[lang].login}
            </Link>
          )}
          <Link href={`/templates?lang=${lang}`} className="btn-gold hidden sm:inline-flex text-xs px-4 py-2.5">
            {t.cta}
          </Link>
        </div>
      </nav>
    </header>
  );
}
