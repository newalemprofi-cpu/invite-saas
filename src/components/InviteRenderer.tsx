"use client";

import { useState, useEffect } from "react";
import { TEMPLATES, EVENT_TYPES } from "@/types/invite";
import { cn } from "@/lib/utils";

export interface InviteData {
  template?: string | null;
  eventType?: string | null;
  groomName?: string | null;
  brideName?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  mapLink?: string | null;
  whatsapp?: string | null;
  invitationText?: string | null;
  enabledBlocks?: string[] | null;
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

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function useCountdown(date?: string | null, time?: string | null) {
  const [diff, setDiff] = useState<{
    d: number;
    h: number;
    m: number;
    s: number;
  } | null>(null);

  useEffect(() => {
    if (!date) return;
    const target = new Date(`${date}T${time ?? "00:00"}:00`);
    if (isNaN(target.getTime())) return;

    const tick = () => {
      const ms = target.getTime() - Date.now();
      if (ms <= 0) {
        setDiff({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      const totalSec = Math.floor(ms / 1000);
      setDiff({
        d: Math.floor(totalSec / 86400),
        h: Math.floor((totalSec % 86400) / 3600),
        m: Math.floor((totalSec % 3600) / 60),
        s: totalSec % 60,
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [date, time]);

  return diff;
}

export function InviteRenderer({
  data,
  compact = false,
}: {
  data: InviteData;
  compact?: boolean;
}) {
  const tmpl = TEMPLATES.find((t) => t.id === data.template) ?? TEMPLATES[0];
  const eventType = EVENT_TYPES.find((e) => e.value === data.eventType);
  const countdown = useCountdown(data.date, data.time);
  const blocks = data.enabledBlocks ?? ["hero", "date", "rsvp"];

  const has = (id: string) => blocks.includes(id);

  const mutedText = tmpl.dark
    ? "rgba(255,255,255,0.6)"
    : "rgba(0,0,0,0.5)";
  const dividerColor = tmpl.dark
    ? "rgba(255,255,255,0.12)"
    : "rgba(0,0,0,0.08)";
  const overlayBg = tmpl.dark
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.05)";

  const nameDisplay = data.groomName
    ? data.brideName
      ? `${data.groomName} & ${data.brideName}`
      : data.groomName
    : "Аты";

  return (
    <div className={cn("w-full bg-gradient-to-b min-h-full", tmpl.gradient)}>
      {data.template === "kazakh_ornament" && (
        <div className="h-2 w-full bg-amber-400" />
      )}

      {/* HERO */}
      {has("hero") && (
        <div className="relative flex flex-col items-center justify-center px-6 pt-10 pb-6 text-center overflow-hidden">
          <div
            className="absolute -top-12 -right-12 w-36 h-36 rounded-full opacity-10"
            style={{ backgroundColor: tmpl.accent }}
          />
          <div
            className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-10"
            style={{ backgroundColor: tmpl.accent }}
          />
          <span className="text-5xl mb-3 relative z-10">
            {eventType?.emoji ?? "✨"}
          </span>
          <p
            className="text-[10px] tracking-[0.3em] uppercase font-medium mb-2 relative z-10"
            style={{ color: mutedText }}
          >
            Сізді шақырамыз
          </p>
          <h1
            className={cn(
              "font-bold leading-tight relative z-10",
              compact ? "text-xl" : "text-2xl"
            )}
            style={{ color: tmpl.textColor }}
          >
            {nameDisplay}
          </h1>
          {eventType && (
            <p
              className="text-xs mt-1.5 relative z-10"
              style={{ color: mutedText }}
            >
              {eventType.label}
            </p>
          )}
        </div>
      )}

      {/* Divider */}
      {has("hero") &&
        (has("date") || has("countdown") || has("invitation_text")) && (
          <div className="flex items-center gap-2 px-8 my-1">
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: dividerColor }}
            />
            <span className="text-xs" style={{ color: tmpl.accent }}>
              ◆
            </span>
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: dividerColor }}
            />
          </div>
        )}

      {/* DATE */}
      {has("date") && data.date && (
        <div className="px-6 py-5 text-center">
          <p
            className={cn("font-bold", compact ? "text-sm" : "text-base")}
            style={{ color: tmpl.textColor }}
          >
            {formatDate(data.date)}
          </p>
          {data.time && (
            <p className="text-xs mt-1" style={{ color: mutedText }}>
              Сағат {data.time}
            </p>
          )}
          {data.location && (
            <div className="flex items-center justify-center gap-1 mt-2">
              <span className="text-xs">📍</span>
              <p
                className="text-xs font-medium"
                style={{ color: tmpl.textColor }}
              >
                {data.location}
              </p>
            </div>
          )}
        </div>
      )}

      {/* COUNTDOWN */}
      {has("countdown") && countdown && (
        <div className="px-6 py-4">
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: overlayBg }}
          >
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { value: countdown.d, label: "күн" },
                { value: countdown.h, label: "сағ" },
                { value: countdown.m, label: "мин" },
                { value: countdown.s, label: "сек" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p
                    className={cn(
                      "font-black tabular-nums",
                      compact ? "text-lg" : "text-2xl"
                    )}
                    style={{ color: tmpl.accent }}
                  >
                    {pad(value)}
                  </p>
                  <p
                    className="text-[9px] uppercase tracking-wider"
                    style={{ color: mutedText }}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INVITATION TEXT */}
      {has("invitation_text") && data.invitationText && (
        <div className="px-6 py-4 text-center">
          <p
            className="text-xs leading-relaxed italic"
            style={{ color: mutedText }}
          >
            &ldquo;{data.invitationText}&rdquo;
          </p>
        </div>
      )}

      {/* PROGRAM */}
      {has("program") && (
        <div className="px-6 py-4">
          <p
            className="text-[10px] font-bold uppercase tracking-wider mb-3 text-center"
            style={{ color: mutedText }}
          >
            Бағдарлама
          </p>
          <div className="space-y-2">
            {[
              { time: "17:00", label: "Қонақтарды қарсы алу" },
              { time: "18:00", label: "Той басталуы" },
              { time: "20:00", label: "Той жалғасы" },
            ].map((item) => (
              <div key={item.time} className="flex items-center gap-3 text-xs">
                <span
                  className="font-mono font-bold shrink-0 tabular-nums"
                  style={{ color: tmpl.accent }}
                >
                  {item.time}
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: dividerColor }}
                />
                <span style={{ color: tmpl.textColor }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GALLERY */}
      {has("gallery") && (
        <div className="px-6 py-4">
          <p
            className="text-[10px] font-bold uppercase tracking-wider mb-3 text-center"
            style={{ color: mutedText }}
          >
            Галерея
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl opacity-25"
                style={{ backgroundColor: tmpl.accent }}
              />
            ))}
          </div>
        </div>
      )}

      {/* MAP */}
      {has("map") && (
        <div className="px-6 py-4">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: overlayBg }}
          >
            <div className="h-20 flex items-center justify-center">
              <span className="text-3xl opacity-40">🗺️</span>
            </div>
            {data.location && (
              <div className="px-3 py-2.5 text-center border-t" style={{ borderColor: dividerColor }}>
                <p
                  className="text-xs font-medium"
                  style={{ color: tmpl.textColor }}
                >
                  {data.location}
                </p>
                {data.mapLink && (
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: tmpl.accent }}
                  >
                    Картада ашу →
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RSVP */}
      {has("rsvp") && (
        <div className="px-6 py-6 text-center">
          <p
            className="text-xs font-semibold mb-3"
            style={{ color: mutedText }}
          >
            Сіз қатысасыз ба?
          </p>
          <div className="flex gap-2 justify-center">
            <div
              className="rounded-full px-4 py-2 text-xs font-bold text-white"
              style={{ backgroundColor: tmpl.accent }}
            >
              Иә, барамын
            </div>
            <div
              className="rounded-full px-4 py-2 text-xs font-medium border"
              style={{
                borderColor: dividerColor,
                color: mutedText,
              }}
            >
              Бара алмаймын
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP */}
      {has("whatsapp") && data.whatsapp && (
        <div className="px-6 py-4 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-white"
            style={{ backgroundColor: "#25d366" }}
          >
            <span>💬</span>
            <span>WhatsApp арқылы хабарласу</span>
          </div>
        </div>
      )}

      {data.template === "kazakh_ornament" && (
        <div className="h-2 w-full bg-amber-400 mt-4" />
      )}

      <div className="h-8" />
    </div>
  );
}
