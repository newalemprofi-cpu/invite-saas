"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  url: string;
  title?: string;
  accent: string;
  isDark: boolean;
  textMuted: string;
  loop?: boolean;
  autoplay?: boolean;
}

/**
 * Background invitation audio — a small floating control, never a
 * full-width in-page section. Autoplay is attempted best-effort: browsers
 * routinely reject audible autoplay (NotAllowedError) until the visitor
 * has interacted with the page at all, and that rejection is normal,
 * expected behavior, not an application error — so it's never surfaced as
 * one. When rejected, this waits for the first pointerdown/touchstart/
 * click anywhere on the page and retries once, then stops listening.
 */
export function MusicPlayer({ url, title, accent, isDark, textMuted, loop = true, autoplay = false }: Props) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audio.loop = loop;
    audio.preload = "auto";
    audioRef.current = audio;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    let cleanupInteractionListener: (() => void) | null = null;

    if (autoplay) {
      audio.play().catch(() => {
        // Rejected (most commonly NotAllowedError, pre-interaction autoplay
        // policy) — not an error state. Wait for the visitor's first
        // interaction anywhere on the page and try exactly once more.
        const tryStartOnInteraction = () => {
          audio.play().catch(() => {
            // Still blocked (e.g. a stricter mobile browser policy) — the
            // floating control's own play button always remains available.
          });
          cleanupInteractionListener?.();
        };
        const opts: AddEventListenerOptions = { once: true, passive: true };
        window.addEventListener("pointerdown", tryStartOnInteraction, opts);
        window.addEventListener("touchstart", tryStartOnInteraction, opts);
        window.addEventListener("click", tryStartOnInteraction, opts);
        cleanupInteractionListener = () => {
          window.removeEventListener("pointerdown", tryStartOnInteraction);
          window.removeEventListener("touchstart", tryStartOnInteraction);
          window.removeEventListener("click", tryStartOnInteraction);
        };
      });
    }

    return () => {
      cleanupInteractionListener?.();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.pause();
      audio.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  return (
    <div
      className="fixed z-40 flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 max-w-[min(78vw,15rem)]"
      style={{
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
        background: isDark ? "rgba(20,17,16,0.85)" : "rgba(255,255,255,0.9)",
        backdropFilter: "blur(10px)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      }}
    >
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105"
        style={{ background: accent }}
        aria-label={playing ? "Тоқтату" : "Ойнату"}
      >
        {playing ? (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <rect x="5" y="4" width="3" height="12" rx="1" />
            <rect x="12" y="4" width="3" height="12" rx="1" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        )}
      </button>

      <span className="text-xs font-medium truncate" style={{ color: textMuted }}>
        {title || "Музыка"}
      </span>

      <button
        onClick={toggleMute}
        className="w-5 h-5 shrink-0 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
        style={{ color: textMuted }}
        aria-label={muted ? "Дауысты қосу" : "Дауысты өшіру"}
      >
        {muted ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M9 9H5a1 1 0 00-1 1v4a1 1 0 001 1h4l5 4V5L9 9z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M9 9H5a1 1 0 00-1 1v4a1 1 0 001 1h4l5 4V5L9 9z" />
          </svg>
        )}
      </button>
    </div>
  );
}
