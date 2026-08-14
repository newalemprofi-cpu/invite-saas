import type { WeddingTemplateLayout } from "@/lib/wedding-template-layouts";
import { KazakhDivider, KazakhWatermark, KAZAKH_ETHNO_SURFACE } from "./KazakhOrnament";

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
  /**
   * true = show ONLY the kicker + names (+ age, if present) — hosts,
   * date/time, venue/address, the invitation message and the note are all
   * omitted here and rendered by the caller in their own dedicated
   * sections instead. Default false preserves the exact original
   * everything-in-the-hero behavior, so InvitePreview.tsx (the
   * constructor's live/dashboard preview, which also renders this
   * component and is explicitly out of scope for this change) needs zero
   * edits — only InvitationView.tsx (the real public page + template
   * demo) opts into `minimal`. The decorative divider ornament is NOT
   * gated by this flag: it carries no information, only the template's
   * visual identity, which must stay regardless of how much text is shown.
   */
  minimal?: boolean;
  /** Full Production Template Designer task (§4/§6) — admin-configured
   * kicker override, already resolved (placeholder substitution + KK/RU
   * done by the caller). `undefined` keeps the original hardcoded
   * "Сізді шақырамыз"; an explicit empty string hides the kicker entirely
   * (§6 visibility control). InvitePreview.tsx (the constructor preview,
   * out of scope for this change) never passes this, so it's unaffected. */
  kickerOverride?: string;
  /** Full Production Template Designer task (§4) — optional short line
   * rendered directly under the kicker, above the couple's names. Absent/
   * empty renders nothing extra, exactly as before this feature. */
  subtitleOverride?: string;
  /** Full Production Template Designer task (§6, `hero.content.visibility.
   * showDivider`) — hides the decorative divider ornament between the
   * names/subtitle block and the date/venue block. `undefined` (every
   * caller before this feature, and every template with no override)
   * keeps it visible — current behavior byte-identical. No reserved gap
   * is left behind when hidden: the divider is a normal flex child inside
   * a `gap`-based column, so omitting it collapses the space exactly like
   * any other conditionally-rendered flex item. */
  showDivider?: boolean;
  /** Full Production Template Designer task (§9 Hero media) — admin-
   * configured photo fit/position, already resolved by the caller
   * (`resolveSectionMedia(config,"hero")`). See PhotoOrPlaceholder's own
   * doc for why aspectRatio/radius are deliberately not included. */
  photoFit?: "cover" | "contain";
  photoPosition?: string;
  /** Full Production Template Designer task (Hero background controls) —
   * a resolved CSS `background` value (solid color or gradient) from
   * `hero.background`, already computed by the caller. Each of the 5
   * compositions below has its own carefully-tuned DEFAULT outer
   * background (ivory for Classic Gold, dark gradient for Dark Luxury,
   * etc.) that must survive untouched when no override is configured —
   * so this only ever REPLACES that default, via `?? <original value>`,
   * never merges with or derives from it. `undefined` (every template
   * without this override, including all 5 flagship ones) keeps every
   * composition byte-identical to before this feature. */
  backgroundOverride?: string;
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
  // Ad-hoc Builder-configured templates with no dedicated decorPreset — a
  // neutral warm-ivory tint, template-agnostic on purpose.
  default: "linear-gradient(160deg,#F2EDE3,#E9E1D2,#DFD4BE)",
};

/** Renders the customer's photo, or — when absent — a tasteful,
 * template-tinted placeholder. Never a broken-image icon. */
function PhotoOrPlaceholder({
  photoUrl, decorPreset, className, style, children, fit = "cover", position = "center",
}: {
  photoUrl?: string | null;
  decorPreset: WeddingTemplateLayout["decorPreset"];
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  /** Full Production Template Designer task — admin-configured photo
   * fit/position override (`hero.media.fit`/`.position`), already
   * resolved by the caller. Defaults to the original hardcoded
   * cover/center, so every existing template renders byte-identically.
   * Deliberately NOT extended to aspectRatio/radius here — each flagship
   * composition's frame shape (circular/arched/rectangular) is intrinsic
   * to its own container geometry, and overriding that would either do
   * nothing or visually break the frame; fit/position only change how
   * the photo sits WITHIN that already-fixed frame, which is safe. */
  fit?: "cover" | "contain";
  position?: string;
}) {
  return (
    <div className={className} style={{ background: photoUrl ? undefined : PLACEHOLDER_TINT[decorPreset], ...style }}>
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="absolute inset-0 w-full h-full" style={{ objectFit: fit, objectPosition: position }} />
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

/* ── Shared hero-content block (names/hosts/date/venue/message/note) ───── */

function HeroContent({
  data, tokens, compact, kickerLabel, subtitle, divider, showDivider = true, overPhoto, minimal,
}: {
  data: WeddingHeroData;
  tokens: WeddingHeroTokens;
  compact: boolean;
  kickerLabel: string;
  /** See WeddingHeroProps.subtitleOverride. */
  subtitle?: string;
  divider: React.ReactNode;
  /** See WeddingHeroProps.showDivider. Defaults true (current behavior
   * unchanged for every template that doesn't set this). */
  showDivider?: boolean;
  /** True when this text sits directly over the customer's photo (the
   * full-bleed Romantic composition) — adds a soft shadow so the kicker/
   * name stay readable regardless of how bright/busy the photo is,
   * independent of the gradient overlay beneath it. */
  overPhoto?: boolean;
  /** See WeddingHeroProps.minimal. */
  minimal?: boolean;
}) {
  const displayName = data.partner ? `${data.name} & ${data.partner}` : data.name;
  const nameSize = compact ? "text-xl" : "invite-hero-name";
  const kickerClass = compact ? "label-caps text-[9px]" : "invite-hero-kicker";
  const bodySize = compact ? "text-[10px]" : "invite-caption";
  const gap = compact ? "gap-1.5" : "gap-5";
  // A slightly stronger shadow than before — still a soft, natural falloff
  // (never a hard outline/box), just enough extra headroom for arbitrary
  // customer photos that are brighter or busier than the reference photo.
  const shadow = overPhoto ? { textShadow: "0 2px 10px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3)" } : undefined;

  return (
    <div className={`flex flex-col items-center text-center ${gap} w-full`}>
      {kickerLabel && <p className={kickerClass} style={{ color: tokens.textMuted, ...shadow }}>{kickerLabel}</p>}
      <h1 className={`heading-display font-semibold leading-tight break-words ${nameSize}`} style={{ color: tokens.textDark, ...shadow }}>
        {displayName || "—"}
      </h1>
      {subtitle && <p className={bodySize} style={{ color: tokens.textMuted, ...shadow }}>{subtitle}</p>}
      {data.age && <p className={bodySize} style={{ color: tokens.textMuted, ...shadow }}>{data.age}</p>}
      {!minimal && data.hostsLine && <p className={bodySize} style={{ color: tokens.textMuted }}>{data.hostsLine}</p>}
      {showDivider && divider}
      {!minimal && data.date && (
        <div className="flex flex-col items-center gap-0.5">
          <p className={`font-serif font-semibold ${compact ? "text-sm" : "text-xl sm:text-2xl"}`} style={{ color: tokens.textDark }}>
            {fmtDate(data.date)}
          </p>
          {data.time && <p className={bodySize} style={{ color: tokens.textMuted }}>{data.time}</p>}
        </div>
      )}
      {!minimal && data.location && (
        <div className="flex flex-col items-center gap-0.5">
          <p className={`font-semibold ${compact ? "text-xs" : "text-base"}`} style={{ color: tokens.textDark }}>{data.location}</p>
          {data.address && <p className={bodySize} style={{ color: tokens.textMuted }}>{data.address}</p>}
        </div>
      )}
      {!minimal && data.message && (
        <p className={`italic leading-relaxed ${bodySize}`} style={{ color: tokens.textMuted }}>&ldquo;{data.message}&rdquo;</p>
      )}
      {!minimal && data.note && (
        <p className={`leading-relaxed ${compact ? "text-[9px]" : "text-xs"}`} style={{ color: tokens.textMuted }}>{data.note}</p>
      )}
    </div>
  );
}

export function WeddingHero({ data, tokens, layout, compact = false, minimal = false, kickerOverride, subtitleOverride, showDivider = true, photoFit = "cover", photoPosition = "center", backgroundOverride }: WeddingHeroProps) {
  const { photoMode, decorPreset } = layout;
  const pad = compact ? "px-4 py-4" : "px-6 py-10";
  const kickerLabel = kickerOverride !== undefined ? kickerOverride : "Сізді шақырамыз";

  /* 1 ── ROMANTIC: full-bleed photo, text anchored at the bottom over a
     soft gradient so it reads naturally as the photo dissolving into
     content, not a caption bar. */
  if (photoMode === "full-bleed") {
    return (
      <div className="relative w-full h-full flex-1 flex flex-col overflow-hidden" style={{ background: backgroundOverride ?? tokens.bg }}>
        <PhotoOrPlaceholder photoUrl={data.photoUrl} decorPreset={decorPreset} className="absolute inset-0" fit={photoFit} position={photoPosition} />
        {/* Slightly deeper than before (extra 55%/70% stops) for reliable
            text contrast against arbitrary customer photos, without ever
            darkening the photo's own upper two-thirds — the photo stays
            the dominant, clearly visible element. */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.1) 32%, rgba(20,15,12,0.28) 55%, rgba(255,247,244,0.88) 72%, rgba(255,247,244,0.98) 100%)" }}
        />
        <div className={`relative z-10 mt-auto flex flex-col items-center ${pad} w-full`}>
          <HeroContent
            minimal={minimal}
            data={data}
            tokens={tokens}
            compact={compact}
            kickerLabel={kickerLabel}
            subtitle={subtitleOverride}
            showDivider={showDivider}
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
      <div className="w-full h-full flex-1 flex flex-col overflow-hidden" style={{ background: backgroundOverride ?? (tokens.isDark ? "#1C1917" : "#FFFDF8") }}>
        <PhotoOrPlaceholder
          photoUrl={data.photoUrl}
          decorPreset={decorPreset}
          className="relative w-full"
          style={{ flex: "36 0 0px", minHeight: 0 }}
          fit={photoFit}
          position={photoPosition}
        >
          <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: tokens.accent, opacity: 0.6 }} />
        </PhotoOrPlaceholder>
        <div className={`relative flex flex-col items-center ${pad} w-full overflow-y-auto`} style={{ flex: "64 1 0px", minHeight: 0 }}>
          <div className="absolute top-1.5 left-1.5 pointer-events-none"><ClassicCorner accent={tokens.accent} /></div>
          <div className="absolute top-1.5 right-1.5 pointer-events-none"><ClassicCorner accent={tokens.accent} flip /></div>
          <HeroContent
            minimal={minimal}
            data={data}
            tokens={tokens}
            compact={compact}
            kickerLabel={kickerLabel}
            subtitle={subtitleOverride}
            showDivider={showDivider}
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
      <div className="w-full h-full flex-1 flex flex-col items-center overflow-y-auto overflow-x-hidden" style={{ background: backgroundOverride ?? "linear-gradient(180deg,#F7FAF3,#F0F5EA)" }}>
        <div className={`relative shrink-0 ${compact ? "mt-5" : "mt-10"} aspect-square`} style={{ width: compact ? "min(62%, 190px)" : "min(38%, 300px)" }}>
          <div className="absolute -inset-3 opacity-70 pointer-events-none">
            <div className="absolute -top-2 -left-2"><FloralSprig accent={tokens.accent} /></div>
            <div className="absolute -bottom-2 -right-2"><FloralSprig accent={tokens.accent} mirror /></div>
          </div>
          <PhotoOrPlaceholder
            photoUrl={data.photoUrl}
            decorPreset={decorPreset}
            className="relative w-full h-full rounded-full overflow-hidden"
            fit={photoFit}
            position={photoPosition}
          />
          <div className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: `0 0 0 3px ${tokens.bg}, 0 0 0 4px ${tokens.accent}55` }} />
        </div>
        <div className={`flex flex-col items-center ${pad} w-full`}>
          <HeroContent
            minimal={minimal}
            data={data}
            tokens={tokens}
            compact={compact}
            kickerLabel={kickerLabel}
            subtitle={subtitleOverride}
            showDivider={showDivider}
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
      <div className="relative w-full h-full flex-1 flex flex-col overflow-hidden" style={{ background: backgroundOverride ?? "linear-gradient(180deg,#211D19,#151210)" }}>
        <PhotoOrPlaceholder
          photoUrl={data.photoUrl}
          decorPreset={decorPreset}
          className="relative w-full"
          style={{ flex: compact ? "58 0 0px" : "56 0 0px", minHeight: 0 }}
          fit={photoFit}
          position={photoPosition}
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
            minimal={minimal}
            data={data}
            tokens={{ ...tokens, textDark: tokens.accent, textMuted: "rgba(240,230,211,0.65)" }}
            compact={compact}
            kickerLabel={kickerLabel}
            subtitle={subtitleOverride}
            showDivider={showDivider}
            divider={<div className="w-10 h-px" style={{ background: tokens.accent, opacity: 0.45 }} />}
            overPhoto
          />
        </div>
      </div>
    );
  }

  /* 5 ── KAZAKH ETHNO: photo inside an arched ornamental frame — rounded
     top, flat base, a slim double hairline border with a small arch-top
     finial, and a large, extremely faint radial watermark seated behind
     the whole composition (§20's "signature, not wallpaper" — one big
     centered motif, never tiled). The photo is the dominant element: sized
     up from the previous revision so it reads as the focal point, with the
     couple's names remaining the primary typographic focal point directly
     beneath it. */
  return (
    <div
      className="relative w-full h-full flex-1 flex flex-col items-center overflow-y-auto overflow-x-hidden"
      style={{ background: backgroundOverride ?? `linear-gradient(180deg,${KAZAKH_ETHNO_SURFACE.ivory},${KAZAKH_ETHNO_SURFACE.cream})` }}
    >
      <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none" aria-hidden="true">
        <KazakhWatermark accent={tokens.accent} className={compact ? "w-[260px] h-[260px] -mt-4" : "w-[440px] h-[440px] -mt-6"} />
      </div>
      <div
        className={`relative shrink-0 ${compact ? "mt-5" : "mt-10"}`}
        style={{ aspectRatio: "3 / 4", width: compact ? "min(64%, 210px)" : "min(46%, 340px)" }}
      >
        {/* Arch-top finial — a small restrained pendant marking the peak of
            the frame, not a heavy crown. */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ top: compact ? -7 : -10 }}>
          <svg viewBox="0 0 20 14" className={compact ? "w-3 h-2" : "w-4 h-3"} fill="none" aria-hidden="true">
            <path d="M10 13 L10 4" stroke={tokens.accent} strokeWidth="1" opacity="0.6" />
            <path d="M4 4 Q10 -1 16 4" stroke={tokens.accent} strokeWidth="1" fill="none" opacity="0.6" />
            <circle cx="10" cy="2.5" r="1.4" fill={tokens.accent} opacity="0.65" />
          </svg>
        </div>
        {/* Slim double hairline — an outer ring plus a slightly inset second
            ring, read together as an elegant thin frame rather than one
            heavier golden border. */}
        <div className="absolute -inset-2 pointer-events-none" style={{ borderRadius: "50% 50% 4px 4px", border: `1px solid ${tokens.accent}55` }} />
        <div className="absolute -inset-0.5 pointer-events-none" style={{ borderRadius: "50% 50% 4px 4px", border: `1px solid ${tokens.accent}40` }} />
        <PhotoOrPlaceholder
          photoUrl={data.photoUrl}
          decorPreset={decorPreset}
          className="relative w-full h-full overflow-hidden"
          style={{ borderRadius: "50% 50% 4px 4px" }}
          fit={photoFit}
          position={photoPosition}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: "50% 50% 4px 4px", boxShadow: `inset 0 0 0 2px ${tokens.bg}` }} />
      </div>
      <div className={`relative flex flex-col items-center ${pad} w-full`}>
        <HeroContent
            minimal={minimal}
          data={data}
          tokens={tokens}
          compact={compact}
          kickerLabel={kickerLabel}
          subtitle={subtitleOverride}
          showDivider={showDivider}
          divider={<KazakhDivider accent={tokens.accent} className={compact ? "w-16 h-2.5" : undefined} />}
        />
      </div>
    </div>
  );
}
