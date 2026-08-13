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
}

/**
 * Dedicated Venue / Address / Map section (target hierarchy §10) — pulled
 * out of the hero and out of the old catch-all "Map" block so location
 * information reads as its own clear moment in the page instead of being
 * buried between unrelated sections. Presented as a single strong
 * information card (soft rounded corners, subtle border/shadow) matching
 * the approved reference's card language, instead of bare centered text.
 */
export function LocationSection({ location, address, mapUrl, kickerLabel, buttonLabel, textDark, textMuted, accent }: Props) {
  if (!location && !address) return null;

  return (
    <div className="flex flex-col items-center text-center gap-6">
      <p className="invite-kicker" style={{ color: accent }}>
        {kickerLabel}
      </p>
      <div
        className="w-full max-w-sm rounded-3xl px-6 py-8 flex flex-col items-center gap-5"
        style={{ background: "white", border: "1px solid rgba(28,25,23,0.07)", boxShadow: "0 8px 28px rgba(28,25,23,0.07)" }}
      >
        <div className="flex flex-col items-center gap-2">
          {location && (
            <p className="heading-display invite-headline font-semibold" style={{ color: textDark }}>
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
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex">
            {buttonLabel}
          </a>
        )}
      </div>
    </div>
  );
}
