import Link from "next/link";
import Image from "next/image";
import type { Lang } from "@/lib/i18n";
import type { SiteContent } from "@/lib/site-content";

interface Props {
  lang: Lang;
  content: SiteContent;
}

const T = {
  kk: {
    eyebrow: "ОНЛАЙН ШАҚЫРУ",
    imageAlt: "Қолда тұрған iPhone экранында Shaqyru шақыруы",
  },
  ru: {
    eyebrow: "ОНЛАЙН ПРИГЛАШЕНИЕ",
    imageAlt: "iPhone в руке с приглашением Shaqyru на экране",
  },
} as const;

// Single marketing photo (hand holding an iPhone showing a real Shaqyru
// invitation) — replaces the old CSS-only phone shell, which read as an
// oversized generic device mockup rather than product proof. No CSS/SVG
// hand recreation: this is a placeholder path until the real asset is
// dropped in at this exact location.
const HERO_IMAGE_SRC = "/images/hero/phone-in-hand.webp";

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
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-14 sm:pb-20 grid md:grid-cols-[1.3fr_1fr] gap-10 md:gap-8 items-center">
        {/* Left: copy (~57% on desktop). Natural DOM order already puts this
            first, which is exactly what's wanted on mobile too (headline →
            description → CTA → image, image last/underneath) — no `order-*`
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

        {/* Right: single marketing photo — hand holding an iPhone with a real
            Shaqyru invitation on screen (~43% column on desktop). Height is
            capped so the hero always fits the first viewport; object-contain
            guarantees the photo is never stretched or cropped regardless of
            its actual pixel dimensions once supplied. */}
        <div className="relative flex justify-center md:justify-end animate-fade-in animate-delay-200">
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "70%", height: "70%", top: "10%", left: "50%", transform: "translateX(-50%)",
              background: "radial-gradient(circle, rgba(196,150,62,0.14) 0%, transparent 70%)",
            }}
          />
          <div className="relative w-full max-w-[360px] md:max-w-none h-[380px] sm:h-[460px] md:h-[560px] lg:h-[650px]">
            <Image
              src={HERO_IMAGE_SRC}
              alt={t.imageAlt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 85vw, 42vw"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
