import type { DecorationId } from "@/lib/visual-config";
import { KazakhSectionHeading } from "./KazakhOrnament";

/**
 * Resolves a validated `decorationId` (never raw HTML/JSX from storage —
 * see visual-config.ts's closed enum) to actual section-heading markup.
 * This is the ONE place new decoration options get added; the Admin
 * Template Builder only ever offers the ids this map recognizes.
 *
 * Every option here reuses code that already shipped in a real template
 * (Kazakh Ethno's ornament system, the pre-existing plain "invite-kicker"
 * heading every legacy template already uses, WeddingHero's classic-gold
 * divider) rather than inventing new decorative designs for this task.
 */
export function SectionDecoration({
  decorationId, label, accent, color, className = "mb-4", typographyStyle, sizeClass,
}: {
  decorationId: DecorationId;
  label: string;
  accent: string;
  /** Text color for non-ornamented decorations (kazakh-qoshqar always
   * uses `accent` for both text and divider, matching its existing
   * design). Defaults to the site's shared `--gold` token — every
   * pre-existing plain kicker in InvitationView.tsx was hardcoded to
   * this exact value (not the per-template `accent`), so this default
   * must match it precisely for legacy/no-visualConfig templates to
   * render byte-identically. */
  color?: string;
  className?: string;
  /** Full Production Template Designer task (v2 typography) — additional
   * inline style merged onto the kicker `<p>` (font/weight/align/letter-
   * spacing/uppercase/italic; `color` here takes priority over `color`
   * above when both are given). `undefined`/`{}` changes nothing. */
  typographyStyle?: React.CSSProperties;
  /** Overrides the default `.invite-kicker` size class with another of
   * the project's existing `.invite-*` clamp() classes (see
   * TEXT_SIZE_CLASS in visual-config.ts) — still one of the same safe,
   * responsive presets, never a raw font-size. */
  sizeClass?: string;
}) {
  const textColor = color ?? "var(--gold)";
  const kickerClass = sizeClass ?? "invite-kicker";
  const kickerStyle: React.CSSProperties = { color: textColor, ...typographyStyle };

  switch (decorationId) {
    case "kazakh-qoshqar":
      return <KazakhSectionHeading label={label} accent={accent} className={className} />;

    case "classic-hairline":
      return (
        <div className={`flex flex-col items-center gap-2.5 ${className}`}>
          <p className={kickerClass} style={kickerStyle}>{label}</p>
          <div className="flex items-center gap-2 w-full max-w-[200px]">
            <div className="flex-1 h-px" style={{ background: accent, opacity: 0.35 }} />
            <span style={{ color: accent, opacity: 0.7 }}>◆</span>
            <div className="flex-1 h-px" style={{ background: accent, opacity: 0.35 }} />
          </div>
        </div>
      );

    case "minimal-line":
      return (
        <div className={`flex flex-col items-center gap-2.5 ${className}`}>
          <p className={kickerClass} style={kickerStyle}>{label}</p>
          <div className="w-10 h-px" style={{ background: accent, opacity: 0.4 }} />
        </div>
      );

    case "minimal-diamond":
      return (
        <div className={`flex flex-col items-center gap-2.5 ${className}`}>
          <p className={kickerClass} style={kickerStyle}>{label}</p>
          <div className="flex items-center gap-4 w-full max-w-[160px]">
            <div className="flex-1 h-px opacity-25" style={{ background: accent }} />
            <span className="opacity-40" style={{ color: accent, fontSize: "0.875rem" }}>◆</span>
            <div className="flex-1 h-px opacity-25" style={{ background: accent }} />
          </div>
        </div>
      );

    case "none":
    default:
      return <p className={`${kickerClass} ${className}`} style={kickerStyle}>{label}</p>;
  }
}
