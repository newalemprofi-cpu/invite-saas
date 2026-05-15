import { THEMES, TEMPLATES, EVENT_TYPES } from "@/types/invite";
import { cn } from "@/lib/utils";

export interface InviteCardData {
  title?: string | null;
  eventType?: string | null;
  date?: string | null;
  time?: string | null;
  // New field names
  template?: string | null;
  groomName?: string | null;
  brideName?: string | null;
  location?: string | null;
  invitationText?: string | null;
  // Legacy field names (backward compat with old DB records)
  person1?: string | null;
  person2?: string | null;
  locationName?: string | null;
  theme?: string | null;
  message?: string | null;
}

function formatDate(s: string): string {
  try {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("kk-KZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

export function StaticInviteCard({ data }: { data: InviteCardData }) {
  // Support both new (template) and old (theme) styling
  const tmpl = TEMPLATES.find((t) => t.id === data.template);
  const legacyTheme = THEMES.find((t) => t.id === data.theme);

  const gradient = tmpl?.gradient ?? legacyTheme?.gradient ?? THEMES[0].gradient;
  const accent = tmpl?.accent ?? legacyTheme?.accent ?? THEMES[0].accent;
  const textColor = tmpl?.textColor ?? legacyTheme?.textColor ?? THEMES[0].textColor;
  const dark = tmpl?.dark ?? legacyTheme?.dark ?? false;

  const eventType = EVENT_TYPES.find((e) => e.value === data.eventType);

  // Support both new and old name fields
  const displayName =
    data.groomName
      ? data.brideName
        ? `${data.groomName} & ${data.brideName}`
        : data.groomName
      : data.person2
      ? `${data.person1} & ${data.person2}`
      : (data.person1 ?? null);

  const locationText = data.location ?? data.locationName;
  const messageText = data.invitationText ?? data.message;

  return (
    <div
      className={cn(
        "relative w-full max-w-[260px] mx-auto rounded-[28px] overflow-hidden shadow-2xl border-2 aspect-[9/16]",
        `bg-gradient-to-br ${gradient}`,
        dark ? "border-white/10" : "border-black/5"
      )}
    >
      {/* Decorative circles */}
      <div
        className="absolute -top-14 -right-14 w-44 h-44 rounded-full opacity-10"
        style={{ backgroundColor: accent }}
      />
      <div
        className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full opacity-10"
        style={{ backgroundColor: accent }}
      />

      {(data.theme === "KAZAKH" || data.template === "kazakh_ornament") && (
        <>
          <div className="absolute top-0 inset-x-0 h-2 bg-amber-400" />
          <div className="absolute bottom-0 inset-x-0 h-2 bg-amber-400" />
        </>
      )}

      <div className="relative h-full flex flex-col items-center justify-center px-5 py-10 text-center gap-3">
        <span className="text-4xl leading-none">{eventType?.emoji ?? "✨"}</span>

        <p
          className="text-[9px] tracking-[0.35em] uppercase font-semibold"
          style={{
            color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)",
          }}
        >
          Сізді шақырамыз
        </p>

        <h1
          className="font-bold leading-tight text-[1.15rem] break-words"
          style={{ color: textColor }}
        >
          {data.title || displayName || "—"}
        </h1>

        <div className="flex items-center gap-2 w-full my-1">
          <div className="flex-1 h-px opacity-25" style={{ backgroundColor: accent }} />
          <span className="text-xs" style={{ color: accent }}>◆</span>
          <div className="flex-1 h-px opacity-25" style={{ backgroundColor: accent }} />
        </div>

        {data.date && (
          <p className="text-[11px] font-semibold" style={{ color: textColor }}>
            {formatDate(data.date)}
          </p>
        )}

        {data.time && (
          <p
            className="text-[10px] -mt-1"
            style={{
              color: dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
            }}
          >
            Сағат {data.time}
          </p>
        )}

        {locationText && (
          <div
            className="flex items-start gap-1 text-[10px] font-medium leading-snug"
            style={{ color: textColor }}
          >
            <span className="mt-0.5 shrink-0">📍</span>
            <span className="break-words">{locationText}</span>
          </div>
        )}

        {messageText && (
          <p
            className="text-[9px] leading-relaxed italic opacity-70 break-words"
            style={{ color: textColor }}
          >
            &ldquo;{messageText}&rdquo;
          </p>
        )}

        <div className="mt-auto pt-2">
          <div
            className="rounded-full px-5 py-2 text-[10px] font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            RSVP жіберу
          </div>
        </div>
      </div>
    </div>
  );
}
