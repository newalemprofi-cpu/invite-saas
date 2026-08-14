import Link from "next/link";
import type { Wish } from "@prisma/client";
import type { Template } from "@/lib/templates";
import type { FeatureKey } from "@/lib/features";
import type { Lang } from "@/lib/i18n";
import { THEMES } from "@/types/invite";
import { RSVPForm } from "./RSVPForm";
import { WishesWall } from "./WishesWall";
import { MusicPlayer } from "./MusicPlayer";
import { Countdown } from "./Countdown";
import { getYoutubeEmbedUrl } from "@/lib/youtube";
import { getWeddingLayout, type WeddingTemplateLayout, type WeddingPhotoMode } from "@/lib/wedding-template-layouts";
import { WeddingHero } from "@/components/wedding/WeddingHero";
import { GalleryCarousel, type GalleryVariant } from "@/components/invitation/GalleryCarousel";
import { ProgramTimeline } from "@/components/invitation/ProgramTimeline";
import { LocationSection } from "@/components/invitation/LocationSection";
import { KazakhDivider, KAZAKH_ETHNO_SURFACE } from "@/components/wedding/KazakhOrnament";
import { SectionDecoration } from "@/components/wedding/DecorationRegistry";
import {
  type VisualConfig,
  type ReorderableSectionId,
  type HeroVariant,
  type GalleryVariantId,
  type OrnamentVariant,
  type DecorationId,
  resolveSectionOrder,
  resolveSectionVariant,
  resolveSectionDecoration,
  HERO_VARIANT_TO_PHOTO_MODE,
  GALLERY_VARIANT_TO_FRAME,
  FONT_OPTIONS,
  RADIUS_VALUES,
  SHADOW_VALUES,
  BUTTON_RADIUS_VALUES,
  SPACING_CLASS,
} from "@/lib/visual-config";

/** Consistent vertical rhythm for every major content section (§7) — one
 * token instead of arbitrary per-section py-10/py-12/py-14 values. Also
 * the default for the Admin Template Builder's "spacing" theme extra
 * (SPACING_CLASS.generous is this exact string). */
const SECTION_PY = "py-16 sm:py-20 px-4";

export interface Section { id: string; enabled: boolean }

export interface D {
  // Naming (new and legacy)
  templateSlug?: string | null;
  template?: string | null;
  groomName?: string | null;
  brideName?: string | null;
  person1?: string | null;
  person2?: string | null;
  // Event
  date?: string;
  time?: string;
  location?: string | null;
  locationName?: string | null;
  mapLink?: string | null;
  mapUrl?: string | null;
  invitationText?: string | null;
  message?: string | null;
  // Contacts
  whatsapp?: string | null;
  organizerPhone?: string | null;
  // Blocks (ordered sections or legacy array)
  sections?: Section[];
  enabledBlocks?: string[];
  // Design
  bgColor?: string | null;
  accentColor?: string | null;
  fontFamily?: string | null;
  // Background
  bgType?: "color" | "gradient" | "image" | "video" | null;
  bgImageUrl?: string | null;
  bgVideoUrl?: string | null;
  bgGradient?: string | null;
  bgBlur?: number | null;
  bgOpacity?: number | null;
  bgOverlay?: string | null;
  // Media
  galleryUrls?: string[];
  musicUrl?: string | null;
  musicTitle?: string | null;
  musicEnabled?: boolean;
  musicLoop?: boolean;
  musicAutoplay?: boolean;
  // Block content
  programItems?: Array<{ time: string; label: string }>;
  loveStory?: string | null;
  dressCode?: string | null;
  wishesText?: string | null;
  contactsText?: string | null;
  giftInfo?: string | null;
  videoUrl?: string | null;
  rsvpText?: string | null;
  programText?: string | null;
  // Legacy
  theme?: string | null;
  // Simple-constructor additions — additive, absent on pre-existing invites.
  address?: string | null;
  hosts?: string | null;
  parents?: string | null;
  note?: string | null;
  age?: string | null;
}

export interface InvitationViewProps {
  /** The invitation content — a real Invite.data blob for the public page,
   * or synthetic template demo content for the full-preview demo route.
   * Same shape either way; this component never knows or cares which. */
  d: D;
  tmpl: Template | null;
  /** Which paid add-ons to render as unlocked. The public page derives this
   * from the real purchase snapshot (readFeatureState); the demo route
   * passes every FEATURE_KEY so a prospective customer can see everything
   * the template supports before buying anything. Never re-derived from
   * current admin pricing in either case. */
  entitled: readonly FeatureKey[];
  /** Real persisted guest wishes — empty for the demo (no Invite row to
   * attach them to). */
  wishes: Wish[];
  isPreview?: boolean;
  /** Real DB context for the two genuinely interactive, write-capable
   * sections (RSVP submission, the guest wishes wall). Omitted entirely for
   * the demo route. */
  invite?: { id: string; status: string } | null;
  /**
   * true only for the template full-preview demo (/templates/[slug]).
   * Lets RSVP/Wishes render a realistic, fully-interactive-LOOKING sample
   * instead of the real-but-unpublished "not active yet" placeholder — a
   * prospective customer should see the complete finished experience, not
   * a locked section. Demo submissions are always local-only (no
   * submitRSVP/submitWish call, no Invite/RSVP/Wish DB row ever created)
   * — see RSVPForm's and WishesWall's own `demo` prop docs. Real
   * `/i/[slug]` never passes this (defaults false), so its behavior is
   * byte-for-byte unchanged.
   */
  demo?: boolean;
  /** Locale for the handful of genuinely NEW demo-only strings this task
   * introduces (sample wishes, etc). Every OTHER string in this component
   * was already hardcoded Kazakh before this — that pre-existing
   * convention is intentionally left alone (§16: preserve current
   * localization rules), this prop only governs new demo content.
   * Defaults "kk", matching that existing convention exactly, so
   * `/i/[slug]` (which never passes it) is unaffected. */
  lang?: Lang;
  /**
   * Admin Template Builder ONLY: the currently-being-edited, UNSAVED
   * visualConfig, passed directly from client-side builder state so the
   * exact same renderer used by /templates/[slug] and /i/[slug] can
   * preview it live without a round-trip through the database (§17 —
   * "Builder passes unsaved config + demo data into the shared
   * renderer"). `undefined` (the default — every real caller) means "use
   * `tmpl.visualConfig` as normal"; explicitly passing `null` forces the
   * legacy/no-config rendering path even if `tmpl` happens to have a
   * saved config (used by the Builder's "reset" affordance). Never read
   * from untrusted request input — always local React state in the
   * Builder component.
   */
  visualConfigOverride?: VisualConfig | null;
}

function fmt(s: string) {
  try {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("kk-KZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return s; }
}

function ZaureFloralCorner({ mirror = false, vflip = false }: { mirror?: boolean; vflip?: boolean }) {
  const transforms: string[] = [];
  if (mirror) transforms.push("scaleX(-1)");
  if (vflip) transforms.push("scaleY(-1)");
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"
      style={transforms.length ? { transform: transforms.join(" ") } : undefined}>
      <path d="M8,112 Q35,75 58,48 Q78,24 108,8" stroke="#B8925A" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.45"/>
      <path d="M35,82 Q22,68 28,56" stroke="#B8925A" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.3"/>
      <path d="M58,48 Q72,44 78,32" stroke="#B8925A" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.3"/>
      <path d="M38,78 C28,62 36,54 44,62 C42,72 38,78 38,78Z" fill="#C9A87C" opacity="0.28"/>
      <path d="M58,48 C70,36 76,42 70,52 C62,54 58,48 58,48Z" fill="#C9A87C" opacity="0.28"/>
      <path d="M22,94 C14,80 22,72 30,80 C28,88 22,94 22,94Z" fill="#C9A87C" opacity="0.22"/>
      <g transform="translate(103,15)">
        <ellipse cx="0" cy="-8" rx="4.5" ry="8" fill="#D4B080" opacity="0.4" transform="rotate(0)"/>
        <ellipse cx="0" cy="-8" rx="4.5" ry="8" fill="#D4B080" opacity="0.4" transform="rotate(60)"/>
        <ellipse cx="0" cy="-8" rx="4.5" ry="8" fill="#D4B080" opacity="0.4" transform="rotate(120)"/>
        <ellipse cx="0" cy="-8" rx="4.5" ry="8" fill="#D4B080" opacity="0.4" transform="rotate(180)"/>
        <ellipse cx="0" cy="-8" rx="4.5" ry="8" fill="#D4B080" opacity="0.4" transform="rotate(240)"/>
        <ellipse cx="0" cy="-8" rx="4.5" ry="8" fill="#D4B080" opacity="0.4" transform="rotate(300)"/>
        <circle cx="0" cy="0" r="4" fill="#C4963E" opacity="0.5"/>
      </g>
      <g transform="translate(60,44)">
        <ellipse cx="0" cy="-6" rx="3.5" ry="6" fill="#D4B080" opacity="0.38" transform="rotate(0)"/>
        <ellipse cx="0" cy="-6" rx="3.5" ry="6" fill="#D4B080" opacity="0.38" transform="rotate(60)"/>
        <ellipse cx="0" cy="-6" rx="3.5" ry="6" fill="#D4B080" opacity="0.38" transform="rotate(120)"/>
        <ellipse cx="0" cy="-6" rx="3.5" ry="6" fill="#D4B080" opacity="0.38" transform="rotate(180)"/>
        <ellipse cx="0" cy="-6" rx="3.5" ry="6" fill="#D4B080" opacity="0.38" transform="rotate(240)"/>
        <ellipse cx="0" cy="-6" rx="3.5" ry="6" fill="#D4B080" opacity="0.38" transform="rotate(300)"/>
        <circle cx="0" cy="0" r="3" fill="#C4963E" opacity="0.48"/>
      </g>
      <g transform="translate(28,78)">
        <ellipse cx="0" cy="-4" rx="2.5" ry="4" fill="#D4B080" opacity="0.32" transform="rotate(0)"/>
        <ellipse cx="0" cy="-4" rx="2.5" ry="4" fill="#D4B080" opacity="0.32" transform="rotate(72)"/>
        <ellipse cx="0" cy="-4" rx="2.5" ry="4" fill="#D4B080" opacity="0.32" transform="rotate(144)"/>
        <ellipse cx="0" cy="-4" rx="2.5" ry="4" fill="#D4B080" opacity="0.32" transform="rotate(216)"/>
        <ellipse cx="0" cy="-4" rx="2.5" ry="4" fill="#D4B080" opacity="0.32" transform="rotate(288)"/>
        <circle cx="0" cy="0" r="2" fill="#C4963E" opacity="0.4"/>
      </g>
    </svg>
  );
}

function resolveEnabledBlocks(d: D): string[] {
  if (d.sections && d.sections.length > 0) {
    return d.sections.filter((s) => s.enabled).map((s) => s.id);
  }
  return d.enabledBlocks ?? ["hero", "date", "countdown", "rsvp"];
}

/** Fixed/legacy sections that are NOT part of the Admin Template
 * Builder's 9 reorderable body sections (§16 of the Builder task
 * deliberately scopes reordering to exactly the task's own 10-section
 * example, hero + 9 body sections). Each rides immediately after a
 * specific reorderable anchor, in the SAME relative position they've
 * always rendered in — so when sectionOrder is the untouched default,
 * output is byte-identical to before this task, and when an admin
 * reorders the 9 canonical sections, these fixed ones travel along with
 * their anchor rather than disappearing or jumping to an arbitrary spot. */
const RIDER_ANCHORS: Partial<Record<ReorderableSectionId, string[]>> = {
  countdown: ["love_story", "video"],
  program: ["dress_code"],
  gallery: ["whatsapp", "wishes_static"],
  wishes: ["gift_info"],
};

/**
 * THE single rendering source of truth for a complete invitation — used
 * identically by the real public page (/i/[slug], real Invite.data + real
 * entitlements + real RSVP/wishes DB writes), the template full-preview
 * demo (/templates/[slug], synthetic demo content + all-entitled + no DB
 * writes at all — see the `invite` prop's own doc comment for exactly how
 * that's achieved with zero demo-specific branching in the two write-
 * capable sections), and the Admin Template Builder's Live Preview (via
 * `visualConfigOverride`, see that prop's doc comment). Whatever renders
 * here is what the customer actually receives once published — never a
 * second, simplified re-implementation.
 */
export function InvitationView({
  d, tmpl, entitled, wishes, isPreview = false, invite = null, demo = false, lang = "kk", visualConfigOverride,
}: InvitationViewProps) {
  const isEntitledTo = (key: string) => (entitled as readonly string[]).includes(key);

  const legacy = THEMES.find((t) => t.id === d.theme) ?? THEMES[0];
  const newSlug = d.templateSlug ?? d.template ?? null;
  // One of the 5 flagship Wedding templates — null for every other
  // template/legacy invite, which keeps rendering exactly as before.
  const weddingLayout = getWeddingLayout(newSlug);

  // Admin Template Builder's saved (or, in the Builder itself, unsaved)
  // visual config. `undefined` from the caller means "use tmpl's saved
  // one"; an explicit `null` (Builder's reset affordance) forces the
  // legacy path even if tmpl has one saved. Every template that predates
  // this feature (including all 5 flagship Wedding templates — see the
  // Builder task's explicit backward-compatibility requirement) has
  // `tmpl.visualConfig === null`, so `visualConfig` below is `null` and
  // every resolver call falls through to its legacy-derived fallback —
  // byte-identical rendering to before this feature existed.
  const visualConfig: VisualConfig | null = visualConfigOverride !== undefined ? visualConfigOverride : (tmpl?.visualConfig ?? null);

  // Ad-hoc hero composition for a Builder-configured template that has NO
  // hardcoded wedding-template-layouts.ts entry (i.e. every template
  // except the 5 flagship ones) — this is the mechanism that lets a
  // brand-new admin-built template get the SAME quality hero compositions
  // (arch/full-bleed/top-band/framed/fade-dark) without any code change.
  // sectionCardBg/sectionCardBorder are unused by any current consumer
  // (confirmed: WeddingHero only reads photoMode/decorPreset, and
  // InvitationView computes its own cardBg/cardBorder below independently
  // of this layout object) so they're safe placeholders here.
  const heroVariant = resolveSectionVariant<HeroVariant | "">(visualConfig, "hero", "");
  const adHocPhotoMode = heroVariant ? (HERO_VARIANT_TO_PHOTO_MODE[heroVariant] as WeddingPhotoMode) : null;
  const effectiveWeddingLayout: WeddingTemplateLayout | null =
    weddingLayout ?? (adHocPhotoMode ? { photoMode: adHocPhotoMode, decorPreset: "default", sectionCardBg: "", sectionCardBorder: "" } : null);

  // The legacy Kazakh Ethno flag — still drives every section's DEFAULT
  // variant/decoration for the 5 flagship templates (all of which have
  // visualConfig === null), exactly as before. A Builder-configured
  // template instead sets each section's variant/decoration
  // independently via visualConfig, decoupled from this single flag.
  const isEthno = weddingLayout?.decorPreset === "ethno";
  const legacyOrnament: OrnamentVariant = isEthno ? "ethno" : "default";
  const legacyDecoration: DecorationId = isEthno ? "kazakh-qoshqar" : "none";
  const sectionOrnament = (id: ReorderableSectionId) => resolveSectionVariant<OrnamentVariant>(visualConfig, id, legacyOrnament) === "ethno";
  const sectionDecorationId = (id: ReorderableSectionId) => resolveSectionDecoration(visualConfig, id, legacyDecoration);

  const accent = d.accentColor || tmpl?.accent || legacy.accent;
  const textDark = tmpl?.textDark || legacy.textColor;
  const textMuted = tmpl?.textMuted || (tmpl?.dark ?? legacy.dark ? "rgba(255,255,255,0.55)" : "#78716C");
  const isDark = tmpl?.dark ?? legacy.dark;
  const isZaurePremium = newSlug === "zaure-premium";
  // Theme extras (font/radius/spacing/shadow/buttonStyle) — genuinely new
  // dimensions with no pre-existing column, so `d.fontFamily` (the
  // customer's own per-invite choice, unrelated to the template) still
  // takes priority when set; only when it's absent does the template's
  // own configured heading font apply, falling back to the site's
  // existing default serif exactly as before this feature existed.
  const headingFontId = visualConfig?.theme?.headingFont;
  const bodyFontId = visualConfig?.theme?.bodyFont;
  const fontFamily = d.fontFamily === "sans"
    ? "var(--font-sans)"
    : (headingFontId && FONT_OPTIONS.find((f) => f.id === headingFontId)?.cssVar) || "var(--font-serif)";
  const bodyFontFamily = bodyFontId ? FONT_OPTIONS.find((f) => f.id === bodyFontId)?.cssVar : undefined;
  const radiusPreset = visualConfig?.theme?.radius;
  const shadowPreset = visualConfig?.theme?.shadow;
  const buttonStylePreset = visualConfig?.theme?.buttonStyle;
  const spacingPreset = visualConfig?.theme?.spacing;
  // A light-touch CSS custom-property injection (§26/theme extras) —
  // consumed by a handful of high-impact surfaces below (RSVP/Wishes
  // cards, Countdown cells, Location card, primary buttons) rather than
  // an exhaustive sweep of every rounded corner in the codebase; see the
  // Builder task's final report for the explicit V1 scoping rationale.
  // `undefined` values simply aren't set, so a template without theme
  // extras produces an empty style object — zero effect on any existing
  // template.
  const themeVars: React.CSSProperties = {
    ...(bodyFontFamily && { ["--tpl-body-font" as string]: bodyFontFamily }),
    ...(radiusPreset && { ["--tpl-radius" as string]: RADIUS_VALUES[radiusPreset] }),
    ...(shadowPreset && { ["--tpl-shadow" as string]: SHADOW_VALUES[shadowPreset] }),
    ...(buttonStylePreset && { ["--tpl-button-radius" as string]: BUTTON_RADIUS_VALUES[buttonStylePreset] }),
  };

  // Names
  const name = d.groomName ?? d.person1 ?? "";
  const partner = d.brideName ?? d.person2 ?? null;
  const displayName = partner ? `${name} & ${partner}` : name;
  const location = d.location ?? d.locationName;
  const mapUrl = d.mapLink ?? d.mapUrl;
  const message = d.invitationText ?? d.message;
  const gallery = d.galleryUrls ?? [];
  const hostsLine = d.hosts || d.parents || null;

  // This Server Component renders exactly once per request (no client-side
  // re-renders to go stale between), so a single Date.now() snapshot here
  // is safe and deterministic for the whole render — unlike calling
  // Date.now() from inside a Client Component's render/state initializer,
  // which is what the purity rule is guarding against and what previously
  // caused Countdown's intermittent SSR/hydration mismatch (see its
  // `serverNow` prop doc for the full explanation).
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();

  // Blocks — respect sections ordering if available
  const blocks = resolveEnabledBlocks(d);
  const has = (id: string) => blocks.includes(id);
  const videoEmbedUrl = d.videoUrl ? getYoutubeEmbedUrl(d.videoUrl) : null;

  // Background
  const bgType = d.bgType || "color";
  const fallbackBg = tmpl?.bg || (isDark ? "#0F1729" : "#FAF8F3");
  const gradient = tmpl?.gradient || legacy.gradient;

  let heroBg: string;
  if (bgType === "gradient") heroBg = d.bgGradient || fallbackBg;
  else if (bgType === "color") heroBg = d.bgColor || fallbackBg;
  else heroBg = fallbackBg;

  // Program items
  const programItems = (d.programItems && d.programItems.length > 0)
    ? d.programItems
    : [
        { time: "18:00", label: "Қонақтарды қарсы алу" },
        { time: "19:00", label: "Сазды кеш" },
        { time: "20:00", label: "Кешкі ас" },
        { time: "21:00", label: "Би кеші" },
      ];

  const cardBg = isEthno ? `${accent}12` : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)");
  const cardBorder = isEthno ? `${accent}38` : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)");

  // Kazakh Ethno gets a visibly tighter vertical rhythm (a ~30% reduction —
  // the other 4 templates keep the original SECTION_PY untouched) and its
  // own slightly warmer ivory/cream surface tones. A Builder-configured
  // template's own `theme.spacing` preset takes priority over both when
  // set. All plain string/function values (never a global CSS override),
  // so nothing outside this one template's render path can be affected.
  const sectionPy = spacingPreset ? SPACING_CLASS[spacingPreset] : (isEthno ? "py-11 sm:py-14 px-4" : SECTION_PY);
  const sectionBg = (base: "ivory" | "cream" | "darkOrCream"): string => {
    if (base === "darkOrCream") return isDark ? "#1C1917" : (isEthno ? KAZAKH_ETHNO_SURFACE.cream : "var(--cream)");
    if (!isEthno) return base === "ivory" ? "var(--ivory)" : "var(--cream)";
    return base === "ivory" ? KAZAKH_ETHNO_SURFACE.ivory : KAZAKH_ETHNO_SURFACE.cream;
  };
  // A subtle top hairline on every major section (§7) — keeps sections
  // visually distinct even where two adjacent sections happen to share the
  // same background (which/whether that happens depends on which optional
  // sections a given invite actually has enabled), without ever looking
  // like a stack of dashboard cards. A single light-oriented hairline
  // (not isDark-branched) because almost every section below the hero
  // already uses the codebase's existing "always ivory/cream" convention
  // regardless of template darkness (see cardBg/cardBorder above for the
  // same established pattern) — the two sections that stay isDark-aware
  // (Countdown, WhatsApp) already get their separation from the background
  // color jump itself, so a barely-visible dark-on-dark hairline there
  // would add nothing.
  const sectionDivider = "1px solid rgba(28,25,23,0.06)";
  const legacyGalleryVariant: GalleryVariant = effectiveWeddingLayout?.decorPreset ?? "default";
  const galleryVariantId = visualConfig?.sections?.gallery?.variant as GalleryVariantId | undefined;
  const galleryVariant: GalleryVariant = galleryVariantId ? (GALLERY_VARIANT_TO_FRAME[galleryVariantId] as GalleryVariant) : legacyGalleryVariant;

  /* ── Reorderable body sections (§16 of the Builder task) — each
     computed once as JSX-or-null, keyed, then assembled below in
     Builder-configurable order via resolveSectionOrder(). Every
     condition/prop here is copy-identical to the original hardcoded
     sequence; only the SectionKicker→SectionDecoration call and the
     wrapping into a keyed const changed. ── */

  const hostsSection = hostsLine ? (
    <section key="hosts" className={sectionPy} style={{ background: sectionBg("cream"), borderTop: sectionDivider }}>
      <div className="max-w-md mx-auto text-center">
        <SectionDecoration decorationId={sectionDecorationId("hosts")} label="Той иелері" accent={accent} className="mb-4" />
        <p className="invite-body leading-relaxed" style={{ color: "var(--charcoal)" }}>{hostsLine}</p>
      </div>
    </section>
  ) : null;

  const dateSection = d.date ? (
    <section key="datetime" className={sectionPy} style={{ background: sectionBg("ivory"), borderTop: sectionDivider }}>
      <div className="max-w-md mx-auto text-center flex flex-col items-center gap-2">
        <SectionDecoration decorationId={sectionDecorationId("datetime")} label="Күні мен уақыты" accent={accent} className="mb-1" />
        <p className="heading-display invite-headline font-semibold" style={{ color: "var(--charcoal)" }}>{fmt(d.date)}</p>
        {d.time && <p className="invite-caption" style={{ color: "var(--muted)" }}>Сағат {d.time}</p>}
      </div>
    </section>
  ) : null;

  const invitationSection = ((has("invitation_text") && message) || d.note) ? (
    <section key="invitation" className={sectionPy} style={{ background: sectionBg("cream"), borderTop: sectionDivider }}>
      <div className="max-w-md mx-auto flex flex-col items-center gap-4 text-center">
        {sectionDecorationId("invitation") === "kazakh-qoshqar" && <KazakhDivider accent={accent} />}
        {has("invitation_text") && message && (
          // Restrained, not fully-italic ceremonial styling for Kazakh
          // Ethno (§10 — "do not make the entire paragraph overly
          // italic"): non-italic body copy with quote marks doing the
          // ceremonial signaling instead. Other templates keep the
          // original italic treatment untouched.
          <p className={`invite-body leading-relaxed ${sectionOrnament("invitation") ? "" : "italic"}`} style={{ color: "var(--charcoal)" }}>&ldquo;{message}&rdquo;</p>
        )}
        {d.note && <p className="invite-caption leading-relaxed" style={{ color: "var(--muted)" }}>{d.note}</p>}
      </div>
    </section>
  ) : null;

  const countdownSection = (has("countdown") && d.date) ? (
    <section key="countdown" className={sectionPy} style={{ background: sectionBg("darkOrCream"), borderTop: sectionDivider }}>
      <div className="max-w-md mx-auto text-center">
        <SectionDecoration decorationId={sectionDecorationId("countdown")} label="Іс-шараға дейін" accent={accent} className="mb-8" color={isDark ? "rgba(255,255,255,0.4)" : "var(--gold)"} />
        <Countdown targetDate={d.date} targetTime={d.time} accent={accent} textMuted={isDark ? "rgba(255,255,255,0.45)" : "var(--muted)"} serverNow={nowMs} ornament={sectionOrnament("countdown")} />
      </div>
    </section>
  ) : null;

  const loveStorySection = (has("love_story") && d.loveStory) ? (
    <section key="love_story" className={sectionPy} style={{ background: sectionBg("ivory"), borderTop: sectionDivider }}>
      <div className="max-w-md mx-auto text-center">
        <SectionDecoration decorationId={sectionDecorationId("countdown")} label="Біздің тарих" accent={accent} className="mb-5" />
        <p className="invite-body leading-relaxed" style={{ color: "var(--charcoal)" }}>{d.loveStory}</p>
      </div>
    </section>
  ) : null;

  // Only ever iframes a URL that getYoutubeEmbedUrl() has validated as a
  // recognized YouTube host/format — an unparseable or non-YouTube link
  // hides the whole block instead of iframing raw customer input (see
  // src/lib/youtube.ts).
  const videoSection = (has("video_section") && videoEmbedUrl) ? (
    <section key="video" className={sectionPy} style={{ background: sectionBg("cream"), borderTop: sectionDivider }}>
      <div className="max-w-2xl mx-auto">
        <SectionDecoration decorationId={sectionDecorationId("countdown")} label="Бейне" accent={accent} className="text-center mb-6" />
        <div className="aspect-video rounded-2xl overflow-hidden">
          <iframe
            src={videoEmbedUrl}
            className="w-full h-full"
            title="Бейне"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  ) : null;

  // Program (§ item 5) — a vertical timeline instead of a single text-dump
  // paragraph (§9). ProgramTimeline itself preserves the exact existing
  // precedence (structured programItems > parsed programText > nothing)
  // and the exact same hardcoded generic fallback timeline when the
  // invite genuinely has neither — only the free-text branch's
  // presentation actually changes, from one unscannable paragraph to
  // parsed timeline entries, falling back to the original plain paragraph
  // if the text has no recognizable "HH:MM — ..." lines at all. The
  // stored programText string itself is never touched.
  const programSection = has("program") ? (
    <section key="program" className={sectionPy} style={{ background: sectionBg("cream"), borderTop: sectionDivider }}>
      <div className="max-w-md mx-auto">
        <SectionDecoration decorationId={sectionDecorationId("program")} label="Бағдарлама" accent={accent} className="text-center mb-8" />
        {(!d.programItems || d.programItems.length === 0) && d.programText ? (
          <ProgramTimeline text={d.programText} accent={accent} textDark="var(--charcoal)" textMuted="var(--muted)" ornament={sectionOrnament("program")} />
        ) : (
          <ProgramTimeline items={programItems} accent={accent} textDark="var(--charcoal)" textMuted="var(--muted)" ornament={sectionOrnament("program")} />
        )}
      </div>
    </section>
  ) : null;

  const dressCodeSection = (has("dress_code") && d.dressCode) ? (
    <section key="dress_code" className={sectionPy} style={{ background: sectionBg("ivory"), borderTop: sectionDivider }}>
      <div className="max-w-md mx-auto text-center">
        <SectionDecoration decorationId={sectionDecorationId("program")} label={sectionOrnament("program") ? "ДРЕСС-КОД" : "Dress Code"} accent={accent} className="mb-4" />
        <div className="rounded-2xl p-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
          <p className="invite-body" style={{ color: "var(--charcoal)" }}>{d.dressCode}</p>
        </div>
      </div>
    </section>
  ) : null;

  // Location (§ item 6) — venue/address text is always shown (base event
  // info); only the "Картада ашу" button requires both the "map" section
  // to be enabled and the map entitlement, exactly the same authoritative
  // rule the old inline-hero + separate Map block enforced between them
  // before this restructuring.
  const locationSection = (location || d.address) ? (
    <section key="location" className={sectionPy} style={{ background: sectionBg("cream"), borderTop: sectionDivider }}>
      <LocationSection
        location={location ?? null}
        address={d.address ?? null}
        mapUrl={has("map") && mapUrl && isEntitledTo("map") ? mapUrl : null}
        kickerLabel="Орналасқан жері"
        buttonLabel="Картада ашу ↗"
        textDark="var(--charcoal)"
        textMuted="var(--muted)"
        accent={accent}
        ornament={sectionOrnament("location")}
      />
    </section>
  ) : null;

  // Gallery (§ item 7) — a swipeable carousel instead of a fixed grid
  // (§11), one dominant photo at a time on mobile, with a
  // template-specific frame (§12) but shared swipe/arrow/pagination
  // behavior for all templates alike (see GalleryCarousel + SwipeTrack).
  // Still the exact same ordered `galleryUrls`, still capped at 10 by the
  // existing constructor/storage limit — this component never touches
  // either.
  const gallerySection = (has("gallery") && gallery.length > 0 && isEntitledTo("gallery")) ? (
    <section key="gallery" className={sectionPy} style={{ background: sectionBg("ivory"), borderTop: sectionDivider }}>
      <SectionDecoration decorationId={sectionDecorationId("gallery")} label="Галерея" accent={accent} className="text-center mb-8" />
      <GalleryCarousel urls={gallery} accent={accent} variant={galleryVariant} labelPrev="Алдыңғы сурет" labelNext="Келесі сурет" />
    </section>
  ) : null;

  const whatsappSection = ((has("whatsapp") || has("contacts")) && (d.whatsapp || d.organizerPhone || d.contactsText)) ? (
    <section key="whatsapp" className={sectionPy} style={{ background: sectionBg("darkOrCream"), borderTop: sectionDivider }}>
      <div className="max-w-sm mx-auto text-center flex flex-col items-center gap-4">
        <SectionDecoration decorationId={sectionDecorationId("gallery")} label="Байланыс" accent={accent} className="" color={isDark ? "rgba(255,255,255,0.4)" : "var(--gold)"} />
        {d.contactsText && (
          <p className="invite-body" style={{ color: "var(--charcoal)" }}>{d.contactsText}</p>
        )}
        {(d.whatsapp || d.organizerPhone) && (
          <a
            href={`https://wa.me/${(d.whatsapp || d.organizerPhone || "").replace(/\D/g, "")}?text=${encodeURIComponent("Сәлеметсіз бе! Шақыру туралы хабарласып жатырмын.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#25D366" }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp арқылы жазу
          </a>
        )}
      </div>
    </section>
  ) : null;

  // Wishes (§ item 8 — owner's own static message to guests, always free,
  // unrelated to the WISHES paid add-on below).
  const wishesStaticSection = has("wishes") ? (
    <section key="wishes_static" className={sectionPy} style={{ background: sectionBg("ivory"), borderTop: sectionDivider }}>
      <div className="max-w-md mx-auto text-center">
        <SectionDecoration decorationId={sectionDecorationId("gallery")} label="Тілектер" accent={accent} className="mb-4" />
        <div className="rounded-2xl p-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
          <p className="invite-body leading-relaxed" style={{ color: "var(--charcoal)" }}>
            {d.wishesText || "Тілектеріңізді жазыңыз..."}
          </p>
        </div>
      </div>
    </section>
  ) : null;

  // Guest wishes wall (paid WISHES add-on) — guests writing BACK to the
  // couple, a real persisted Wish[] model, distinct from the static
  // wishesText above. Real, published invites show the real wall; the
  // template demo shows a realistic sample instead of nothing (§4/§7) —
  // WishesWall's own `demo` prop guarantees no submission ever reaches
  // the server in that mode. A real invite that ISN'T published yet
  // (owner's own unpublished-preview) shows neither — unchanged from
  // before this task.
  const wishesWallSection = isEntitledTo("wishes") ? (
    invite?.status === "PUBLISHED" ? (
      <WishesWall key="wishes" inviteId={invite.id} wishes={wishes} accent={accent} cardBg={cardBg} cardBorder={cardBorder} sectionDivider={sectionDivider} ornament={sectionOrnament("wishes")} />
    ) : demo ? (
      <WishesWall key="wishes" demo lang={lang} accent={accent} cardBg={cardBg} cardBorder={cardBorder} sectionDivider={sectionDivider} ornament={sectionOrnament("wishes")} />
    ) : null
  ) : null;

  const giftInfoSection = (has("gift_info") && d.giftInfo) ? (
    <section key="gift_info" className={sectionPy} style={{ background: sectionBg("ivory"), borderTop: sectionDivider }}>
      <div className="max-w-md mx-auto text-center">
        <SectionDecoration decorationId={sectionDecorationId("wishes")} label="Сыйлық ақпараты" accent={accent} className="mb-4" />
        <div className="rounded-2xl p-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
          <p className="invite-body font-mono" style={{ color: "var(--charcoal)" }}>{d.giftInfo}</p>
        </div>
      </div>
    </section>
  ) : null;

  // RSVP (§ item 9, paid add-on).
  const rsvpSection = (has("rsvp") && isEntitledTo("rsvp")) ? (
    <section key="rsvp" className={sectionPy} style={{ background: sectionBg("ivory"), borderTop: sectionDivider }}>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-7">
          <SectionDecoration decorationId={sectionDecorationId("rsvp")} label="RSVP" accent={accent} className="mb-2" />
          <h2 className="heading-display invite-headline mb-2" style={{ color: "var(--charcoal)" }}>Қатысасыз ба?</h2>
          <p className="invite-caption" style={{ color: "var(--muted)" }}>{d.rsvpText || "Жауабыңызды жіберіңіз"}</p>
        </div>

        {invite?.status === "PUBLISHED" ? (
          <RSVPForm inviteId={invite.id} accent={accent} ornament={sectionOrnament("rsvp")} />
        ) : demo ? (
          // Full-looking, fully-interactive RSVP form so a prospective
          // customer sees the actual finished experience (§4/§10) —
          // RSVPForm's own `demo` prop guarantees submission never
          // reaches submitRSVP/the DB, only a local success state.
          <RSVPForm demo accent={accent} lang={lang} ornament={sectionOrnament("rsvp")} />
        ) : (
          // Compact, visually intentional placeholder — a real invite's
          // own unpublished-preview state, unchanged from before this
          // task. Same message, same meaning (RSVP becomes active once
          // the invite is published), just sized to read as a calm
          // status note rather than a broken empty section.
          <div className="rounded-2xl px-5 py-4 flex items-center gap-3 bg-white" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
            <span className="text-lg shrink-0" aria-hidden>🔒</span>
            <p className="invite-caption leading-snug" style={{ color: "var(--muted)" }}>RSVP пішіні жарияланғаннан кейін белсенді болады</p>
          </div>
        )}
      </div>
    </section>
  ) : null;

  const SECTION_ELEMENTS: Record<ReorderableSectionId, React.ReactNode> = {
    hosts: hostsSection,
    datetime: dateSection,
    invitation: invitationSection,
    countdown: countdownSection,
    program: programSection,
    location: locationSection,
    gallery: gallerySection,
    wishes: wishesWallSection,
    rsvp: rsvpSection,
  };
  const RIDER_ELEMENTS: Record<string, React.ReactNode> = {
    love_story: loveStorySection,
    video: videoSection,
    dress_code: dressCodeSection,
    whatsapp: whatsappSection,
    wishes_static: wishesStaticSection,
    gift_info: giftInfoSection,
  };
  const orderedSectionIds = resolveSectionOrder(visualConfig);
  const bodyContent = orderedSectionIds.flatMap((id) => [
    SECTION_ELEMENTS[id],
    ...(RIDER_ANCHORS[id] ?? []).map((riderId) => RIDER_ELEMENTS[riderId]),
  ]);

  return (
    <div className="min-h-screen" style={{ fontFamily, ...themeVars }}>
      {isPreview && (
        <div className="sticky top-0 z-50 text-center text-sm font-semibold py-2 px-4 text-white" style={{ background: "var(--gold-dark)" }}>
          👁 Алдын ала қарау — шақыру жарияланбаған
        </div>
      )}

      {/* Background invitation audio — a small floating control, never an
          in-page section (see MusicPlayer.tsx). Positioned here so it sits
          above every section via fixed positioning regardless of scroll.
          Gated on musicEnabled alone (not a "music" section/block id — see
          the comment by BLOCK_META in EditorClient.tsx for why that
          previously-separate toggle was removed as a source of bugs). */}
      {d.musicEnabled && d.musicUrl && isEntitledTo("music") && (
        <MusicPlayer
          url={d.musicUrl}
          accent={accent}
          loop={d.musicLoop ?? true}
          autoplay={d.musicAutoplay ?? false}
          avoidBottom={demo}
          ornament={resolveSectionVariant<OrnamentVariant>(visualConfig, "hero", legacyOrnament) === "ethno"}
        />
      )}

      {/* ── Hero ── */}
      <section className={`relative min-h-screen overflow-hidden ${effectiveWeddingLayout ? "flex flex-col" : "flex flex-col items-center justify-center px-6 py-20"}`}>
        {effectiveWeddingLayout ? (
          // The 5 flagship Wedding templates, and any Builder-configured
          // template with a hero variant set: the photo lives ENTIRELY
          // inside WeddingHero's own composition (full-bleed / top-band /
          // framed / fade / arched) — no separate whole-section background
          // image layer, no ambient glow circles, no Zaure ornaments (that
          // slug never has a weddingLayout entry, so it's mutually
          // exclusive with this branch already).
          <div className="flex-1 flex flex-col">
            <WeddingHero
              minimal
              layout={effectiveWeddingLayout}
              tokens={{ accent, textDark, textMuted, isDark, bg: heroBg }}
              data={{
                name,
                partner,
                hostsLine,
                date: d.date ?? null,
                time: d.time ?? null,
                location: location ?? null,
                address: d.address ?? null,
                message: has("invitation_text") ? message ?? null : null,
                note: d.note ?? null,
                age: d.age ?? null,
                photoUrl: d.bgImageUrl ?? null,
              }}
            />
          </div>
        ) : (
          <>
            {/* Background layers */}
            {bgType === "image" && d.bgImageUrl ? (
              <>
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${d.bgImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: d.bgBlur ? `blur(${d.bgBlur}px)` : undefined,
                    opacity: d.bgOpacity ?? 1,
                    transform: "scale(1.05)",
                  }}
                />
                {d.bgOverlay && d.bgOverlay !== "rgba(0,0,0,0)" && (
                  <div className="absolute inset-0" style={{ background: d.bgOverlay }} />
                )}
              </>
            ) : bgType === "video" && d.bgVideoUrl ? (
              <>
                <video
                  className="absolute inset-0 w-full h-full object-cover"
                  src={d.bgVideoUrl}
                  autoPlay muted loop playsInline
                  style={{ opacity: d.bgOpacity ?? 1 }}
                />
                {d.bgOverlay && d.bgOverlay !== "rgba(0,0,0,0)" && (
                  <div className="absolute inset-0" style={{ background: d.bgOverlay }} />
                )}
              </>
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} style={{ background: heroBg }} />
            )}

            {/* Ambient glow */}
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle,${accent}20,transparent 70%)` }} />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle,${accent}15,transparent 70%)` }} />

            {/* Zaure Premium floral corner ornaments */}
            {isZaurePremium && (
              <>
                <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none z-[5]"><ZaureFloralCorner /></div>
                <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none z-[5]"><ZaureFloralCorner mirror /></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 pointer-events-none z-[5]"><ZaureFloralCorner vflip /></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none z-[5]"><ZaureFloralCorner mirror vflip /></div>
              </>
            )}

            <div className="relative z-10 w-full max-w-md mx-auto text-center flex flex-col items-center gap-6">
              {has("hero") && (
                <>
                  <p className="invite-hero-kicker" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)" }}>
                    Сізді шақырамыз
                  </p>
                  <h1 className="heading-display invite-hero-name break-words" style={{ color: textDark }}>
                    {displayName}
                  </h1>
                  {d.age && (
                    <p className="invite-caption" style={{ color: textMuted }}>{d.age}</p>
                  )}
                </>
              )}

              <div className="flex items-center gap-4 w-full px-4">
                <div className="flex-1 h-px opacity-25" style={{ background: accent }} />
                <span className="opacity-40" style={{ color: accent, fontSize: isZaurePremium ? "0.7rem" : "0.875rem", letterSpacing: isZaurePremium ? "0.35em" : undefined }}>
                  {isZaurePremium ? "◆ ◆ ◆" : "◆"}
                </span>
                <div className="flex-1 h-px opacity-25" style={{ background: accent }} />
              </div>
            </div>
          </>
        )}

        {has("rsvp") && isEntitledTo("rsvp") && (
          <div className="absolute bottom-7 inset-x-0 flex flex-col items-center gap-2 pointer-events-none">
            <p className="label-caps text-[9px]" style={{ color: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.22)" }}>Жауап беріңіз</p>
            <div className="w-5 h-8 rounded-full border-2 flex items-start justify-center pt-1.5"
              style={{ borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)" }}>
              <div className="w-1 h-2 rounded-full animate-bounce" style={{ background: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.2)" }} />
            </div>
          </div>
        )}
      </section>

      {/* Zaure Premium ornamental band */}
      {isZaurePremium && (
        <div className="py-3 flex items-center justify-center gap-3" style={{ background: "#F3EDE3" }}>
          <div className="h-px w-12 opacity-20" style={{ background: "#B8925A" }} />
          <p className="text-xs tracking-[0.35em] opacity-30" style={{ color: "#B8925A" }}>◆ ◆ ◆</p>
          <div className="h-px w-12 opacity-20" style={{ background: "#B8925A" }} />
        </div>
      )}

      {/* ── Body sections, in the Builder-configurable order (§16) — the
          default order (no visualConfig, or a template that predates this
          feature) reconstructs the exact original hardcoded sequence via
          RIDER_ANCHORS above, so every existing template renders
          byte-identically. ── */}
      {bodyContent}

      {/* ── Footer ── */}
      <footer className="py-8 px-4 text-center text-xs" style={{ background: "var(--charcoal)", color: "#4A4440" }}>
        Шақыру · Қазақстандық премиум цифрлы шақыру сервисі ·{" "}
        <Link href="/" style={{ color: "var(--gold)" }}>Өз шақыруыңызды жасаңыз →</Link>
      </footer>
    </div>
  );
}
