import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import type { SiteContent } from "@/lib/site-content";
import { StaticInviteCard } from "@/components/StaticInviteCard";

interface Props {
  lang: Lang;
  content: SiteContent;
}

const T = {
  kk: { eyebrow: "ОНЛАЙН ШАҚЫРУ" },
  ru: { eyebrow: "ОНЛАЙН ПРИГЛАШЕНИЕ" },
} as const;

// A demo invitation, not a real customer record — reuses the app's own
// public-invite preview card (StaticInviteCard) so the hero shows a real
// piece of the actual product instead of a copied/stock illustration.
const DEMO_INVITE = {
  template: "luxury_gold",
  groomName: "Ерлан",
  brideName: "Аружан",
  date: "2026-09-12",
  time: "18:00",
  location: "Almaty, Ritz-Carlton",
};

export function Hero({ lang, content }: Props) {
  const t = T[lang];
  const title = lang === "ru" ? content.heroTitleRu : content.heroTitle;
  const subtitle = lang === "ru" ? content.heroSubtitleRu : content.heroSubtitle;
  const ctaPrimary = lang === "ru" ? content.heroCtaPrimaryRu : content.heroCtaPrimary;
  const ctaSecondary = lang === "ru" ? content.heroCtaSecondaryRu : content.heroCtaSecondary;

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: "55vw", height: "55vw", maxWidth: 480, maxHeight: 480,
          background: "radial-gradient(ellipse at top right, rgba(196,150,62,0.12) 0%, transparent 65%)",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-14 sm:pb-20 grid md:grid-cols-2 gap-10 md:gap-8 items-center">
        {/* Left: copy */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left animate-fade-up">
          <p className="label-caps mb-4" style={{ color: "var(--gold)" }}>{t.eyebrow}</p>
          <h1
            className="heading-display text-4xl sm:text-5xl lg:text-[3.4rem] whitespace-pre-line"
            style={{ color: "var(--charcoal)" }}
          >
            {title}
          </h1>
          <p className="mt-5 text-base sm:text-lg max-w-md" style={{ color: "var(--muted)" }}>
            {subtitle}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link href={`/templates?lang=${lang}`} className="btn-gold justify-center">
              {ctaPrimary} →
            </Link>
            <Link href={`/templates?lang=${lang}`} className="btn-outline justify-center">
              {ctaSecondary}
            </Link>
          </div>
        </div>

        {/* Right: phone mockup with a real invite preview */}
        <div className="flex justify-center md:justify-end animate-fade-in animate-delay-200">
          <div className="phone-frame w-[240px] sm:w-[270px] p-2.5" style={{ animation: "var(--animate-float)" }}>
            <div className="phone-screen">
              <StaticInviteCard data={DEMO_INVITE} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
