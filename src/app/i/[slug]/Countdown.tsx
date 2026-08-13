"use client";

import { useState, useEffect } from "react";

interface Props {
  targetDate: string;
  targetTime?: string;
  accent: string;
  textMuted: string;
  /**
   * The parent Server Component's own render-time `Date.now()`, passed
   * through as plain serialized prop data (never re-invoked on the
   * client). Used only to seed the very first render.
   *
   * Root cause this fixes: the previous version called `Date.now()`
   * directly inside the `useState` lazy initializer, which React invokes
   * TWICE — once while rendering on the server, and again independently
   * while React re-runs this component on the client during hydration.
   * Those two calls happen at genuinely different wall-clock moments (network
   * + hydration delay in between), so whenever that gap straddled a
   * 1-second boundary the computed seconds (or, rarely, minutes) differed
   * between the server-rendered HTML and the client's first render —
   * exactly the intermittent React #418 hydration mismatch. Seeding both
   * the server render AND the client's hydration render from this single
   * shared prop value guarantees byte-identical initial output; live
   * ticking (real `Date.now()`) only takes over afterwards, inside the
   * client-only effect below.
   */
  serverNow: number;
}

function computeRemaining(targetDate: string, targetTime: string | undefined, now: number) {
  const [y, m, d] = targetDate.split("-").map(Number);
  const [h = 18, min = 0] = (targetTime ?? "18:00").split(":").map(Number);
  const target = new Date(y, m - 1, d, h, min);
  const diff = Math.max(0, target.getTime() - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export function Countdown({ targetDate, targetTime, accent, textMuted, serverNow }: Props) {
  const [rem, setRem] = useState(() => computeRemaining(targetDate, targetTime, serverNow));
  useEffect(() => {
    const id = setInterval(() => setRem(computeRemaining(targetDate, targetTime, Date.now())), 1000);
    return () => clearInterval(id);
  });

  const units = [
    { n: rem.days, l: "күн" },
    { n: rem.hours, l: "сағат" },
    { n: rem.minutes, l: "минут" },
    { n: rem.seconds, l: "секунд" },
  ];

  return (
    // grid-cols-4 with a percentage-based gap (not a fixed px width per
    // card) so all four cards always fit any viewport down to 360px
    // without a magic-number risk — each cell just grows/shrinks with the
    // available column width instead of relying on a hardcoded w-14/w-16.
    <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-sm mx-auto">
      {units.map((u) => (
        <div key={u.l} className="flex flex-col items-center gap-2">
          <div
            className="w-full aspect-square rounded-2xl flex items-center justify-center font-serif font-bold transition-all"
            style={{
              background: `${accent}14`,
              border: `1px solid ${accent}30`,
              color: accent,
              fontSize: "clamp(1.5rem, 1.1rem + 3.5vw, 2.25rem)",
              boxShadow: `0 4px 14px ${accent}12`,
            }}
          >
            {String(u.n).padStart(2, "0")}
          </div>
          <span className="invite-caption" style={{ color: textMuted }}>{u.l}</span>
        </div>
      ))}
    </div>
  );
}
