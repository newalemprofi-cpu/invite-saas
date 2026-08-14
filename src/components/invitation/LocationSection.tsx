import { KazakhSectionHeading, KAZAKH_ETHNO_SURFACE } from "@/components/wedding/KazakhOrnament";

interface Props {
  location?: string | null;
  address?: string | null;
  /** Already gated by the "map" entitlement by the caller — null means "don't show the button" (address text itself is always free/base info). Never a raw URL exposed as visible text, only as the link target. */
  mapUrl?: string | null;
  kickerLabel: string;
  buttonLabel: string;
  textDark: string;
  textMuted: string;
  accent: string;
  /** Kazakh Ethno visual treatment ONLY (§13) — ornament divider under the
   * kicker, a warm ivory card instead of plain white, and a gold-bordered
   * map button instead of the neutral outline every other template keeps
   * unchanged. Defaults false. */
  ornament?: boolean;
  /** Full Production Template Designer task (§6) — hides the kicker label
   * only; the venue/address card itself is always shown when there's data
   * (structurally required, per §6's "never allow hiding structurally
   * required functionality"). Defaults true. */
  showHeading?: boolean;
  /** Full Production Template Designer task (§7) — admin-configured
   * kicker typography override (font/size/weight/color/align/letter-
   * spacing/uppercase/italic), already resolved by the caller via
   * `typographyRoleToStyle`. `undefined`/`{}` changes nothing (kicker
   * keeps its original `accent`-colored `.invite-kicker` styling). Not
   * applied to the `ornament` (Kazakh Ethno) branch — same documented
   * limitation as SectionDecoration's `kazakh-qoshqar` case, which
   * delegates entirely to KazakhSectionHeading. */
  kickerStyle?: React.CSSProperties;
  /** Same mechanism as kickerStyle, applied to the venue name — the one
   * genuine "heading" text this section renders (§7's Typography "heading"
   * role). Styles WHATEVER text occupies that role, customer-sourced or
   * not, matching Hero's identical treatment of the couple's own names. */
  headingStyle?: React.CSSProperties;
}

/**
 * Dedicated Venue / Address / Map section (target hierarchy §10) — pulled
 * out of the hero and out of the old catch-all "Map" block so location
 * information reads as its own clear moment in the page instead of being
 * buried between unrelated sections. Presented as a single strong
 * information card (soft rounded corners, subtle border/shadow) matching
 * the approved reference's card language, instead of bare centered text.
 */
export function LocationSection({ location, address, mapUrl, kickerLabel, buttonLabel, textDark, textMuted, accent, ornament = false, showHeading = true, kickerStyle, headingStyle }: Props) {
  if (!location && !address) return null;

  return (
    <div className="flex flex-col items-center text-center gap-6">
      {showHeading && (
        ornament ? (
          <KazakhSectionHeading label={kickerLabel} accent={accent} />
        ) : (
          <p className="invite-kicker" style={{ color: accent, ...kickerStyle }}>
            {kickerLabel}
          </p>
        )
      )}
      <div
        className="w-full max-w-sm px-6 py-8 flex flex-col items-center gap-5"
        style={{
          borderRadius: "var(--tpl-radius, 1.5rem)",
          ...(ornament
            ? { background: KAZAKH_ETHNO_SURFACE.ivory, border: `1px solid ${accent}40`, boxShadow: `var(--tpl-shadow, 0 8px 24px ${accent}14)` }
            : { background: "white", border: "1px solid rgba(28,25,23,0.07)", boxShadow: "var(--tpl-shadow, 0 8px 28px rgba(28,25,23,0.07))" }),
        }}
      >
        <div className="flex flex-col items-center gap-2">
          {location && (
            <p className="heading-display invite-headline font-semibold" style={{ color: textDark, ...headingStyle }}>
              {location}
            </p>
          )}
          {address && (
            <p className="invite-body leading-relaxed max-w-xs" style={{ color: textMuted }}>
              {address}
            </p>
          )}
        </div>
        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline inline-flex"
            style={{
              borderRadius: "var(--tpl-button-radius, 999px)",
              ...(ornament && { borderColor: `${accent}80`, color: accent }),
            }}
          >
            {buttonLabel}
          </a>
        )}
      </div>
    </div>
  );
}
