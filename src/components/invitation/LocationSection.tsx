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
 * buried between unrelated sections.
 */
export function LocationSection({ location, address, mapUrl, kickerLabel, buttonLabel, textDark, textMuted, accent }: Props) {
  if (!location && !address) return null;

  return (
    <div className="flex flex-col items-center text-center gap-5">
      <div className="flex flex-col items-center gap-2">
        <p className="label-caps" style={{ color: accent }}>
          {kickerLabel}
        </p>
        {location && (
          <p className="heading-display text-2xl sm:text-3xl" style={{ color: textDark }}>
            {location}
          </p>
        )}
        {address && (
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: textMuted }}>
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
  );
}
