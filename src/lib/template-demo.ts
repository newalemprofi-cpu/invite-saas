/**
 * Admin-managed content for a template's full "Толық көру" demo
 * (/templates/[slug]) — see prisma/schema.prisma's InviteTemplate.demoContent
 * for why this is a plain JSON column rather than a new model.
 *
 * Deliberately NOT a "second database architecture": this is pure customer-
 * facing DEMO CONTENT (names/text/photos/gallery), never template visual
 * composition (layout/photoMode/colors — that stays in
 * lib/wedding-template-layouts.ts and the template's own bg/accent/... DB
 * columns) and never real customer invitation data (a demo never creates or
 * touches an `Invite` row).
 *
 * Shared values (names/venue/address/date/time/mainPhoto/gallery/mapLink/
 * music) are locale-independent per the task spec; only the free-text
 * fields where language genuinely matters get separate Kk/Ru variants.
 *
 * This module has no server-only imports (no `db`, no `storage`) so it is
 * safe to import from both server code (the demo page, admin API routes)
 * and client code (TemplatesManager's edit form).
 */

export const DEMO_GALLERY_MAX = 10;

export interface TemplateDemoContent {
  groomName?: string;
  brideName?: string;
  hosts?: string;
  date?: string;
  time?: string;
  location?: string;
  address?: string;
  invitationTextKk?: string;
  invitationTextRu?: string;
  programTextKk?: string;
  programTextRu?: string;
  noteKk?: string;
  noteRu?: string;
  /** Storage key (never a raw URL) of the main demo hero photo. */
  mainPhoto?: string;
  /** Storage keys, in display order — max DEMO_GALLERY_MAX. */
  gallery?: string[];
  mapLink?: string;
  /** RecommendedTrack.id (see lib/recommended-tracks.ts) — the same catalog the constructor's music picker already uses. */
  musicTrackId?: string;
}

/** Defense in depth against a malformed/partial stored blob — never lets a wrong-typed field reach a render or a form as something other than a string/array. */
export function parseTemplateDemoContent(value: unknown): TemplateDemoContent {
  if (!value || typeof value !== "object") return {};
  const v = value as Partial<Record<keyof TemplateDemoContent, unknown>>;
  const str = (x: unknown): string | undefined => (typeof x === "string" && x.trim() ? x : undefined);
  return {
    groomName: str(v.groomName),
    brideName: str(v.brideName),
    hosts: str(v.hosts),
    date: str(v.date),
    time: str(v.time),
    location: str(v.location),
    address: str(v.address),
    invitationTextKk: str(v.invitationTextKk),
    invitationTextRu: str(v.invitationTextRu),
    programTextKk: str(v.programTextKk),
    programTextRu: str(v.programTextRu),
    noteKk: str(v.noteKk),
    noteRu: str(v.noteRu),
    mainPhoto: str(v.mainPhoto),
    gallery: Array.isArray(v.gallery)
      ? v.gallery.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, DEMO_GALLERY_MAX)
      : undefined,
    mapLink: str(v.mapLink),
    musicTrackId: str(v.musicTrackId),
  };
}
