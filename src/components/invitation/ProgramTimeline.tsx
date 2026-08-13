export interface ProgramEntry {
  time: string;
  label: string;
}

const TIME_LINE_RE = /^(\d{1,2}[:.]\d{2})\s*[-–—:]?\s*(.*)$/;

/**
 * Parses a free-text program string (the simple constructor's single
 * "Бағдарлама" textarea, §7 of the wedding form schema) into timeline
 * entries — one line per `HH:MM — label` (also accepts `HH.MM`, `-`, `–`,
 * or a bare `:` as the separator). Never mutates or re-saves the source
 * string; this is presentation-only. Lines without a recognizable leading
 * time are folded into the previous entry's label (so a wrapped sentence
 * doesn't get silently dropped) rather than starting a new bare-time-less
 * entry, which would render an empty time badge.
 */
export function parseProgramText(text: string): ProgramEntry[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const entries: ProgramEntry[] = [];
  for (const line of lines) {
    const m = line.match(TIME_LINE_RE);
    if (m) {
      entries.push({ time: m[1].replace(".", ":"), label: m[2].trim() });
    } else if (entries.length > 0) {
      entries[entries.length - 1].label = `${entries[entries.length - 1].label} ${line}`.trim();
    }
  }
  return entries;
}

interface Props {
  items?: ProgramEntry[];
  text?: string | null;
  accent: string;
  textDark: string;
  textMuted: string;
  /** Kazakh Ethno visual treatment ONLY (§12) — a small gold diamond marker
   * instead of the plain dot every other template keeps unchanged. Parsing
   * (parseProgramText/TIME_LINE_RE) and the structured-vs-free-text
   * precedence above are completely untouched either way. Defaults false. */
  ornament?: boolean;
}

/**
 * Vertical timeline presentation for the event program — used for both
 * structured `programItems` (the advanced editor) and free-text
 * `programText` (the simple constructor), so a program never renders as a
 * single unscannable text-dump paragraph. Falls back to the original plain
 * paragraph only when the text truly can't be parsed into any entries
 * (e.g. genuinely free-form prose with no time markers at all) — the
 * stored string itself is never altered either way.
 */
export function ProgramTimeline({ items, text, accent, textDark, textMuted, ornament = false }: Props) {
  const structured = items && items.length > 0 ? items : text ? parseProgramText(text) : [];

  if (structured.length === 0) {
    if (!text) return null;
    return (
      <p className="invite-body text-center whitespace-pre-line" style={{ color: textDark }}>
        {text}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {structured.map((item, i) => (
        <div key={i} className="flex gap-4 relative">
          <div className="flex flex-col items-center">
            {ornament ? (
              <div className="w-2.5 h-2.5 shrink-0 mt-2.5 rotate-45" style={{ background: accent, opacity: 0.85 }} />
            ) : (
              <div className="w-3 h-3 rounded-full shrink-0 mt-2" style={{ background: accent }} />
            )}
            {i < structured.length - 1 && <div className="w-px flex-1 my-1" style={{ background: `${accent}35` }} />}
          </div>
          <div className="pb-7">
            {item.time && (
              <p className="invite-body font-semibold font-mono tracking-wide" style={{ color: accent }}>
                {item.time}
              </p>
            )}
            <p className="invite-body mt-0.5" style={{ color: item.time ? textDark : textMuted }}>
              {item.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
