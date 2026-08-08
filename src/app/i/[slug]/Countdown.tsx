"use client";

import { useState, useEffect } from "react";

interface Props {
  targetDate: string;
  targetTime?: string;
  accent: string;
  textMuted: string;
}

export function Countdown({ targetDate, targetTime, accent, textMuted }: Props) {
  const getRemaining = () => {
    const [y, m, d] = targetDate.split("-").map(Number);
    const [h = 18, min = 0] = (targetTime ?? "18:00").split(":").map(Number);
    const target = new Date(y, m - 1, d, h, min);
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };

  const [rem, setRem] = useState(getRemaining);
  useEffect(() => {
    const id = setInterval(() => setRem(getRemaining()), 1000);
    return () => clearInterval(id);
  });

  const units = [
    { n: rem.days, l: "күн" },
    { n: rem.hours, l: "сағат" },
    { n: rem.minutes, l: "минут" },
    { n: rem.seconds, l: "секунд" },
  ];

  return (
    <div className="flex justify-center gap-3 sm:gap-5">
      {units.map((u) => (
        <div key={u.l} className="flex flex-col items-center gap-1">
          <div
            className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl flex items-center justify-center font-serif text-2xl sm:text-3xl font-bold transition-all"
            style={{ background: `${accent}15`, border: `1px solid ${accent}30`, color: accent }}
          >
            {String(u.n).padStart(2, "0")}
          </div>
          <span className="text-xs" style={{ color: textMuted }}>{u.l}</span>
        </div>
      ))}
    </div>
  );
}
