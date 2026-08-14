import { z } from "zod";

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

export const VISUAL_CONFIG_VERSION = 1 as const;

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

export const SECTION_IDS = ["hero", ...REORDERABLE_SECTION_IDS] as const;
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

/* ── Per-section config ────────────────────────────────────────────── */

const sectionConfigSchema = z.object({
  variant: z.union([heroVariantSchema, ornamentVariantSchema, galleryVariantSchema]).optional(),
  decorationId: decorationIdSchema.optional(),
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

const visualConfigSchemaV1 = z.object({
  version: z.literal(1),
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

export type VisualConfig = z.infer<typeof visualConfigSchemaV1>;

export const EMPTY_VISUAL_CONFIG: VisualConfig = { version: 1 };

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
  return visualConfigSchemaV1.safeParse(raw);
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
  if (versioned.version !== VISUAL_CONFIG_VERSION) return null;
  const result = visualConfigSchemaV1.safeParse(raw);
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
