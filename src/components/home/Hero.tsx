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
  location: "Ritz-Carlton, Алматы",
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
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-14 sm:pb-20 grid md:grid-cols-[1.08fr_0.92fr] gap-10 md:gap-6 items-center">
        {/* Left: copy (~55% on desktop). Natural DOM order already puts this
            first, which is exactly what's wanted on mobile too (headline →
            description → CTA → phone, phone last/underneath) — no `order-*`
            utilities needed. */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left animate-fade-up">
          <p className="label-caps mb-4" style={{ color: "var(--color-primary)" }}>{t.eyebrow}</p>
          <h1
            className="heading-display text-4xl sm:text-5xl lg:text-[3.6rem] whitespace-pre-line"
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

        {/* Right: realistic iPhone mockup with a real invite preview (~45% on desktop) */}
        <div className="relative flex justify-center md:justify-end animate-fade-in animate-delay-200">
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "70%", height: "70%", top: "10%", left: "50%", transform: "translateX(-50%)",
              background: "radial-gradient(circle, rgba(196,150,62,0.14) 0%, transparent 70%)",
            }}
          />
          <div
            className="iphone-frame relative w-[220px] sm:w-[260px] lg:w-[300px]"
            style={{ animation: "var(--animate-float)" }}
          >
            <span className="iphone-side-button" style={{ top: "14%", width: 2, height: "5%" }} />
            <span className="iphone-side-button" style={{ top: "21%", width: 2, height: "9%" }} />
            <span className="iphone-side-button" style={{ top: "31%", width: 2, height: "9%" }} />
            <span className="iphone-side-button is-right" style={{ top: "20%", width: 2, height: "12%" }} />
            <div className="iphone-screen">
              <div className="iphone-island" />
              <div className="invite-preview-scroll">
                <StaticInviteCard data={DEMO_INVITE} fill />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
