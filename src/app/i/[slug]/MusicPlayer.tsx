"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  url: string;
  accent: string;
  loop?: boolean;
  autoplay?: boolean;
}

const BUTTON_SIZE = 52;
const EDGE_PADDING = 12;
const DRAG_THRESHOLD = 6;
const STORAGE_KEY = "shaqyru:musicButtonPos";

interface Pos {
  left: number;
  top: number;
}

function clamp(pos: Pos): Pos {
  const maxLeft = Math.max(EDGE_PADDING, window.innerWidth - BUTTON_SIZE - EDGE_PADDING);
  const maxTop = Math.max(EDGE_PADDING, window.innerHeight - BUTTON_SIZE - EDGE_PADDING);
  return {
    left: Math.min(Math.max(pos.left, EDGE_PADDING), maxLeft),
    top: Math.min(Math.max(pos.top, EDGE_PADDING), maxTop),
  };
}

function loadSavedPos(): Pos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.left !== "number" || typeof parsed?.top !== "number") return null;
    return clamp(parsed);
  } catch {
    return null;
  }
}

function savePos(pos: Pos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // localStorage unavailable (private mode etc.) — position just won't persist across reloads.
  }
}

/**
 * The ENTIRE public-invitation music control: one small circular
 * play/pause button, draggable anywhere on screen. No title, no progress
 * bar, no volume control, no background pill — see the task this was built
 * for ("FINAL UI FIX") for why those were all deliberately removed.
 */
export function MusicPlayer({ url, accent, loop = true, autoplay = false }: Props) {
  const [playing, setPlaying] = useState(false);
  // null = not yet positioned by JS; render at the CSS-only default
  // (bottom-left, safe-area aware) so there's no server/client mismatch and
  // no flash of an unpositioned button before hydration.
  const [pos, setPos] = useState<Pos | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: Pos;
    dragging: boolean;
  } | null>(null);

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
        // interaction anywhere on the page and try exactly once more. The
        // button itself always remains a normal, working manual Play
        // control regardless of what happens here.
        const tryStartOnInteraction = () => {
          audio.play().catch(() => {});
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

  // Restore a saved position on mount, and re-clamp whenever the viewport
  // changes (resize/orientation change) so a saved spot from a wider screen
  // can never end up off-screen on a narrower one.
  useEffect(() => {
    // Reads localStorage (client-only, unavailable during SSR) once on
    // mount to restore a previously-dragged spot — deliberately done after
    // the first paint rather than as a lazy useState initializer, so the
    // server-rendered CSS-default position never mismatches the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPos((current) => current ?? loadSavedPos());
    const onResize = () => setPos((current) => (current ? clamp(current) : current));
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    // Deliberately branches on the React `playing` state (kept in sync via
    // the audio's own play/pause events) rather than `audio.paused`
    // directly: the autoplay-retry-on-first-interaction listener above can
    // call `audio.play()` from the SAME interaction that lands here (e.g.
    // the very first tap on this button while autoplay was still pending
    // retry) — `.play()` flips `audio.paused` to false synchronously, so
    // reading it here would see "already playing" and immediately pause
    // right back out. `playing` only flips once the browser actually fires
    // the event, so both code paths agree on "start playing" instead of
    // fighting each other.
    if (playing) audio.pause();
    else audio.play().catch(() => {});
  };

  const currentPixelPos = (): Pos => {
    if (pos) return pos;
    // Mirrors the CSS default (bottom-left, EDGE_PADDING from each edge) as
    // real pixel coordinates, for the moment a drag starts before any
    // saved/explicit position exists yet.
    return clamp({ left: EDGE_PADDING, top: window.innerHeight - BUTTON_SIZE - EDGE_PADDING });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture isn't essential — without it the drag still works
      // as long as the pointer stays over the button; only synthetic/
      // untrusted pointer ids (or an unsupported environment) can reject
      // this, and that must never block the rest of the interaction.
    }
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: currentPixelPos(),
      dragging: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.dragging = true;
    setPos(clamp({ left: drag.origin.left + dx, top: drag.origin.top + dy }));
  };

  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (drag.dragging) {
      // A real drag — persist the final spot, don't toggle playback.
      setPos((current) => {
        if (current) savePos(current);
        return current;
      });
    } else {
      // Movement stayed under the threshold the whole time — a tap/click.
      toggle();
    }
  };

  const style: React.CSSProperties = pos
    ? { left: pos.left, top: pos.top }
    : {
        left: `max(${EDGE_PADDING}px, env(safe-area-inset-left))`,
        bottom: `max(${EDGE_PADDING}px, env(safe-area-inset-bottom))`,
      };

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      aria-label={playing ? "Тоқтату" : "Ойнату"}
      className="fixed z-40 flex items-center justify-center rounded-full select-none"
      style={{
        ...style,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        background: accent,
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        touchAction: "none",
        cursor: "grab",
      }}
    >
      {playing ? (
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <rect x="5" y="4" width="3" height="12" rx="1" />
          <rect x="12" y="4" width="3" height="12" rx="1" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
        </svg>
      )}
    </button>
  );
}
