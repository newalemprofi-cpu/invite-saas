/**
 * Small, reusable decorative system for the "Kazakh Ethno" wedding template
 * ONLY (`wedding-kazakh-ethno`, decorPreset "ethno"). Every other template
 * (Romantic, Classic Gold, Floral Watercolor, Dark Luxury, legacy/non-
 * wedding) never imports this module — nothing here can leak into their
 * rendering. Motifs are restrained, low-opacity SVG — never raster assets,
 * never a literal museum-piece illustration — inspired by the symmetric
 * curved geometry of қошқармүйіз (ram's-horn) ornament, used sparingly as a
 * visual signature (section dividers, card/frame corners, a soft watermark)
 * rather than covering the page.
 */

/** Warm surface tones for Kazakh Ethno section backgrounds — a touch
 * warmer/golder than the site-wide --ivory/--cream tokens (#FAF8F3 /
 * #F5F0E8), matching the template's own admin-configured accent/textDark
 * (#A67C3D / #3E2D14). Deliberately local constants, not new :root
 * variables — they must never affect any other template or the rest of the
 * app (admin/dashboard/editor all read the global tokens directly). */
export const KAZAKH_ETHNO_SURFACE = {
  ivory: "#FBF6EA",
  cream: "#F4E8D0",
};

/**
 * The section-heading divider: a thin double hairline flanking a small
 * symmetric double-curve motif (a simplified, restrained echo of
 * қошқармүйіз — two mirrored curls meeting at a center point) plus a single
 * diamond accent. Used consistently under every major Kazakh Ethno section
 * kicker instead of the plain-text-only kicker every other template uses.
 */
export function KazakhDivider({ accent, className = "" }: { accent: string; className?: string }) {
  return (
    <svg viewBox="0 0 140 18" className={`w-24 h-3 ${className}`} fill="none" aria-hidden="true">
      <path d="M2 9 H48" stroke={accent} strokeWidth="1" opacity="0.4" />
      <path d="M92 9 H138" stroke={accent} strokeWidth="1" opacity="0.4" />
      <path d="M58 9 Q64 2 70 9" stroke={accent} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M70 9 Q76 2 82 9" stroke={accent} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M58 9 Q64 16 70 9" stroke={accent} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M70 9 Q76 16 82 9" stroke={accent} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />
      <circle cx="70" cy="9" r="1.6" fill={accent} opacity="0.75" />
    </svg>
  );
}

/**
 * Kicker label + KazakhDivider, centered — the standard Kazakh Ethno
 * section-title treatment ("БАҒДАРЛАМА" / ornament / ...). Reuses the exact
 * same `.invite-kicker` typography class every other template's plain-text
 * kicker already uses, so type size/tracking stays identical — only the
 * divider underneath is new.
 */
export function KazakhSectionHeading({
  label, accent, className = "",
}: {
  label: string;
  accent: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2.5 ${className}`}>
      <p className="invite-kicker" style={{ color: accent }}>{label}</p>
      <KazakhDivider accent={accent} />
    </div>
  );
}

/**
 * A small corner bracket with a single curled tick — a restrained accent
 * for card/frame corners (countdown cells, section cards, the hero arch,
 * the gallery frame). Not a heavy ornamental corner piece; meant to be
 * glanced past, not studied. Rotate/mirror via a wrapping element's
 * `transform` at each call site for the other three corners.
 */
export function KazakhCorner({ accent, className = "" }: { accent: string; className?: string }) {
  return (
    <svg viewBox="0 0 22 22" className={className} fill="none" aria-hidden="true">
      <path d="M1.5 9 V3.5 Q1.5 1.5 3.5 1.5 H9" stroke={accent} strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d="M4.5 5.5 Q7 7 5.5 10" stroke={accent} strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.4" />
    </svg>
  );
}

/**
 * A large, sparse, radially-symmetric medallion motif meant to sit once,
 * big and centered, behind the hero — never tiled/repeated (§20's explicit
 * "no visible repeating wallpaper effect"). Opacity is baked into the SVG's
 * own stroke-opacity (not a wrapping CSS opacity) so it composes safely
 * with any parent background. Purely decorative (aria-hidden, pointer-
 * events-none expected from the caller's positioning wrapper).
 */
export function KazakhWatermark({ accent, className = "" }: { accent: string; className?: string }) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg viewBox="0 0 400 400" className={className} fill="none" aria-hidden="true">
      <circle cx="200" cy="200" r="150" stroke={accent} strokeWidth="1" opacity="0.06" />
      <circle cx="200" cy="200" r="118" stroke={accent} strokeWidth="1" opacity="0.05" />
      {petals.map((deg) => (
        <g key={deg} transform={`rotate(${deg} 200 200)`}>
          <path
            d="M200 90 Q214 130 200 150 Q186 130 200 90"
            stroke={accent}
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.06"
          />
        </g>
      ))}
      <circle cx="200" cy="200" r="10" stroke={accent} strokeWidth="1" opacity="0.07" />
    </svg>
  );
}
