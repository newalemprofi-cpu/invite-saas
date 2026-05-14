import { THEMES, EVENT_TYPES } from "@/types/invite";
import { cn } from "@/lib/utils";

export interface InviteCardData {
  title?: string | null;
  eventType?: string | null;
  person1?: string | null;
  date?: string | null;
  time?: string | null;
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
  const theme = THEMES.find((t) => t.id === data.theme) ?? THEMES[0];
  const eventType = EVENT_TYPES.find((e) => e.value === data.eventType);

  return (
    <div
      className={cn(
        "relative w-full max-w-[260px] mx-auto rounded-[28px] overflow-hidden shadow-2xl border-2 aspect-[9/16]",
        `bg-gradient-to-br ${theme.gradient}`,
        theme.dark ? "border-white/10" : "border-black/5"
      )}
    >
      {/* Decorative circles */}
      <div
        className="absolute -top-14 -right-14 w-44 h-44 rounded-full opacity-10"
        style={{ backgroundColor: theme.accent }}
      />
      <div
        className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full opacity-10"
        style={{ backgroundColor: theme.accent }}
      />

      {data.theme === "KAZAKH" && (
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
            color: theme.dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)",
          }}
        >
          Сізді шақырамыз
        </p>

        <h1
          className="font-bold leading-tight text-[1.15rem] break-words"
          style={{ color: theme.textColor }}
        >
          {data.title || data.person1 || "—"}
        </h1>

        <div className="flex items-center gap-2 w-full my-1">
          <div className="flex-1 h-px opacity-25" style={{ backgroundColor: theme.accent }} />
          <span className="text-xs" style={{ color: theme.accent }}>◆</span>
          <div className="flex-1 h-px opacity-25" style={{ backgroundColor: theme.accent }} />
        </div>

        {data.date ? (
          <p className="text-[11px] font-semibold" style={{ color: theme.textColor }}>
            {formatDate(data.date)}
          </p>
        ) : null}

        {data.time ? (
          <p
            className="text-[10px] -mt-1"
            style={{
              color: theme.dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
            }}
          >
            Сағат {data.time}
          </p>
        ) : null}

        {data.locationName ? (
          <div
            className="flex items-start gap-1 text-[10px] font-medium leading-snug"
            style={{ color: theme.textColor }}
          >
            <span className="mt-0.5 shrink-0">📍</span>
            <span className="break-words">{data.locationName}</span>
          </div>
        ) : null}

        {data.message ? (
          <p
            className="text-[9px] leading-relaxed italic opacity-70 break-words"
            style={{ color: theme.textColor }}
          >
            &ldquo;{data.message}&rdquo;
          </p>
        ) : null}

        <div className="mt-auto pt-2">
          <div
            className="rounded-full px-5 py-2 text-[10px] font-bold text-white"
            style={{ backgroundColor: theme.accent }}
          >
            RSVP жіберу
          </div>
        </div>
      </div>
    </div>
  );
}
