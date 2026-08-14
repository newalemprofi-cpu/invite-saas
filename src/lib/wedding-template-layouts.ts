/**
 * Visual COMPOSITION configuration for the 5 flagship Wedding templates —
 * the "visualConfig" half of the conceptual Template/visualConfig/
 * customerData split described in the task. Deliberately NOT a new Prisma
 * column: every field here is a rendering-time constant describing HOW to
 * lay out the customer's own data (never the data itself), so it lives in
 * code and is looked up by the template's stable `slug` — the exact same
 * key every consumer (InvitePreview, the public page, /templates cards)
 * already has on hand via the resolved `Template` object.
 *
 * A template slug with NO entry here (every pre-existing wedding template —
 * wedding-rose, wedding-gold, wedding-midnight, zaure-premium — and every
 * non-wedding template) falls back to each consumer's existing, unchanged
 * hero rendering. This is what keeps the whole feature additive: nothing
 * about any template that isn't one of these 5 slugs changes at all.
 */

export type WeddingPhotoMode =
  | "full-bleed" // Romantic: full-width/height hero photo, the dominant element
  | "top-band" // Classic Gold: photo occupies the upper ~35%, ivory panel below
  | "framed-oval" // Floral Watercolor: oval portrait frame, watercolor decor around it
  | "fade-dark" // Dark Luxury: photo fades into the dark background via gradient
  | "arched-frame"; // Kazakh Ethno: photo inside an arched ornamental frame

/**
 * "default" is additive (Admin Template Builder task) — used ONLY for
 * ad-hoc layouts InvitationView constructs at render time for a
 * Builder-configured template that has no entry in
 * WEDDING_TEMPLATE_LAYOUTS below (i.e. every template except the 5
 * flagship ones). It carries no ornament identity of its own; a
 * template's per-section ethno/default styling comes from its own
 * visualConfig section variants instead, decoupled from this preset.
 */
export type WeddingDecorPreset = "romantic" | "classic-gold" | "floral" | "dark-luxury" | "ethno" | "default";

export interface WeddingTemplateLayout {
  photoMode: WeddingPhotoMode;
  decorPreset: WeddingDecorPreset;
  /** Section-card surface styling (gallery/program/rsvp/etc.) — extends the
   * SAME cardBg/cardBorder pattern InvitePreview.tsx and the public page
   * already compute today, just sourced from the template instead of a
   * single hardcoded isDark ? … : … pair. Presentation only — never
   * changes which sections exist or their feature/entitlement logic. */
  sectionCardBg: string;
  sectionCardBorder: string;
}

export const WEDDING_TEMPLATE_LAYOUTS: Record<string, WeddingTemplateLayout> = {
  "wedding-romantic": {
    photoMode: "full-bleed",
    decorPreset: "romantic",
    sectionCardBg: "rgba(214,101,139,0.07)",
    sectionCardBorder: "rgba(214,101,139,0.18)",
  },
  "wedding-classic-gold": {
    photoMode: "top-band",
    decorPreset: "classic-gold",
    sectionCardBg: "rgba(196,150,62,0.05)",
    sectionCardBorder: "rgba(196,150,62,0.25)",
  },
  "wedding-floral-watercolor": {
    photoMode: "framed-oval",
    decorPreset: "floral",
    sectionCardBg: "rgba(122,153,110,0.08)",
    sectionCardBorder: "rgba(122,153,110,0.22)",
  },
  "wedding-dark-luxury": {
    photoMode: "fade-dark",
    decorPreset: "dark-luxury",
    sectionCardBg: "rgba(255,255,255,0.05)",
    sectionCardBorder: "rgba(196,150,62,0.28)",
  },
  "wedding-kazakh-ethno": {
    photoMode: "arched-frame",
    decorPreset: "ethno",
    sectionCardBg: "rgba(139,105,20,0.07)",
    sectionCardBorder: "rgba(139,105,20,0.22)",
  },
};

export function getWeddingLayout(slug: string | undefined | null): WeddingTemplateLayout | null {
  if (!slug) return null;
  return WEDDING_TEMPLATE_LAYOUTS[slug] ?? null;
}
