import Link from "next/link";
import Image from "next/image";
import type { Lang } from "@/lib/i18n";
import type { SiteContent } from "@/lib/site-content";
import type { Template } from "@/lib/templates";

interface Props {
  lang: Lang;
  content: SiteContent;
  /** Admin's custom-uploaded hero screenshot URL, already resolved — wins over previewTemplate when set. */
  previewImageUrl: string | null;
  /** Admin-picked (or graceful-default) real InviteTemplate to render inside the phone when no custom image is set. */
  previewTemplate: Template | null;
}

const T = {
  kk: {
    eyebrow: "ОНЛАЙН ШАҚЫРУ",
    screenEyebrow: "Сізді шақырамыз",
    demoDate: "12 қыркүйек 2026",
    demoTime: "18:00",
    demoLocation: "Алматы, Grand Hall",
    rsvp: "Қатысуды растау",
  },
  ru: {
    eyebrow: "ОНЛАЙН ПРИГЛАШЕНИЕ",
    screenEyebrow: "Приглашаем Вас",
    demoDate: "12 сентября 2026",
    demoTime: "18:00",
    demoLocation: "Алматы, Grand Hall",
    rsvp: "Подтвердить участие",
  },
} as const;

// Measured directly off public/images/hero/iphone-frame-transparent.png
// (a 1254x1254 canvas): the screen cutout spans x 335-917, y 163-1105.
// Converted to percentages of the full canvas so this stays correct at any
// rendered size, as long as the wrapping .hero-phone element keeps the
// image's native 1:1 aspect ratio (see globals.css). The source PNG's
// "transparent" screen was actually a checkerboard baked in as near-opaque
// pixels (common AI-image-gen artifact) — the shipped asset was
// re-processed with a real alpha punch over exactly this rectangle so the
// dynamic preview underneath actually shows through instead of being
// covered by checkerboard pixels.
const SCREEN_INSET = { top: "13%", bottom: "11.8%", left: "26.7%", right: "26.8%" };

export function Hero({ lang, content, previewImageUrl, previewTemplate }: Props) {
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
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-14 sm:pb-20 grid md:grid-cols-[1.4fr_1fr] gap-10 md:gap-8 items-center">
        {/* Left: copy (~58% on desktop). Natural DOM order already puts this
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

        {/* Right: the supplied realistic iPhone PNG on top, a dynamic
            invitation preview layered underneath it inside the screen
            cutout. Screen content is fully admin-manageable (Site CMS →
            "Hero алдын ала көрінісі"): a custom uploaded screenshot if set,
            else a real InviteTemplate rendered with its own style tokens. */}
        <div className="relative flex justify-center md:justify-end animate-fade-in animate-delay-200">
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "65%", height: "65%", top: "12%", left: "50%", transform: "translateX(-50%)",
              background: "radial-gradient(circle, rgba(196,150,62,0.13) 0%, transparent 70%)",
            }}
          />
          <div className="hero-phone relative w-[290px] md:w-[340px] lg:w-[420px]">
            <div className="hero-phone-screen absolute overflow-hidden" style={SCREEN_INSET}>
              {previewImageUrl ? (
                <Image
                  src={previewImageUrl}
                  alt="Shaqyru шақыру алдын ала көрінісі"
                  fill
                  className="object-cover"
                  sizes="420px"
                  priority
                />
              ) : previewTemplate ? (
                <TemplatePreviewScreen t={t} tmpl={previewTemplate} />
              ) : (
                <div className="w-full h-full" style={{ background: "var(--ivory)" }} />
              )}
            </div>
            <Image
              src="/images/hero/iphone-frame-transparent.png"
              alt=""
              fill
              className="hero-phone-frame pointer-events-none select-none"
              sizes="420px"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

interface ScreenCopy {
  screenEyebrow: string;
  demoDate: string;
  demoTime: string;
  demoLocation: string;
  rsvp: string;
}

function TemplatePreviewScreen({ t, tmpl }: { t: ScreenCopy; tmpl: Template }) {
  return (
    <div className={`h-full pt-6 bg-gradient-to-br ${tmpl.gradient} flex flex-col items-center justify-center gap-2.5 px-4 text-center`}>
      <p className="label-caps text-[8px]" style={{ color: tmpl.textMuted }}>{t.screenEyebrow}</p>
      <p className="font-serif text-base font-semibold leading-tight" style={{ color: tmpl.textDark }}>
        {tmpl.demoName1}
        {tmpl.demoName2 ? ` & ${tmpl.demoName2}` : ""}
      </p>
      <div
        className="w-full h-px opacity-30"
        style={{ background: `linear-gradient(90deg, transparent, ${tmpl.accent}, transparent)` }}
      />
      <div style={{ color: tmpl.textMuted }}>
        <p className="font-serif text-xs">{t.demoDate}</p>
        <p className="text-[10px] mt-0.5">{t.demoTime} · {t.demoLocation}</p>
      </div>
      <div
        className="mt-1 px-3 py-1.5 rounded-full text-[9px] font-semibold text-white whitespace-nowrap"
        style={{ background: tmpl.accent }}
      >
        {t.rsvp}
      </div>
    </div>
  );
}
