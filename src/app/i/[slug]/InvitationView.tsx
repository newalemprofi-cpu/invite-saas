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
import { AssetDecorationLayer } from "@/components/wedding/AssetDecorations";
import {
  type VisualConfig,
  type SectionId,
  type ReorderableSectionId,
  type HeroVariant,
  type GalleryVariantId,
  type OrnamentVariant,
  type DecorationId,
  type ContentPlaceholder,
  resolveSectionOrder,
  resolveSectionVariant,
  resolveSectionDecoration,
  resolveSectionText,
  resolveSectionVisibility,
  resolveSectionTypography,
  typographyRoleToStyle,
  resolveSectionMedia,
  resolveSectionBackground,
  resolveSectionDecorations,
  resolveSectionBorder,
  resolveSectionSpacing,
  gradientPresetToCss,
  HERO_VARIANT_TO_PHOTO_MODE,
  GALLERY_VARIANT_TO_FRAME,
  FONT_OPTIONS,
  RADIUS_VALUES,
  SHADOW_VALUES,
  BUTTON_RADIUS_VALUES,
  SPACING_CLASS,
  SPACING_SIZE_REM,
  BORDER_WIDTH_PX,
  TEXT_SIZE_CLASS,
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
  /** Locale for the handful of genuinely NEW demo-only strings, AND (as of
   * the Full Production Template Designer task) the language a template's
   * own admin-configured content overrides render in. Every OTHER
   * pre-existing string in this component stays hardcoded Kazakh
   * regardless of `lang` (§16/established convention) — only text an
   * admin has explicitly configured via the Builder's Content panel
   * becomes genuinely bilingual. Real `/i/[slug]` has no lang concept at
   * all and never passes this (defaults "kk"), so a real published
   * invitation always renders its content overrides in Kazakh, exactly
   * like every other pre-existing string in this file — not a limitation
   * introduced by this task, the same rule every string here already
   * followed. */
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
  /**
   * Full Production Template Designer task (§14/§10): a plain, already-
   * resolved `assetId -> loadable image URL` map for any Template Asset
   * Library images referenced by this template's section
   * backgrounds/decorations. Deliberately a plain object, never a
   * database call made from inside this component — InvitationView must
   * stay renderable inside the Admin Builder's Client Component preview,
   * which has no server-only Prisma access. Server callers
   * (/i/[slug]/page.tsx, /templates/[slug]/page.tsx) resolve this via
   * `lib/template-assets.ts`'s `resolveAssetUrls()` before rendering; the
   * Builder maintains its own client-side copy from the same asset list
   * it already loads for its Asset Library picker. An assetId missing
   * from this map (asset deleted, or not yet loaded) simply isn't
   * rendered — never a broken-image icon, never a crash. Defaults to `{}`.
   */
  assetUrls?: Record<string, string>;
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
 * Full Production Template Designer task — resolves a section's
 * background/border/spacing/decorations config into a wrapping
 * `<section>` element. A MODULE-LEVEL component (not defined inside
 * InvitationView) per the React Compiler purity rule — components must
 * never be created during another component's render — so every value
 * it needs comes in as an explicit prop rather than a closure. A section
 * with NO background/border/spacing override renders EXACTLY the plain
 * `<section className={sectionPy} style={{background: defaultBg,
 * borderTop: sectionDivider}}>` every section already used before this
 * task, byte-for-byte (confirmed by the Designer task's own regression
 * pixel-diff) — every new field here is additive and only takes effect
 * once an admin explicitly sets it through the Builder.
 */
function SectionShell({
  id, visualConfig, assetUrls, defaultBg, sectionPy, sectionDivider, accent, children, as = "section", extraClassName = "",
}: {
  id: SectionId;
  visualConfig: VisualConfig | null;
  assetUrls: Record<string, string>;
  defaultBg: string;
  sectionPy: string;
  sectionDivider: string;
  accent: string;
  children: React.ReactNode;
  /** "footer" for the Footer section (semantic landmark) — every other
   * caller keeps the original "section" tag. Purely cosmetic/semantic,
   * never affects styling logic below. */
  as?: "section" | "footer";
  /** Extra classes appended after the shell's own base classes — used by
   * Footer to keep its original `text-center text-xs` typography base
   * independent of every other section's styling. */
  extraClassName?: string;
}) {
  const bg = resolveSectionBackground(visualConfig, id);
  const border = resolveSectionBorder(visualConfig, id);
  const spacing = resolveSectionSpacing(visualConfig, id);
  const decorations = resolveSectionDecorations(visualConfig, id);

  let backgroundStyle: React.CSSProperties = { background: defaultBg };
  if (bg?.type === "solid" && bg.color) {
    backgroundStyle = { background: bg.color };
  } else if (bg?.type === "gradient") {
    const css = gradientPresetToCss(bg.gradient, accent, defaultBg);
    backgroundStyle = { background: css ?? defaultBg };
  } else if (bg?.type === "image" && bg.assetId && assetUrls[bg.assetId]) {
    backgroundStyle = {
      backgroundImage: `url(${assetUrls[bg.assetId]})`,
      backgroundSize: bg.fit === "contain" ? "contain" : "cover",
      backgroundPosition: bg.position ?? "center",
    };
  }
  // bg?.type === "inherit" or undefined -> keeps the caller's own default
  // background exactly as before this feature.

  const hasSpacingOverride = !!(spacing?.top || spacing?.bottom);
  const paddingStyle: React.CSSProperties = hasSpacingOverride
    ? {
        paddingTop: spacing?.top ? `${SPACING_SIZE_REM[spacing.top]}rem` : undefined,
        paddingBottom: spacing?.bottom ? `${SPACING_SIZE_REM[spacing.bottom]}rem` : undefined,
      }
    : {};

  const hasBorder = !!(border?.style && border.style !== "none");
  const borderStyle: React.CSSProperties = {
    ...(hasBorder && { border: `${BORDER_WIDTH_PX[border!.style!]}px solid ${border?.color ?? accent}` }),
    ...(border?.radius && { borderRadius: RADIUS_VALUES[border.radius] }),
    ...(border?.shadow && { boxShadow: SHADOW_VALUES[border.shadow] }),
  };

  const showOverlay = bg?.type === "image" && bg.overlayColor && bg.overlayOpacity;
  const Tag = as;

  return (
    <Tag
      className={`relative overflow-hidden ${hasSpacingOverride ? "px-4" : sectionPy} ${extraClassName}`}
      style={{
        ...backgroundStyle,
        ...paddingStyle,
        ...borderStyle,
        borderTop: hasBorder ? undefined : sectionDivider,
      }}
    >
      <AssetDecorationLayer decorations={decorations} assetUrls={assetUrls} layer="background" />
      {showOverlay && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: bg!.overlayColor, opacity: bg!.overlayOpacity }} />
      )}
      <div className="relative" style={spacing?.gap ? { display: "flex", flexDirection: "column", gap: `${SPACING_SIZE_REM[spacing.gap]}rem` } : undefined}>
        {children}
      </div>
      <AssetDecorationLayer decorations={decorations} assetUrls={assetUrls} layer="foreground" />
    </Tag>
  );
}

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
  d, tmpl, entitled, wishes, isPreview = false, invite = null, demo = false, lang = "kk", visualConfigOverride, assetUrls = {},
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

  // Full Production Template Designer task (§3/§5): the CLOSED placeholder
  // context every content override's `{token}` substitution resolves
  // against — built entirely from CUSTOMER data, never template config.
  // Template content can reference these; it can never supply or override
  // them.
  const placeholderCtx: Partial<Record<ContentPlaceholder, string>> = {
    groomName: name || undefined,
    brideName: partner || undefined,
    hosts: hostsLine || undefined,
    eventDate: d.date ? fmt(d.date) : undefined,
    eventTime: d.time || undefined,
    venue: location || undefined,
  };
  /** Resolves ONE piece of template-static content, in the current
   * `lang`, with placeholder substitution — the single call every
   * section below uses for its admin-editable labels. */
  const text = (id: SectionId, key: string, fallback: string) =>
    resolveSectionText(visualConfig, id, key, lang, fallback, placeholderCtx);
  const visible = (id: SectionId, key: string, fallback = true) =>
    resolveSectionVisibility(visualConfig, id, key, fallback);
  const typographyStyle = (id: SectionId, role: "heading" | "kicker") =>
    typographyRoleToStyle(resolveSectionTypography(visualConfig, id, role));
  const kickerSizeClass = (id: SectionId) => {
    const size = resolveSectionTypography(visualConfig, id, "kicker")?.size;
    return size ? TEXT_SIZE_CLASS[size] : undefined;
  };

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

  // Full Production Template Designer task (§3 Hero controls) — an admin-
  // configured hero background (solid/gradient) only ever fills in the
  // DEFAULT the customer would otherwise see (§10: "template supplies
  // HOW"), never overriding a color/image/video the customer explicitly
  // picked in the constructor (§3: "customer data supplies WHAT"). It's
  // therefore only consulted here, inside the exact branch that already
  // meant "customer hasn't set their own bgColor" — every other branch
  // (customer bgType is "gradient"/"image"/"video", or bgColor is set)
  // is completely unaffected, so an existing invite's own customization
  // can never be silently replaced by a template change.
  const heroBackground = resolveSectionBackground(visualConfig, "hero");
  const heroBackgroundOverrideCss =
    heroBackground?.type === "solid" && heroBackground.color ? heroBackground.color
    : heroBackground?.type === "gradient" ? gradientPresetToCss(heroBackground.gradient, accent, fallbackBg)
    : undefined;

  let heroBg: string;
  if (bgType === "gradient") heroBg = d.bgGradient || fallbackBg;
  else if (bgType === "color") heroBg = d.bgColor || heroBackgroundOverrideCss || fallbackBg;
  else heroBg = fallbackBg;

  // Same precedence rule, for an admin-configured hero background IMAGE —
  // only shown when the customer hasn't uploaded their own hero photo/
  // video, and only resolved when the referenced Template Asset Library
  // image still exists (a deleted asset silently omits this layer, never
  // crashes — see AssetDecorationLayer's identical contract).
  const heroBackgroundImageUrl =
    !d.bgImageUrl && !d.bgVideoUrl && heroBackground?.type === "image" && heroBackground.assetId
      ? assetUrls[heroBackground.assetId]
      : undefined;
  // A single CSS `background` shorthand covering all 3 configurable types,
  // for the `<WeddingHero>`-composed branch specifically (see
  // WeddingHeroProps.backgroundOverride's doc for why each of the 5
  // compositions needs a plain string override rather than a layered div
  // — every composition paints its own opaque background, so a behind-
  // the-scenes layer would never be visible). Overlay tinting is
  // deliberately not supported for the image case here (documented
  // limitation) — it IS supported for the ad-hoc/no-variant branch below,
  // which already renders overlay as its own dedicated layer.
  const heroComposedBackgroundOverride =
    heroBackgroundImageUrl
      ? `url(${heroBackgroundImageUrl}) ${heroBackground?.position ?? "center"} / ${heroBackground?.fit === "contain" ? "contain" : "cover"} no-repeat`
      : heroBackgroundOverrideCss;
  const heroMedia = resolveSectionMedia(visualConfig, "hero");
  const heroDecorations = resolveSectionDecorations(visualConfig, "hero");
  const heroBorder = resolveSectionBorder(visualConfig, "hero");
  const heroSpacing = resolveSectionSpacing(visualConfig, "hero");
  const heroHasBorder = !!(heroBorder?.style && heroBorder.style !== "none");
  const heroFrameStyle: React.CSSProperties = {
    ...(heroHasBorder && { border: `${BORDER_WIDTH_PX[heroBorder!.style!]}px solid ${heroBorder?.color ?? accent}` }),
    ...(heroBorder?.radius && { borderRadius: RADIUS_VALUES[heroBorder.radius] }),
    ...(heroBorder?.shadow && { boxShadow: SHADOW_VALUES[heroBorder.shadow] }),
    ...(heroSpacing?.top && { paddingTop: `${SPACING_SIZE_REM[heroSpacing.top]}rem` }),
    ...(heroSpacing?.bottom && { paddingBottom: `${SPACING_SIZE_REM[heroSpacing.bottom]}rem` }),
  };

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

  const hostsSection = (hostsLine && visible("hosts", "showHeading")) || hostsLine ? (
    hostsLine ? (
      <SectionShell key="hosts" id="hosts" visualConfig={visualConfig} assetUrls={assetUrls} defaultBg={sectionBg("cream")} sectionPy={sectionPy} sectionDivider={sectionDivider} accent={accent}>
        <div className="max-w-md mx-auto text-center">
          {visible("hosts", "showHeading") && (
            <SectionDecoration decorationId={sectionDecorationId("hosts")} label={text("hosts", "heading", "Той иелері")} accent={accent} className="mb-4" typographyStyle={typographyStyle("hosts", "kicker")} sizeClass={kickerSizeClass("hosts")} />
          )}
          <p className="invite-body leading-relaxed" style={{ color: "var(--charcoal)", ...typographyStyle("hosts", "heading") }}>
            {text("hosts", "prefix", "")}{hostsLine}{text("hosts", "suffix", "")}
          </p>
        </div>
      </SectionShell>
    ) : null
  ) : null;

  const dateSection = d.date ? (
    <SectionShell key="datetime" id="datetime" visualConfig={visualConfig} assetUrls={assetUrls} defaultBg={sectionBg("ivory")} sectionPy={sectionPy} sectionDivider={sectionDivider} accent={accent}>
      <div className="max-w-md mx-auto text-center flex flex-col items-center gap-2">
        {visible("datetime", "showHeading") && (
          <SectionDecoration decorationId={sectionDecorationId("datetime")} label={text("datetime", "heading", "Күні мен уақыты")} accent={accent} className="mb-1" typographyStyle={typographyStyle("datetime", "kicker")} sizeClass={kickerSizeClass("datetime")} />
        )}
        <p className="heading-display invite-headline font-semibold" style={{ color: "var(--charcoal)", ...typographyStyle("datetime", "heading") }}>
          {fmt(d.date)}
        </p>
        {d.time && visible("datetime", "showWeekday") && <p className="invite-caption" style={{ color: "var(--muted)" }}>Сағат {d.time}</p>}
      </div>
    </SectionShell>
  ) : null;

  const invitationSection = ((has("invitation_text") && message) || d.note) ? (
    <SectionShell key="invitation" id="invitation" visualConfig={visualConfig} assetUrls={assetUrls} defaultBg={sectionBg("cream")} sectionPy={sectionPy} sectionDivider={sectionDivider} accent={accent}>
      <div className="max-w-md mx-auto flex flex-col items-center gap-4 text-center">
        {sectionDecorationId("invitation") === "kazakh-qoshqar" && <KazakhDivider accent={accent} />}
        {visible("invitation", "showHeading", false) && (
          <p className="invite-kicker" style={{ color: "var(--gold)", ...typographyStyle("invitation", "kicker") }}>{text("invitation", "heading", "")}</p>
        )}
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
    </SectionShell>
  ) : null;

  const countdownSection = (has("countdown") && d.date) ? (
    <SectionShell key="countdown" id="countdown" visualConfig={visualConfig} assetUrls={assetUrls} defaultBg={sectionBg("darkOrCream")} sectionPy={sectionPy} sectionDivider={sectionDivider} accent={accent}>
      <div className="max-w-md mx-auto text-center">
        {visible("countdown", "showHeading") && (
          <SectionDecoration decorationId={sectionDecorationId("countdown")} label={text("countdown", "heading", "Іс-шараға дейін")} accent={accent} className="mb-8" color={isDark ? "rgba(255,255,255,0.4)" : "var(--gold)"} typographyStyle={typographyStyle("countdown", "kicker")} sizeClass={kickerSizeClass("countdown")} />
        )}
        <Countdown
          targetDate={d.date}
          targetTime={d.time}
          accent={accent}
          textMuted={isDark ? "rgba(255,255,255,0.45)" : "var(--muted)"}
          serverNow={nowMs}
          ornament={sectionOrnament("countdown")}
          dayLabel={text("countdown", "dayLabel", "күн")}
          hourLabel={text("countdown", "hourLabel", "сағат")}
          minuteLabel={text("countdown", "minuteLabel", "минут")}
          secondLabel={text("countdown", "secondLabel", "секунд")}
        />
      </div>
    </SectionShell>
  ) : null;

  const loveStorySection = (has("love_story") && d.loveStory) ? (
    <SectionShell key="love_story" id="countdown" visualConfig={visualConfig} assetUrls={{}} defaultBg={sectionBg("ivory")} sectionPy={sectionPy} sectionDivider={sectionDivider} accent={accent}>
      <div className="max-w-md mx-auto text-center">
        <SectionDecoration decorationId={sectionDecorationId("countdown")} label="Біздің тарих" accent={accent} className="mb-5" />
        <p className="invite-body leading-relaxed" style={{ color: "var(--charcoal)" }}>{d.loveStory}</p>
      </div>
    </SectionShell>
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
    <SectionShell key="program" id="program" visualConfig={visualConfig} assetUrls={assetUrls} defaultBg={sectionBg("cream")} sectionPy={sectionPy} sectionDivider={sectionDivider} accent={accent}>
      <div className="max-w-md mx-auto">
        {visible("program", "showHeading") && (
          <SectionDecoration decorationId={sectionDecorationId("program")} label={text("program", "heading", "Бағдарлама")} accent={accent} className="text-center mb-8" typographyStyle={typographyStyle("program", "kicker")} sizeClass={kickerSizeClass("program")} />
        )}
        {visible("program", "showSubtitle", false) && (
          <p className="invite-caption text-center -mt-5 mb-6" style={{ color: "var(--muted)" }}>{text("program", "subtitle", "")}</p>
        )}
        {(!d.programItems || d.programItems.length === 0) && d.programText ? (
          <ProgramTimeline text={d.programText} accent={accent} textDark="var(--charcoal)" textMuted="var(--muted)" ornament={sectionOrnament("program")} />
        ) : (
          <ProgramTimeline items={programItems} accent={accent} textDark="var(--charcoal)" textMuted="var(--muted)" ornament={sectionOrnament("program")} />
        )}
      </div>
    </SectionShell>
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
    <SectionShell key="location" id="location" visualConfig={visualConfig} assetUrls={assetUrls} defaultBg={sectionBg("cream")} sectionPy={sectionPy} sectionDivider={sectionDivider} accent={accent}>
      <LocationSection
        location={location ?? null}
        address={visible("location", "showAddress") ? (d.address ?? null) : null}
        mapUrl={has("map") && mapUrl && isEntitledTo("map") ? mapUrl : null}
        kickerLabel={text("location", "heading", "Орналасқан жері")}
        buttonLabel={text("location", "mapButtonLabel", "Картада ашу ↗")}
        textDark="var(--charcoal)"
        textMuted="var(--muted)"
        accent={accent}
        ornament={sectionOrnament("location")}
        showHeading={visible("location", "showHeading")}
        kickerStyle={typographyStyle("location", "kicker")}
        headingStyle={typographyStyle("location", "heading")}
      />
    </SectionShell>
  ) : null;

  // Gallery (§ item 7) — a swipeable carousel instead of a fixed grid
  // (§11), one dominant photo at a time on mobile, with a
  // template-specific frame (§12) but shared swipe/arrow/pagination
  // behavior for all templates alike (see GalleryCarousel + SwipeTrack).
  // Still the exact same ordered `galleryUrls`, still capped at 10 by the
  // existing constructor/storage limit — this component never touches
  // either.
  const gallerySection = (has("gallery") && isEntitledTo("gallery")) ? (
    gallery.length > 0 ? (
      <SectionShell key="gallery" id="gallery" visualConfig={visualConfig} assetUrls={assetUrls} defaultBg={sectionBg("ivory")} sectionPy={sectionPy} sectionDivider={sectionDivider} accent={accent}>
        {visible("gallery", "showHeading") && (
          <SectionDecoration decorationId={sectionDecorationId("gallery")} label={text("gallery", "heading", "Галерея")} accent={accent} className="text-center mb-8" typographyStyle={typographyStyle("gallery", "kicker")} sizeClass={kickerSizeClass("gallery")} />
        )}
        {visible("gallery", "showSubtitle", false) && (
          <p className="invite-caption text-center -mt-5 mb-6" style={{ color: "var(--muted)" }}>{text("gallery", "subtitle", "")}</p>
        )}
        <GalleryCarousel
          urls={gallery} accent={accent} variant={galleryVariant} labelPrev="Алдыңғы сурет" labelNext="Келесі сурет"
          aspectRatio={resolveSectionMedia(visualConfig, "gallery")?.aspectRatio}
          fit={resolveSectionMedia(visualConfig, "gallery")?.fit}
        />
      </SectionShell>
    ) : demo ? (
      <SectionShell key="gallery" id="gallery" visualConfig={visualConfig} assetUrls={assetUrls} defaultBg={sectionBg("ivory")} sectionPy={sectionPy} sectionDivider={sectionDivider} accent={accent}>
        {visible("gallery", "showHeading") && (
          <SectionDecoration decorationId={sectionDecorationId("gallery")} label={text("gallery", "heading", "Галерея")} accent={accent} className="text-center mb-4" typographyStyle={typographyStyle("gallery", "kicker")} sizeClass={kickerSizeClass("gallery")} />
        )}
        <p className="invite-caption text-center" style={{ color: "var(--muted)" }}>{text("gallery", "emptyStateText", "Суреттер жақында қосылады")}</p>
      </SectionShell>
    ) : null
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
      <SectionShell key="wishes" id="wishes" visualConfig={visualConfig} assetUrls={assetUrls} defaultBg={sectionBg("cream")} sectionPy={sectionPy} sectionDivider={sectionDivider} accent={accent}>
        <WishesWall
          inviteId={invite.id} wishes={wishes} accent={accent} cardBg={cardBg} cardBorder={cardBorder} ornament={sectionOrnament("wishes")}
          headingOverride={text("wishes", "heading", "")} formHeadingOverride={text("wishes", "formHeading", "")}
          namePlaceholderOverride={text("wishes", "namePlaceholder", "")} messagePlaceholderOverride={text("wishes", "messagePlaceholder", "")}
          submitButtonOverride={text("wishes", "submitButton", "")} kickerStyle={typographyStyle("wishes", "kicker")}
          headingStyle={typographyStyle("wishes", "heading")}
        />
      </SectionShell>
    ) : demo ? (
      <SectionShell key="wishes" id="wishes" visualConfig={visualConfig} assetUrls={assetUrls} defaultBg={sectionBg("cream")} sectionPy={sectionPy} sectionDivider={sectionDivider} accent={accent}>
        <WishesWall
          demo lang={lang} accent={accent} cardBg={cardBg} cardBorder={cardBorder} ornament={sectionOrnament("wishes")}
          headingOverride={text("wishes", "heading", "")} formHeadingOverride={text("wishes", "formHeading", "")}
          namePlaceholderOverride={text("wishes", "namePlaceholder", "")} messagePlaceholderOverride={text("wishes", "messagePlaceholder", "")}
          submitButtonOverride={text("wishes", "submitButton", "")} kickerStyle={typographyStyle("wishes", "kicker")}
          headingStyle={typographyStyle("wishes", "heading")}
        />
      </SectionShell>
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
    <SectionShell key="rsvp" id="rsvp" visualConfig={visualConfig} assetUrls={assetUrls} defaultBg={sectionBg("ivory")} sectionPy={sectionPy} sectionDivider={sectionDivider} accent={accent}>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-7">
          <SectionDecoration decorationId={sectionDecorationId("rsvp")} label={text("rsvp", "heading", "RSVP")} accent={accent} className="mb-2" typographyStyle={typographyStyle("rsvp", "kicker")} sizeClass={kickerSizeClass("rsvp")} />
          <h2 className="heading-display invite-headline mb-2" style={{ color: "var(--charcoal)", ...typographyStyle("rsvp", "heading") }}>{text("rsvp", "question", "Қатысасыз ба?")}</h2>
          <p className="invite-caption" style={{ color: "var(--muted)" }}>{text("rsvp", "helperText", d.rsvpText || "Жауабыңызды жіберіңіз")}</p>
        </div>

        {invite?.status === "PUBLISHED" ? (
          <RSVPForm inviteId={invite.id} accent={accent} ornament={sectionOrnament("rsvp")} submitButtonOverride={text("rsvp", "submitButton", "")} />
        ) : demo ? (
          // Full-looking, fully-interactive RSVP form so a prospective
          // customer sees the actual finished experience (§4/§10) —
          // RSVPForm's own `demo` prop guarantees submission never
          // reaches submitRSVP/the DB, only a local success state.
          <RSVPForm demo accent={accent} lang={lang} ornament={sectionOrnament("rsvp")} submitButtonOverride={text("rsvp", "submitButton", "")} demoExplanationOverride={text("rsvp", "demoExplanation", "")} />
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
    </SectionShell>
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

  // Footer content overrides (§4 — "where product policy permits"): only
  // the branding prefix text and the CTA link's own LABEL are
  // overridable; the CTA's actual href ("/") and the fact that a
  // branding line exists at all are never configurable — product-policy
  // boundaries this task explicitly must not touch.
  const footerBranding = text("footer", "brandingText", "Шақыру · Қазақстандық премиум цифрлы шақыру сервисі");
  const footerCta = text("footer", "ctaLabel", "Өз шақыруыңызды жасаңыз →");

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
      <section className={`relative min-h-screen overflow-hidden ${effectiveWeddingLayout ? "flex flex-col" : "flex flex-col items-center justify-center px-6 py-20"}`} style={heroFrameStyle}>
        {/* Full Production Template Designer task — asset-based hero
            decorations, shared by both branches below so they sit above
            either the WeddingHero composition or the ad-hoc fallback
            identically. Hero background itself is applied separately per
            branch below (each of the 5 flagship compositions paints its
            OWN opaque background, so an override has to replace that
            specific layer to be visible — see backgroundOverride's doc on
            WeddingHeroProps for why). */}
        <AssetDecorationLayer decorations={heroDecorations} assetUrls={assetUrls} layer="background" />
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
              kickerOverride={visible("hero", "showKicker") ? text("hero", "kicker", "") || undefined : ""}
              subtitleOverride={visible("hero", "showSubtitle", true) ? text("hero", "subtitle", "") : undefined}
              showDivider={visible("hero", "showDivider")}
              photoFit={heroMedia?.fit}
              photoPosition={heroMedia?.position}
              backgroundOverride={heroComposedBackgroundOverride}
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
                    backgroundSize: heroMedia?.fit === "contain" ? "contain" : "cover",
                    backgroundPosition: heroMedia?.position ?? "center",
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
            ) : bgType === "color" && !d.bgColor && heroBackgroundImageUrl ? (
              // Admin-configured hero background IMAGE — only reached when
              // the customer hasn't set their own bgColor/bgImage/bgVideo
              // (see heroBackgroundImageUrl's own precedence doc above).
              <>
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${heroBackgroundImageUrl})`,
                    backgroundSize: heroBackground?.fit === "contain" ? "contain" : "cover",
                    backgroundPosition: heroBackground?.position ?? "center",
                  }}
                />
                {heroBackground?.overlayColor && heroBackground.overlayOpacity ? (
                  <div className="absolute inset-0" style={{ background: heroBackground.overlayColor, opacity: heroBackground.overlayOpacity }} />
                ) : null}
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
                  {visible("hero", "showKicker") && (
                    <p className="invite-hero-kicker" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)", ...typographyStyle("hero", "kicker") }}>
                      {text("hero", "kicker", "Сізді шақырамыз")}
                    </p>
                  )}
                  <h1 className="heading-display invite-hero-name break-words" style={{ color: textDark, ...typographyStyle("hero", "heading") }}>
                    {displayName}
                  </h1>
                  {d.age && (
                    <p className="invite-caption" style={{ color: textMuted }}>{d.age}</p>
                  )}
                </>
              )}

              {visible("hero", "showDivider") && (
                <div className="flex items-center gap-4 w-full px-4">
                  <div className="flex-1 h-px opacity-25" style={{ background: accent }} />
                  <span className="opacity-40" style={{ color: accent, fontSize: isZaurePremium ? "0.7rem" : "0.875rem", letterSpacing: isZaurePremium ? "0.35em" : undefined }}>
                    {isZaurePremium ? "◆ ◆ ◆" : "◆"}
                  </span>
                  <div className="flex-1 h-px opacity-25" style={{ background: accent }} />
                </div>
              )}
            </div>
          </>
        )}

        <AssetDecorationLayer decorations={heroDecorations} assetUrls={assetUrls} layer="foreground" />

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
      <SectionShell
        id="footer" as="footer" visualConfig={visualConfig} assetUrls={assetUrls}
        defaultBg="var(--charcoal)" sectionPy="py-8 px-4" sectionDivider="none" accent={accent}
        extraClassName="text-center text-xs"
      >
        <span style={{ color: "#4A4440", ...typographyStyle("footer", "heading") }}>{footerBranding}</span>
        {" · "}
        <Link href="/" style={{ color: "var(--gold)", ...typographyStyle("footer", "kicker") }}>{footerCta}</Link>
      </SectionShell>
    </div>
  );
}
