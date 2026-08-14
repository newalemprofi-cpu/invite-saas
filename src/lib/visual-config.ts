import { z } from "zod";

/**
 * ── v2 EXTENSION (Full Production Template Designer task) ───────────────
 * Everything above this point is the original v1 schema/registry, kept
 * completely intact — v1-shaped stored configs (`version: 1`) still parse
 * and render exactly as before. v2 (`version: 2`) is a pure ADDITION: one
 * combined Zod object schema whose new fields are all `.optional()`, so a
 * v1 payload (missing every new field) validates against the SAME schema
 * used for v2 payloads — there is no separate v1-vs-v2 branch to
 * maintain. New saves write `version: 2`; `VISUAL_CONFIG_VERSION` below
 * reflects that as the current default, while `parseVisualConfig`/
 * `safeParseVisualConfigInput` accept either version number.
 */

/**
 * Admin Template Builder's versioned visual composition config
 * (`InviteTemplate.visualConfig`, see prisma/schema.prisma). This is the
 * single source of truth for:
 *   - which section-level VARIANT each section renders as (reusing the
 *     high-quality composition/ornament code already built for the 5
 *     flagship Wedding templates — never arbitrary HTML/CSS),
 *   - which DECORATION (if any) a section's heading shows,
 *   - the template's THEME EXTRAS beyond the pre-existing scalar
 *     bg/accent/textDark/textMuted columns on InviteTemplate (font,
 *     radius, spacing, shadow, button style, plus two genuinely new
 *     tokens — surface, secondary — that had no home before),
 *   - the DEFAULT ORDER of the 9 reorderable body sections.
 *
 * DELIBERATELY NOT stored: raw HTML, raw CSS, raw JS, arbitrary URLs for
 * decorations, or free-form section IDs — every enum here is a closed,
 * code-controlled registry. A section id, variant id, decoration id or
 * font id that isn't in these enums is REJECTED by validation, never
 * silently trusted. See `parseVisualConfig()` at the bottom: any malformed
 * or partially-invalid config safely degrades to `null` (or, for
 * sub-fields with a sensible default, to that default) — it can never
 * throw and can never crash the renderer.
 *
 * Backward compatibility (this is the whole point of the column being
 * nullable): a template with `visualConfig: null` renders through the
 * existing, unmodified code paths — this module is only ever consulted
 * when a template has explicitly opted in by having a saved config.
 */

export const VISUAL_CONFIG_VERSION = 2 as const;
/** Every version this app has ever written is still readable. */
const SUPPORTED_VERSIONS = [1, 2] as const;

/* ── Section identity ──────────────────────────────────────────────────
   The 9 reorderable "body" sections (hero is always first and is
   configured but never reordered; footer/legacy fixed sections like
   love_story/video/dress_code/whatsapp/gift_info are NOT part of the V1
   reorder set — see InvitationView.tsx's ANCHOR_AFTER map for how they
   ride along with their nearest reorderable neighbor, preserving the
   exact current default sequence). This 9+1 set matches the task's own
   conceptual sectionOrder example (hero/invitation/hosts/datetime/
   countdown/program/location/gallery/wishes/rsvp) exactly. */
export const REORDERABLE_SECTION_IDS = [
  "hosts",
  "datetime",
  "invitation",
  "countdown",
  "program",
  "location",
  "gallery",
  "wishes",
  "rsvp",
] as const;
export type ReorderableSectionId = (typeof REORDERABLE_SECTION_IDS)[number];

/** "footer" is v2-only, additive: content-only (branding/CTA/supporting
 * text), never reordered (always renders last, matching its existing
 * fixed position — see InvitationView.tsx's own <footer>), never given a
 * variant/media/decoration (a plain text bar, by product-policy design —
 * §4's explicit "do not break required SaaS branding" instruction). */
export const SECTION_IDS = ["hero", ...REORDERABLE_SECTION_IDS, "footer"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

const reorderableSectionIdSchema = z.enum(REORDERABLE_SECTION_IDS);

/** The default order, identical to InvitationView's pre-existing hardcoded
 * JSX sequence for these 9 sections — this is what every template without
 * a saved sectionOrder (or with one that fails the permutation check
 * below) uses, so legacy rendering is byte-identical. */
export const DEFAULT_SECTION_ORDER: ReorderableSectionId[] = [
  "hosts",
  "datetime",
  "invitation",
  "countdown",
  "program",
  "location",
  "gallery",
  "wishes",
  "rsvp",
];

/* ── Section Variant Registry ──────────────────────────────────────────
   Every variant listed here already exists as real, shipped rendering
   code (built across the mobile-presentation-polish and Kazakh Ethno
   tasks) — this registry does not invent new visual designs, it exposes
   the existing ones as admin-selectable, code-controlled enum values. */

export const HERO_VARIANTS = ["fullBleed", "arch", "topBand", "framed", "fadeDark"] as const;
export type HeroVariant = (typeof HERO_VARIANTS)[number];

/** Maps the admin-facing camelCase id to WeddingHero's existing
 * WeddingPhotoMode (kebab-case, defined in wedding-template-layouts.ts). */
export const HERO_VARIANT_TO_PHOTO_MODE: Record<HeroVariant, string> = {
  fullBleed: "full-bleed",
  arch: "arched-frame",
  topBand: "top-band",
  framed: "framed-oval",
  fadeDark: "fade-dark",
};

/** The handful of sections whose ONLY V1 visual axis is "does it use the
 * ornamented/ethno-derived treatment or the plain default one" — this is
 * literally the `ornament`/`isEthno` boolean prop already built into
 * Countdown/ProgramTimeline/LocationSection/WishesWall/RSVPForm/
 * MusicPlayer, formalized into a named enum instead of a raw boolean so
 * it validates the same way every other variant does. V1 deliberately
 * ships exactly these two strong options per section rather than
 * populating dropdowns with untested designs (§7's explicit instruction). */
export const ORNAMENT_VARIANTS = ["default", "ethno"] as const;
export type OrnamentVariant = (typeof ORNAMENT_VARIANTS)[number];

/** Gallery already has 6 genuinely distinct, already-implemented frame
 * treatments (GalleryCarousel.tsx's FRAME_BY_VARIANT) — reused verbatim. */
export const GALLERY_VARIANTS = ["default", "romantic", "classicGold", "floral", "darkLuxury", "ethno"] as const;
export type GalleryVariantId = (typeof GALLERY_VARIANTS)[number];
export const GALLERY_VARIANT_TO_FRAME: Record<GalleryVariantId, string> = {
  default: "default",
  romantic: "romantic",
  classicGold: "classic-gold",
  floral: "floral",
  darkLuxury: "dark-luxury",
  ethno: "ethno",
};

const heroVariantSchema = z.enum(HERO_VARIANTS);
const ornamentVariantSchema = z.enum(ORNAMENT_VARIANTS);
const galleryVariantSchema = z.enum(GALLERY_VARIANTS);

/* ── Decoration Registry ───────────────────────────────────────────────
   A safe decoration ID, never executable content — resolved through
   src/components/wedding/DecorationRegistry.tsx's code-controlled map.
   Available on any text-heading section (hosts/datetime/invitation/
   countdown/program/location/wishes/rsvp); gallery/hero use their own
   variant-driven framing instead and ignore this field. */
export const DECORATION_IDS = [
  "none",
  "kazakh-qoshqar",
  "classic-hairline",
  "minimal-line",
  "minimal-diamond",
] as const;
export type DecorationId = (typeof DECORATION_IDS)[number];
const decorationIdSchema = z.enum(DECORATION_IDS);

/* ── Theme tokens ───────────────────────────────────────────────────────
   background/primary/secondary-as-accent/text/muted already exist as
   InviteTemplate's own bg/accent/textDark/textMuted scalar columns
   (admin-editable today via TemplatesManager's "Визуал токендер"
   section) — deliberately NOT duplicated here, to avoid two competing
   sources of truth for the same visual property. This object holds only
   the genuinely NEW dimensions the task asks for that have no existing
   column: a distinct `surface` (card background, independent of page
   background) and `secondary` color, plus font/radius/spacing/shadow/
   button-style presets. */

export const FONT_IDS = ["serif", "sans"] as const;
export type FontId = (typeof FONT_IDS)[number];
/** Both fonts are already loaded site-wide via next/font/google in
 * layout.tsx (Spectral/Manrope) with verified cyrillic-ext subsets
 * covering every Kazakh letter — see that file's own comment. This is
 * deliberately the ENTIRE font registry: adding a third font means
 * loading a new next/font family (real latency/bundle cost) and would
 * need the same Cyrillic-coverage verification, so V1 ships only the
 * two already-proven, already-loaded options rather than exposing a
 * free-text font name. */
export const FONT_OPTIONS: { id: FontId; cssVar: string; label: string }[] = [
  { id: "serif", cssVar: "var(--font-serif)", label: "Serif (Spectral)" },
  { id: "sans", cssVar: "var(--font-sans)", label: "Sans (Manrope)" },
];
const fontIdSchema = z.enum(FONT_IDS);

export const RADIUS_PRESETS = ["sharp", "soft", "large"] as const;
export type RadiusPreset = (typeof RADIUS_PRESETS)[number];
export const RADIUS_VALUES: Record<RadiusPreset, string> = { sharp: "0.5rem", soft: "1rem", large: "1.5rem" };

export const SPACING_PRESETS = ["compact", "comfortable", "generous"] as const;
export type SpacingPreset = (typeof SPACING_PRESETS)[number];
/** Multiplies onto the existing invitation section-padding scale rather
 * than replacing it with a second parallel spacing system. */
export const SPACING_CLASS: Record<SpacingPreset, string> = {
  compact: "py-10 sm:py-12 px-4",
  comfortable: "py-13 sm:py-16 px-4",
  generous: "py-16 sm:py-20 px-4",
};

export const SHADOW_PRESETS = ["none", "soft", "elevated"] as const;
export type ShadowPreset = (typeof SHADOW_PRESETS)[number];
export const SHADOW_VALUES: Record<ShadowPreset, string> = {
  none: "none",
  soft: "0 4px 14px rgba(0,0,0,0.08)",
  elevated: "0 10px 30px rgba(0,0,0,0.14)",
};

export const BUTTON_STYLES = ["rounded", "pill", "square"] as const;
export type ButtonStyle = (typeof BUTTON_STYLES)[number];
export const BUTTON_RADIUS_VALUES: Record<ButtonStyle, string> = { rounded: "0.75rem", pill: "999px", square: "0.25rem" };

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const hexColorSchema = z.string().regex(HEX_COLOR).optional();

const themeExtrasSchema = z.object({
  surface: hexColorSchema,
  secondary: hexColorSchema,
  headingFont: fontIdSchema.optional(),
  bodyFont: fontIdSchema.optional(),
  radius: z.enum(RADIUS_PRESETS).optional(),
  spacing: z.enum(SPACING_PRESETS).optional(),
  shadow: z.enum(SHADOW_PRESETS).optional(),
  buttonStyle: z.enum(BUTTON_STYLES).optional(),
}).strict();

export type ThemeExtras = z.infer<typeof themeExtrasSchema>;

/* ══════════════════════════ v2: CONTENT OVERRIDES ═══════════════════════
   Template-level STATIC text (§3/§4 — "СІЗДІ ШАҚЫРАМЫЗ", "ТОЙ ИЕЛЕРІ",
   button labels, helper text, empty-state copy) is admin-editable per
   section, always as an explicit {kk, ru} pair — NEVER a single shared
   field, so KK and RU can never leak into each other. This is a strictly
   separate axis from CUSTOMER data (names/date/venue/photos/wishes/RSVP
   responses in `D`/`Invite.data`), which this schema has no way to touch
   at all — there is no field here that could ever hold a customer value,
   by construction (see SECTION_CONTENT_FIELDS below, the closed registry
   of which keys the renderer actually reads per section; anything else is
   validated-but-inert data the renderer never looks at). */

const localizedTextSchema = z.object({
  kk: z.string().max(160).optional(),
  ru: z.string().max(160).optional(),
}).strict();
export type LocalizedText = z.infer<typeof localizedTextSchema>;

/** Generic-but-bounded maps rather than a discriminated per-section
 * schema (11 sections × their own exact shape would be a lot of near-
 * duplicate Zod boilerplate) — safety comes from the VALUE shape
 * (`{kk?, ru?}`, length-capped strings) and the key-count cap below, not
 * from an exhaustive per-section key enum. The renderer (InvitationView)
 * only ever reads the specific keys listed in SECTION_CONTENT_FIELDS for
 * a given section id; any other key an API caller might smuggle in is
 * simply never read — inert, not unsafe. */
const sectionContentSchema = z.object({
  text: z.record(z.string().max(40), localizedTextSchema).refine((v) => Object.keys(v).length <= 30, { message: "too many content keys" }).optional(),
  visibility: z.record(z.string().max(40), z.boolean()).refine((v) => Object.keys(v).length <= 30, { message: "too many visibility keys" }).optional(),
}).strict();
export type SectionContent = z.infer<typeof sectionContentSchema>;

/** The closed registry of which content/visibility keys each section's
 * renderer actually looks up (and what the Admin Builder's Content
 * accordion offers as fields) — §4's per-section field lists, adapted to
 * this project's actual rendered elements. Every "show*" key defaults to
 * `true` (visible) when absent, matching current behavior exactly. */
export const SECTION_CONTENT_FIELDS: Partial<Record<SectionId, { key: string; label: string; multiline?: boolean }[]>> = {
  hero: [
    { key: "kicker", label: "Kicker" },
    { key: "subtitle", label: "Subtitle" },
  ],
  invitation: [{ key: "heading", label: "Тақырып" }, { key: "introLabel", label: "Кіріспе белгі" }],
  hosts: [{ key: "heading", label: "Тақырып" }, { key: "prefix", label: "Префикс" }, { key: "suffix", label: "Суффикс" }],
  datetime: [{ key: "heading", label: "Тақырып" }],
  countdown: [
    { key: "heading", label: "Тақырып" },
    { key: "dayLabel", label: "Күн белгісі" },
    { key: "hourLabel", label: "Сағат белгісі" },
    { key: "minuteLabel", label: "Минут белгісі" },
    { key: "secondLabel", label: "Секунд белгісі" },
  ],
  program: [{ key: "heading", label: "Тақырып" }, { key: "subtitle", label: "Субтитр" }],
  location: [
    { key: "heading", label: "Тақырып" },
    { key: "mapButtonLabel", label: "Карта батырмасы" },
    { key: "venueLabel", label: "Орын белгісі" },
    { key: "addressLabel", label: "Мекенжай белгісі" },
  ],
  gallery: [
    { key: "heading", label: "Тақырып" },
    { key: "subtitle", label: "Субтитр" },
    { key: "emptyStateText", label: "Бос күй мәтіні" },
  ],
  wishes: [
    { key: "heading", label: "Тақырып" },
    { key: "formHeading", label: "Форма тақырыбы" },
    { key: "namePlaceholder", label: "Аты өрісінің үлгісі" },
    { key: "messagePlaceholder", label: "Тілек өрісінің үлгісі" },
    { key: "submitButton", label: "Жіберу батырмасы" },
    { key: "emptyStateText", label: "Бос күй мәтіні" },
  ],
  rsvp: [
    { key: "heading", label: "Тақырып" },
    { key: "question", label: "Сұрақ" },
    { key: "helperText", label: "Көмекші мәтін" },
    { key: "submitButton", label: "Жіберу батырмасы" },
    { key: "demoExplanation", label: "Демо түсіндірмесі", multiline: true },
  ],
  footer: [
    { key: "brandingText", label: "Брендинг мәтіні" },
    { key: "ctaLabel", label: "CTA сілтемесі" },
  ],
};

export const SECTION_VISIBILITY_FIELDS: Partial<Record<SectionId, { key: string; label: string }[]>> = {
  hero: [
    { key: "showKicker", label: "Kicker көрсету" },
    { key: "showSubtitle", label: "Subtitle көрсету" },
    { key: "showDivider", label: "Бөлгіш көрсету" },
  ],
  datetime: [{ key: "showWeekday", label: "Апта күнін көрсету" }, { key: "showHeading", label: "Тақырыпты көрсету" }],
  countdown: [{ key: "showHeading", label: "Тақырыпты көрсету" }],
  program: [{ key: "showHeading", label: "Тақырыпты көрсету" }, { key: "showSubtitle", label: "Субтитрді көрсету" }],
  location: [{ key: "showAddress", label: "Мекенжайды көрсету" }, { key: "showHeading", label: "Тақырыпты көрсету" }],
  gallery: [{ key: "showHeading", label: "Тақырыпты көрсету" }, { key: "showSubtitle", label: "Субтитрді көрсету" }],
  hosts: [{ key: "showHeading", label: "Тақырыпты көрсету" }],
  invitation: [{ key: "showHeading", label: "Тақырыпты көрсету" }],
};

/** Closed placeholder registry (§5) — `{token}` substitution only for
 * these exact names, resolved from the CUSTOMER's own data at render
 * time. No expressions, no JS, no HTML — a plain literal find/replace.
 * An unrecognized `{token}` is left as literal text (never evaluated,
 * never silently dropped) so a typo in the admin's content never hides
 * copy or executes anything. */
export const CONTENT_PLACEHOLDERS = ["groomName", "brideName", "hosts", "eventDate", "eventTime", "venue"] as const;
export type ContentPlaceholder = (typeof CONTENT_PLACEHOLDERS)[number];

export function resolvePlaceholders(text: string, ctx: Partial<Record<ContentPlaceholder, string>>): string {
  return text.replace(/\{(\w+)\}/g, (match, token: string) => {
    if ((CONTENT_PLACEHOLDERS as readonly string[]).includes(token)) {
      return ctx[token as ContentPlaceholder] ?? "";
    }
    return match; // unknown token: render literally, never evaluated/dropped
  });
}

/* ══════════════════════════ v2: TYPOGRAPHY ═══════════════════════════════
   Reuses the project's EXISTING clamp()-based fluid typography scale
   (`.invite-hero-kicker` / `.invite-kicker` / `.invite-hero-name` /
   `.invite-headline` / `.invite-body` / `.invite-caption`, all defined in
   globals.css) as the "size" preset registry — this already guarantees
   safe, responsive, mobile-tested sizing (§7's "use clamp-based scales")
   instead of admin-entered raw pixel values, and reuses a genuinely good
   existing abstraction rather than inventing a parallel one (§0's
   explicit instruction). Scoped to exactly the two text roles every
   section actually renders distinctly today — kicker and heading — not
   an exhaustive body/subtitle/caption/button role system, which would
   require touching far more components than this task's time budget
   supports; documented as a deliberate V2 scope boundary. */

export const TEXT_SIZE_PRESETS = ["caption", "body", "kicker", "headline", "heroName"] as const;
export type TextSizePreset = (typeof TEXT_SIZE_PRESETS)[number];
export const TEXT_SIZE_CLASS: Record<TextSizePreset, string> = {
  caption: "invite-caption",
  body: "invite-body",
  kicker: "invite-kicker",
  headline: "invite-headline",
  heroName: "invite-hero-name",
};

export const TEXT_WEIGHTS = ["normal", "medium", "semibold", "bold"] as const;
export type TextWeight = (typeof TEXT_WEIGHTS)[number];
export const TEXT_WEIGHT_VALUES: Record<TextWeight, number> = { normal: 400, medium: 500, semibold: 600, bold: 700 };

export const TEXT_ALIGNS = ["left", "center", "right"] as const;
export type TextAlign = (typeof TEXT_ALIGNS)[number];

export const LETTER_SPACINGS = ["normal", "wide", "wider"] as const;
export type LetterSpacing = (typeof LETTER_SPACINGS)[number];
export const LETTER_SPACING_VALUES: Record<LetterSpacing, string> = { normal: "normal", wide: "0.05em", wider: "0.12em" };

const typographyRoleSchema = z.object({
  font: fontIdSchema.optional(),
  size: z.enum(TEXT_SIZE_PRESETS).optional(),
  weight: z.enum(TEXT_WEIGHTS).optional(),
  color: hexColorSchema,
  align: z.enum(TEXT_ALIGNS).optional(),
  letterSpacing: z.enum(LETTER_SPACINGS).optional(),
  uppercase: z.boolean().optional(),
  italic: z.boolean().optional(),
}).strict();
export type TypographyRole = z.infer<typeof typographyRoleSchema>;

const typographySchema = z.object({
  heading: typographyRoleSchema.optional(),
  kicker: typographyRoleSchema.optional(),
}).strict();
export type SectionTypography = z.infer<typeof typographySchema>;

/* ══════════════════════════ v2: MEDIA ═══════════════════════════════════
   Presentation of a photo SLOT — hero main photo, gallery frame — never
   the photo itself (§10: template config describes HOW, customer.data
   supplies WHAT). */

export const OBJECT_FITS = ["cover", "contain"] as const;
export type ObjectFit = (typeof OBJECT_FITS)[number];

export const OBJECT_POSITIONS = ["center", "top", "bottom", "left", "right"] as const;
export type ObjectPositionPreset = (typeof OBJECT_POSITIONS)[number];

export const ASPECT_RATIOS = ["1/1", "4/5", "3/4", "16/9", "9/16"] as const;
export type AspectRatioPreset = (typeof ASPECT_RATIOS)[number];

const mediaSchema = z.object({
  fit: z.enum(OBJECT_FITS).optional(),
  position: z.enum(OBJECT_POSITIONS).optional(),
  aspectRatio: z.enum(ASPECT_RATIOS).optional(),
  radius: z.enum(RADIUS_PRESETS).optional(),
}).strict();
export type SectionMedia = z.infer<typeof mediaSchema>;

/* ══════════════════════════ v2: BACKGROUND ═══════════════════════════════
   Per-section background — solid/gradient/image, never a raw CSS string.
   `assetId` references a TemplateAsset row (see lib/template-assets.ts);
   an assetId that no longer resolves to a real asset is handled by the
   renderer exactly like a missing customer photo — silently falls back,
   never crashes (see resolveSectionBackground below). */

export const BACKGROUND_TYPES = ["inherit", "solid", "gradient", "image"] as const;
export type BackgroundType = (typeof BACKGROUND_TYPES)[number];

/** Structured gradient presets, not a raw CSS gradient string (§11's
 * explicit "no raw CSS string if avoidable") — each resolves to a
 * concrete two-stop linear-gradient built from the section's OWN
 * color/accent at render time, so it always harmonizes with the
 * template's palette instead of clashing with an admin-picked arbitrary
 * gradient. */
export const GRADIENT_PRESETS = ["none", "toCream", "toDark", "accentFade"] as const;
export type GradientPreset = (typeof GRADIENT_PRESETS)[number];

const backgroundSchema = z.object({
  type: z.enum(BACKGROUND_TYPES).optional(),
  color: hexColorSchema,
  gradient: z.enum(GRADIENT_PRESETS).optional(),
  assetId: z.string().max(80).optional(),
  fit: z.enum(OBJECT_FITS).optional(),
  position: z.enum(OBJECT_POSITIONS).optional(),
  overlayColor: hexColorSchema,
  overlayOpacity: z.number().min(0).max(1).optional(),
}).strict();
export type SectionBackground = z.infer<typeof backgroundSchema>;

/* ══════════════════════════ v2: DECORATIONS (asset-based) ═══════════════
   Distinct from the pre-existing v1 `decorationId` (a code-drawn SVG
   divider under a section's kicker — kept as-is, still validated below)
   — this is the NEW §12 system: admin-uploaded transparent PNG/WEBP
   assets placed at a preset position, never arbitrary x/y (§25). */

export const DECORATION_PLACEMENTS = [
  "top-left", "top-center", "top-right",
  "center-left", "center", "center-right",
  "bottom-left", "bottom-center", "bottom-right",
  "watermark",
] as const;
export type DecorationPlacement = (typeof DECORATION_PLACEMENTS)[number];

export const DECORATION_SIZES = ["sm", "md", "lg"] as const;
export type DecorationSize = (typeof DECORATION_SIZES)[number];
export const DECORATION_SIZE_PX: Record<DecorationSize, number> = { sm: 56, md: 96, lg: 160 };

export const DECORATION_LAYERS = ["background", "foreground"] as const;
export type DecorationLayer = (typeof DECORATION_LAYERS)[number];

const decorationInstanceSchema = z.object({
  assetId: z.string().max(80),
  placement: z.enum(DECORATION_PLACEMENTS),
  size: z.enum(DECORATION_SIZES).optional(),
  opacity: z.number().min(0).max(1).optional(),
  /** Safe range only (§12: "rotation within safe range") — never a full
   * 360°, which could flip decorations into visually broken orientations
   * on a small mobile viewport. */
  rotation: z.number().min(-30).max(30).optional(),
  layer: z.enum(DECORATION_LAYERS).optional(),
  flip: z.boolean().optional(),
}).strict();
export type DecorationInstance = z.infer<typeof decorationInstanceSchema>;

const decorationsArraySchema = z.array(decorationInstanceSchema).max(6);

/* ══════════════════════════ v2: BORDER / SHADOW (per-section) ══════════
   Extends the existing theme-level radius/shadow (still the fallback)
   with a genuine per-section override — a template can e.g. keep the
   theme's soft radius everywhere but give Gallery cards a sharper one. */

export const BORDER_STYLES = ["none", "thin", "medium"] as const;
export type BorderStyle = (typeof BORDER_STYLES)[number];
export const BORDER_WIDTH_PX: Record<BorderStyle, number> = { none: 0, thin: 1, medium: 2 };

const borderSchema = z.object({
  style: z.enum(BORDER_STYLES).optional(),
  color: hexColorSchema,
  radius: z.enum(RADIUS_PRESETS).optional(),
  shadow: z.enum(SHADOW_PRESETS).optional(),
}).strict();
export type SectionBorder = z.infer<typeof borderSchema>;

/* ══════════════════════════ v2: SPACING (per-section) ═══════════════════
   Extends the existing theme-level spacing preset (still the fallback)
   with per-section top/bottom/gap overrides. */

export const SPACING_SIZES = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const;
export type SpacingSize = (typeof SPACING_SIZES)[number];
/** rem values — deliberately capped at a sane maximum (2xl = 6rem) so no
 * combination can push a section's padding into absurd, layout-breaking
 * territory (§16's explicit "no uncontrolled...spacing"). */
export const SPACING_SIZE_REM: Record<SpacingSize, number> = { none: 0, xs: 0.5, sm: 1, md: 1.75, lg: 2.75, xl: 4, "2xl": 6 };

const sectionSpacingSchema = z.object({
  top: z.enum(SPACING_SIZES).optional(),
  bottom: z.enum(SPACING_SIZES).optional(),
  gap: z.enum(SPACING_SIZES).optional(),
}).strict();
export type SectionSpacing = z.infer<typeof sectionSpacingSchema>;

/* ── Per-section config ────────────────────────────────────────────── */

const sectionConfigSchema = z.object({
  variant: z.union([heroVariantSchema, ornamentVariantSchema, galleryVariantSchema]).optional(),
  decorationId: decorationIdSchema.optional(),
  content: sectionContentSchema.optional(),
  typography: typographySchema.optional(),
  media: mediaSchema.optional(),
  background: backgroundSchema.optional(),
  decorations: decorationsArraySchema.optional(),
  border: borderSchema.optional(),
  spacing: sectionSpacingSchema.optional(),
  /** 0–1; only meaningful for the hero when its background is an image —
   * a dark scrim strength, never raw CSS. */
  overlay: z.number().min(0).max(1).optional(),
}).strict();

export type SectionConfig = z.infer<typeof sectionConfigSchema>;

/** Order must be exactly a permutation of REORDERABLE_SECTION_IDS — any
 * missing id, duplicate, or unknown id fails this specific field only
 * (`.catch` below falls back to DEFAULT_SECTION_ORDER), never the whole
 * config. */
const sectionOrderSchema = z
  .array(reorderableSectionIdSchema)
  .refine(
    (arr) =>
      arr.length === REORDERABLE_SECTION_IDS.length &&
      new Set(arr).size === REORDERABLE_SECTION_IDS.length &&
      REORDERABLE_SECTION_IDS.every((id) => arr.includes(id)),
    { message: "sectionOrder must be a permutation of all reorderable section ids" }
  )
  .catch(DEFAULT_SECTION_ORDER);

const visualConfigSchema = z.object({
  // Accepts either version this app has ever written (see SUPPORTED_
  // VERSIONS above) — a v1 payload validates fine here too, since every
  // field v2 adds is optional; the number itself is preserved as
  // metadata, not branching logic.
  version: z.union([z.literal(1), z.literal(2)]),
  theme: themeExtrasSchema.optional().catch(undefined),
  // partialRecord (not record): a template is never required to configure
  // every section, and the inferred TS type must allow missing keys —
  // z.record's inferred type otherwise claims every SectionId key is
  // always present once `sections` itself is defined, which doesn't match
  // reality (or the Admin Builder's own incremental-editing UI, which
  // patches one section at a time into a growing partial object).
  sections: z.partialRecord(z.enum(SECTION_IDS), sectionConfigSchema).optional().catch(undefined),
  sectionOrder: sectionOrderSchema.optional(),
}).strict();

export type VisualConfig = z.infer<typeof visualConfigSchema>;

export const EMPTY_VISUAL_CONFIG: VisualConfig = { version: VISUAL_CONFIG_VERSION };

/**
 * The strict write-path counterpart to `parseVisualConfig()` below. Admin
 * API routes (create/update) should use THIS — not the silently-falls-
 * back-to-null reader — so a malformed save attempt surfaces a real 400
 * validation error to the admin instead of quietly discarding their
 * config. The stored/rendered side always goes back through
 * `parseVisualConfig()` regardless (defense in depth against data that
 * predates a schema tightening, or was written by a future/older app
 * version), but the admin should never be left wondering why their save
 * silently "didn't take."
 */
export function safeParseVisualConfigInput(raw: unknown) {
  return visualConfigSchema.safeParse(raw);
}

/**
 * The only entry point untrusted/stored data should ever go through.
 * Never throws. `null`/`undefined`/malformed/unknown-version input all
 * safely resolve to `null` — the caller's existing legacy rendering path
 * is the correct behavior in every one of those cases, never a partial
 * or crashed render.
 */
export function parseVisualConfig(raw: unknown): VisualConfig | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;
  const versioned = raw as { version?: unknown };
  if (!(SUPPORTED_VERSIONS as readonly unknown[]).includes(versioned.version)) return null;
  const result = visualConfigSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** Resolves the effective section order, always returning all 9 ids. */
export function resolveSectionOrder(config: VisualConfig | null): ReorderableSectionId[] {
  return config?.sectionOrder ?? DEFAULT_SECTION_ORDER;
}

/** Resolves one section's variant, falling back to `fallback` (the
 * legacy-derived value, e.g. from weddingLayout/isEthno) when the config
 * or this specific section entry is absent. */
export function resolveSectionVariant<T extends string>(
  config: VisualConfig | null,
  id: SectionId,
  fallback: T
): T {
  const v = config?.sections?.[id]?.variant;
  return (v as T | undefined) ?? fallback;
}

export function resolveSectionDecoration(
  config: VisualConfig | null,
  id: SectionId,
  fallback: DecorationId
): DecorationId {
  return config?.sections?.[id]?.decorationId ?? fallback;
}

/* ── v2 resolvers ──────────────────────────────────────────────────────
   All follow the identical pattern established above: read from
   `config?.sections?.[id]?.X`, fall back to the caller-supplied default
   when absent — never throw, never require the config or the specific
   section entry to exist. */

/**
 * Resolves ONE piece of template-static content for a section, in the
 * given language, with placeholder substitution already applied (§5).
 * `fallback` is the CURRENT hardcoded Kazakh string InvitationView.tsx
 * already renders for that slot — so a template with no override (every
 * existing template, including all 5 flagship ones) produces the exact
 * same text as before this feature existed, in both languages (the
 * built-in fallback is Kazakh-only, matching the project's established
 * "pre-existing strings stay hardcoded Kazakh regardless of lang"
 * convention — an override is the ONLY way a section's static text
 * becomes genuinely bilingual).
 */
export function resolveSectionText(
  config: VisualConfig | null,
  id: SectionId,
  key: string,
  lang: "kk" | "ru",
  fallback: string,
  placeholderCtx?: Partial<Record<ContentPlaceholder, string>>
): string {
  const entry = config?.sections?.[id]?.content?.text?.[key];
  const raw = entry?.[lang] ?? fallback;
  return placeholderCtx ? resolvePlaceholders(raw, placeholderCtx) : raw;
}

/** Show/hide toggle — absent means visible (`true`), matching every
 * current section's existing always-shown behavior. */
export function resolveSectionVisibility(
  config: VisualConfig | null,
  id: SectionId,
  key: string,
  fallback = true
): boolean {
  const v = config?.sections?.[id]?.content?.visibility?.[key];
  return v ?? fallback;
}

export function resolveSectionTypography(
  config: VisualConfig | null,
  id: SectionId,
  role: "heading" | "kicker"
): TypographyRole | undefined {
  return config?.sections?.[id]?.typography?.[role];
}

/** Builds a style object for a typography role — `undefined` fields
 * simply aren't set, so a section with no typography override produces
 * an empty style object (zero effect, existing `.invite-*` class and
 * inline color continue to fully control appearance, exactly as today). */
export function typographyRoleToStyle(role: TypographyRole | undefined): React.CSSProperties {
  if (!role) return {};
  return {
    ...(role.font && { fontFamily: FONT_OPTIONS.find((f) => f.id === role.font)?.cssVar }),
    ...(role.weight && { fontWeight: TEXT_WEIGHT_VALUES[role.weight] }),
    ...(role.color && { color: role.color }),
    ...(role.align && { textAlign: role.align }),
    ...(role.letterSpacing && { letterSpacing: LETTER_SPACING_VALUES[role.letterSpacing] }),
    ...(role.uppercase && { textTransform: "uppercase" as const }),
    ...(role.italic && { fontStyle: "italic" as const }),
  };
}

export function resolveSectionMedia(config: VisualConfig | null, id: SectionId): SectionMedia | undefined {
  return config?.sections?.[id]?.media;
}

export function resolveSectionBackground(config: VisualConfig | null, id: SectionId): SectionBackground | undefined {
  return config?.sections?.[id]?.background;
}

/** Structured gradient presets (§11) resolved against the section's own
 * accent — never a raw admin-entered CSS gradient string. */
export function gradientPresetToCss(preset: GradientPreset | undefined, accent: string, baseColor: string): string | undefined {
  switch (preset) {
    case "toCream": return `linear-gradient(180deg, ${baseColor}, var(--cream))`;
    case "toDark": return `linear-gradient(180deg, ${baseColor}, #1C1917)`;
    case "accentFade": return `linear-gradient(160deg, ${accent}22, ${baseColor})`;
    case "none":
    case undefined:
    default:
      return undefined;
  }
}

export function resolveSectionDecorations(config: VisualConfig | null, id: SectionId): DecorationInstance[] {
  return config?.sections?.[id]?.decorations ?? [];
}

export function resolveSectionBorder(config: VisualConfig | null, id: SectionId): SectionBorder | undefined {
  return config?.sections?.[id]?.border;
}

export function resolveSectionSpacing(config: VisualConfig | null, id: SectionId): SectionSpacing | undefined {
  return config?.sections?.[id]?.spacing;
}

/** Every Template Asset Library `assetId` referenced anywhere in a
 * visualConfig (section backgrounds + decoration instances) — used by the
 * server page callers (/i/[slug], /templates/[slug]) to batch-resolve
 * assetId → URL via `lib/template-assets.ts`'s `resolveAssetUrls()` in a
 * single DB round trip before rendering, never from inside InvitationView
 * itself (see its `assetUrls` prop doc). */
export function collectAssetIds(config: VisualConfig | null): string[] {
  if (!config?.sections) return [];
  const ids: string[] = [];
  for (const section of Object.values(config.sections)) {
    if (section?.background?.assetId) ids.push(section.background.assetId);
    for (const d of section?.decorations ?? []) ids.push(d.assetId);
  }
  return ids;
}

/** Tailwind placement classes for a decoration instance's wrapper —
 * closed preset set (§12/§25: never arbitrary x/y). "watermark" centers
 * a large, low-opacity instance behind the section's content (z-index
 * handled by the `layer` prop, not a raw number). */
export const DECORATION_PLACEMENT_CLASS: Record<DecorationPlacement, string> = {
  "top-left": "absolute top-2 left-2",
  "top-center": "absolute top-2 left-1/2 -translate-x-1/2",
  "top-right": "absolute top-2 right-2",
  "center-left": "absolute top-1/2 left-2 -translate-y-1/2",
  center: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  "center-right": "absolute top-1/2 right-2 -translate-y-1/2",
  "bottom-left": "absolute bottom-2 left-2",
  "bottom-center": "absolute bottom-2 left-1/2 -translate-x-1/2",
  "bottom-right": "absolute bottom-2 right-2",
  watermark: "absolute inset-0 flex items-center justify-center",
};
