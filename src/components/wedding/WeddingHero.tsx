import type { WeddingTemplateLayout } from "@/lib/wedding-template-layouts";

/**
 * THE single rendering source of truth for a Wedding template's hero
 * composition (photo + names + core event facts). Used identically by:
 *   - the constructor's live preview / dashboard preview (InvitePreview.tsx)
 *   - the public invitation page (/i/[slug])
 *   - the template detail page's phone mockup (/templates/[slug])
 * Each caller supplies its own container size (phone-frame vs full
 * viewport) and its own data mapping (EditorData vs the public page's local
 * `D` shape vs demo data) into this same normalized WeddingHeroData shape —
 * this component itself never imports either of those types, keeping it a
 * pure presentational component with no coupling to any one surface's data
 * model. Customer data flows in as plain strings; the ONLY thing this
 * component decides is HOW to compose them, per `layout.photoMode`.
 */

export interface WeddingHeroData {
  name: string;
  partner?: string | null;
  hostsLine?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  address?: string | null;
  message?: string | null;
  note?: string | null;
  age?: string | null;
  photoUrl?: string | null;
}

export interface WeddingHeroTokens {
  accent: string;
  textDark: string;
  textMuted: string;
  isDark: boolean;
  /** Fallback background when there is no photo yet. */
  bg: string;
}

interface WeddingHeroProps {
  data: WeddingHeroData;
  tokens: WeddingHeroTokens;
  layout: WeddingTemplateLayout;
  /** true = small phone-frame container (constructor/dashboard/template
   * detail mockup); false = full public page viewport. Only affects scale
   * (fonts/padding), never the underlying composition. */
  compact?: boolean;
}

function fmtDate(s: string): string {
  try {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("kk-KZ", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return s;
  }
}

const PLACEHOLDER_TINT: Record<WeddingTemplateLayout["decorPreset"], string> = {
  romantic: "linear-gradient(160deg,#F3D9DE,#EBC4CE,#E4B9C6)",
  "classic-gold": "linear-gradient(160deg,#F7EFDC,#EFE1BE,#E8D6A8)",
  floral: "linear-gradient(160deg,#E7EEDE,#D8E5CB,#CBDCC0)",
  "dark-luxury": "linear-gradient(160deg,#2A2622,#1C1917,#100E0C)",
  ethno: "linear-gradient(160deg,#E9DCC3,#DCC79E,#CBAE83)",
};

/** Renders the customer's photo, or — when absent — a tasteful,
 * template-tinted placeholder. Never a broken-image icon. */
function PhotoOrPlaceholder({
  photoUrl, decorPreset, className, style, children,
}: {
  photoUrl?: string | null;
  decorPreset: WeddingTemplateLayout["decorPreset"];
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <div className={className} style={{ background: photoUrl ? undefined : PLACEHOLDER_TINT[decorPreset], ...style }}>
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      {children}
    </div>
  );
}

/* ── Small, restrained decorative SVGs (one per decorPreset) ───────────── */

function RomanticFlourish({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 100 40" className="w-16 h-6 opacity-60" fill="none">
      <path d="M2 20 Q25 4 50 20 Q75 36 98 20" stroke={accent} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <circle cx="50" cy="20" r="2.2" fill={accent} opacity="0.7" />
    </svg>
  );
}

function ClassicCorner({ accent, flip }: { accent: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className="w-6 h-6" style={flip ? { transform: "scaleX(-1)" } : undefined} fill="none">
      <path d="M2 2 L2 14 M2 2 L14 2" stroke={accent} strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
      <circle cx="2" cy="2" r="1.4" fill={accent} opacity="0.6" />
    </svg>
  );
}

function FloralSprig({ accent, mirror }: { accent: string; mirror?: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-10 h-10" style={mirror ? { transform: "scaleX(-1)" } : undefined} fill="none">
      <path d="M6 54 Q18 34 30 18" stroke="#8CA378" strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
      <ellipse cx="22" cy="38" rx="4.5" ry="8" fill="#9DB98A" opacity="0.35" transform="rotate(-30 22 38)" />
      <ellipse cx="30" cy="18" rx="4" ry="7" fill={accent} opacity="0.4" transform="rotate(10 30 18)" />
      <ellipse cx="12" cy="48" rx="3.5" ry="6" fill="#9DB98A" opacity="0.3" transform="rotate(-55 12 48)" />
    </svg>
  );
}

function DarkGoldArc({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 120 24" className="w-24 h-5 opacity-70" fill="none">
      <path d="M2 20 Q60 -4 118 20" stroke={accent} strokeWidth="1" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

function EthnoOrnament({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 80 20" className="w-14 h-4" fill="none">
      <path d="M2 10 H30 M50 10 H78" stroke={accent} strokeWidth="1" opacity="0.5" />
      <path d="M40 3 L46 10 L40 17 L34 10 Z" stroke={accent} strokeWidth="1" fill="none" opacity="0.6" />
    </svg>
  );
}

/* ── Shared hero-content block (names/hosts/date/venue/message/note) ───── */

function HeroContent({
  data, tokens, compact, kickerLabel, divider, overPhoto,
}: {
  data: WeddingHeroData;
  tokens: WeddingHeroTokens;
  compact: boolean;
  kickerLabel: string;
  divider: React.ReactNode;
  /** True when this text sits directly over the customer's photo (the
   * full-bleed Romantic composition) — adds a soft shadow so the kicker/
   * name stay readable regardless of how bright/busy the photo is,
   * independent of the gradient overlay beneath it. */
  overPhoto?: boolean;
}) {
  const displayName = data.partner ? `${data.name} & ${data.partner}` : data.name;
  const nameSize = compact ? "text-xl" : "text-4xl sm:text-5xl";
  const kickerSize = compact ? "text-[9px]" : "text-xs";
  const bodySize = compact ? "text-[10px]" : "text-sm";
  const gap = compact ? "gap-1.5" : "gap-4";
  const shadow = overPhoto ? { textShadow: "0 1px 6px rgba(0,0,0,0.35)" } : undefined;

  return (
    <div className={`flex flex-col items-center text-center ${gap} w-full`}>
      <p className={`label-caps ${kickerSize}`} style={{ color: tokens.textMuted, ...shadow }}>{kickerLabel}</p>
      <h1 className={`heading-display font-semibold leading-tight break-words ${nameSize}`} style={{ color: tokens.textDark, ...shadow }}>
        {displayName || "—"}
      </h1>
      {data.age && <p className={bodySize} style={{ color: tokens.textMuted }}>{data.age}</p>}
      {data.hostsLine && <p className={bodySize} style={{ color: tokens.textMuted }}>{data.hostsLine}</p>}
      {divider}
      {data.date && (
        <div className="flex flex-col items-center gap-0.5">
          <p className={`font-serif font-semibold ${compact ? "text-sm" : "text-xl sm:text-2xl"}`} style={{ color: tokens.textDark }}>
            {fmtDate(data.date)}
          </p>
          {data.time && <p className={bodySize} style={{ color: tokens.textMuted }}>{data.time}</p>}
        </div>
      )}
      {data.location && (
        <div className="flex flex-col items-center gap-0.5">
          <p className={`font-semibold ${compact ? "text-xs" : "text-base"}`} style={{ color: tokens.textDark }}>{data.location}</p>
          {data.address && <p className={bodySize} style={{ color: tokens.textMuted }}>{data.address}</p>}
        </div>
      )}
      {data.message && (
        <p className={`italic leading-relaxed ${bodySize}`} style={{ color: tokens.textMuted }}>&ldquo;{data.message}&rdquo;</p>
      )}
      {data.note && (
        <p className={`leading-relaxed ${compact ? "text-[9px]" : "text-xs"}`} style={{ color: tokens.textMuted }}>{data.note}</p>
      )}
    </div>
  );
}

export function WeddingHero({ data, tokens, layout, compact = false }: WeddingHeroProps) {
  const { photoMode, decorPreset } = layout;
  const pad = compact ? "px-4 py-4" : "px-6 py-10";

  /* 1 ── ROMANTIC: full-bleed photo, text anchored at the bottom over a
     soft gradient so it reads naturally as the photo dissolving into
     content, not a caption bar. */
  if (photoMode === "full-bleed") {
    return (
      <div className="relative w-full h-full flex-1 flex flex-col overflow-hidden" style={{ background: tokens.bg }}>
        <PhotoOrPlaceholder photoUrl={data.photoUrl} decorPreset={decorPreset} className="absolute inset-0" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.08) 35%, rgba(255,247,244,0.94) 78%, rgba(255,247,244,0.98) 100%)" }}
        />
        <div className={`relative z-10 mt-auto flex flex-col items-center ${pad} w-full`}>
          <HeroContent
            data={data}
            tokens={tokens}
            compact={compact}
            kickerLabel="Сізді шақырамыз"
            divider={<RomanticFlourish accent={tokens.accent} />}
            overPhoto
          />
        </div>
      </div>
    );
  }

  /* 2 ── CLASSIC GOLD: photo confined to the upper ~36%, ivory content
     panel below with thin gold framing — deliberately NOT full-bleed. */
  if (photoMode === "top-band") {
    return (
      <div className="w-full h-full flex-1 flex flex-col overflow-hidden" style={{ background: tokens.isDark ? "#1C1917" : "#FFFDF8" }}>
        <PhotoOrPlaceholder
          photoUrl={data.photoUrl}
          decorPreset={decorPreset}
          className="relative w-full"
          style={{ flex: "36 0 0px", minHeight: 0 }}
        >
          <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: tokens.accent, opacity: 0.6 }} />
        </PhotoOrPlaceholder>
        <div className={`relative flex flex-col items-center ${pad} w-full overflow-y-auto`} style={{ flex: "64 1 0px", minHeight: 0 }}>
          <div className="absolute top-1.5 left-1.5 pointer-events-none"><ClassicCorner accent={tokens.accent} /></div>
          <div className="absolute top-1.5 right-1.5 pointer-events-none"><ClassicCorner accent={tokens.accent} flip /></div>
          <HeroContent
            data={data}
            tokens={tokens}
            compact={compact}
            kickerLabel="Сізді шақырамыз"
            divider={
              <div className="flex items-center gap-2 w-full max-w-[200px]">
                <div className="flex-1 h-px" style={{ background: tokens.accent, opacity: 0.35 }} />
                <span style={{ color: tokens.accent, opacity: 0.7 }}>◆</span>
                <div className="flex-1 h-px" style={{ background: tokens.accent, opacity: 0.35 }} />
              </div>
            }
          />
        </div>
      </div>
    );
  }

  /* 3 ── FLORAL WATERCOLOR: circular framed portrait with watercolor
     sprigs, never full-screen. */
  if (photoMode === "framed-oval") {
    return (
      <div className="w-full h-full flex-1 flex flex-col items-center overflow-y-auto overflow-x-hidden" style={{ background: "linear-gradient(180deg,#F7FAF3,#F0F5EA)" }}>
        <div className={`relative shrink-0 ${compact ? "mt-5" : "mt-10"} aspect-square`} style={{ width: compact ? "min(62%, 190px)" : "min(38%, 300px)" }}>
          <div className="absolute -inset-3 opacity-70 pointer-events-none">
            <div className="absolute -top-2 -left-2"><FloralSprig accent={tokens.accent} /></div>
            <div className="absolute -bottom-2 -right-2"><FloralSprig accent={tokens.accent} mirror /></div>
          </div>
          <PhotoOrPlaceholder
            photoUrl={data.photoUrl}
            decorPreset={decorPreset}
            className="relative w-full h-full rounded-full overflow-hidden"
          />
          <div className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: `0 0 0 3px ${tokens.bg}, 0 0 0 4px ${tokens.accent}55` }} />
        </div>
        <div className={`flex flex-col items-center ${pad} w-full`}>
          <HeroContent
            data={data}
            tokens={tokens}
            compact={compact}
            kickerLabel="Сізді шақырамыз"
            divider={
              <div className="flex items-center gap-2">
                <div className="w-8 h-px" style={{ background: "#8CA378", opacity: 0.4 }} />
                <span style={{ color: "#8CA378", opacity: 0.8 }}>❁</span>
                <div className="w-8 h-px" style={{ background: "#8CA378", opacity: 0.4 }} />
              </div>
            }
          />
        </div>
      </div>
    );
  }

  /* 4 ── DARK LUXURY: photo fades into the dark background via a gradient
     mask so it never looks like a rectangle pasted on a black card. */
  if (photoMode === "fade-dark") {
    return (
      <div className="relative w-full h-full flex-1 flex flex-col overflow-hidden" style={{ background: "linear-gradient(180deg,#211D19,#151210)" }}>
        <PhotoOrPlaceholder
          photoUrl={data.photoUrl}
          decorPreset={decorPreset}
          className="relative w-full"
          style={{ flex: compact ? "58 0 0px" : "56 0 0px", minHeight: 0 }}
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(21,18,16,0) 0%, rgba(21,18,16,0.55) 55%, #151210 100%)" }} />
        </PhotoOrPlaceholder>
        <div
          className={`relative z-10 flex flex-col items-center ${pad} w-full overflow-y-auto ${compact ? "-mt-4" : "-mt-10"}`}
          style={{ flex: compact ? "42 1 0px" : "44 1 0px", minHeight: 0 }}
        >
          <DarkGoldArc accent={tokens.accent} />
          <div className="h-1" />
          <HeroContent
            data={data}
            tokens={{ ...tokens, textDark: tokens.accent, textMuted: "rgba(240,230,211,0.65)" }}
            compact={compact}
            kickerLabel="Сізді шақырамыз"
            divider={<div className="w-10 h-px" style={{ background: tokens.accent, opacity: 0.45 }} />}
          />
        </div>
      </div>
    );
  }

  /* 5 ── KAZAKH ETHNO: photo inside an arched ornamental frame — rounded
     top, flat base, thin double border, restrained geometric accents. */
  return (
    <div className="w-full h-full flex-1 flex flex-col items-center overflow-y-auto overflow-x-hidden" style={{ background: "linear-gradient(180deg,#FBF4E7,#F5EAD4)" }}>
      <div className={`relative shrink-0 ${compact ? "mt-5" : "mt-10"}`} style={{ aspectRatio: "3 / 4", width: compact ? "min(58%, 180px)" : "min(34%, 280px)" }}>
        <div className="absolute -inset-1.5 pointer-events-none" style={{ borderRadius: "50% 50% 4px 4px", border: `1px solid ${tokens.accent}66` }} />
        <PhotoOrPlaceholder
          photoUrl={data.photoUrl}
          decorPreset={decorPreset}
          className="relative w-full h-full overflow-hidden"
          style={{ borderRadius: "50% 50% 4px 4px" }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: "50% 50% 4px 4px", boxShadow: `inset 0 0 0 2px ${tokens.bg}` }} />
      </div>
      <div className={`flex flex-col items-center ${pad} w-full`}>
        <HeroContent
          data={data}
          tokens={tokens}
          compact={compact}
          kickerLabel="Сізді шақырамыз"
          divider={<EthnoOrnament accent={tokens.accent} />}
        />
      </div>
    </div>
  );
}
