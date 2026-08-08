"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  url: string;
  title?: string;
  accent: string;
  isDark: boolean;
  textMuted: string;
  loop?: boolean;
  autoplay?: boolean;
}

export function MusicPlayer({ url, title, accent, isDark, textMuted, loop = true, autoplay = false }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audio.loop = loop;
    audioRef.current = audio;

    if (autoplay) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }

    audio.addEventListener("timeupdate", () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    });
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [url]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="mx-4 my-4 rounded-2xl p-4 flex items-center gap-4"
      style={{
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`,
      }}
    >
      {/* Play/Pause button */}
      <button
        onClick={toggle}
        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105"
        style={{ background: accent }}
      >
        {playing ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <rect x="5" y="4" width="3" height="12" rx="1" />
            <rect x="12" y="4" width="3" height="12" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: textMuted }}>
          🎵 {title || "Музыка"}
        </p>
        {/* Progress bar */}
        <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: accent }}
          />
        </div>
        {duration > 0 && (
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: textMuted }}>{fmt(duration * progress / 100)}</span>
            <span className="text-[10px]" style={{ color: textMuted }}>{fmt(duration)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
