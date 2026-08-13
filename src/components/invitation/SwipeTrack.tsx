"use client";

import { useEffect, useRef, useState, Children } from "react";

interface Props {
  children: React.ReactNode[];
  accent: string;
  labelPrev: string;
  labelNext: string;
  /** Applied to each slide wrapper — controls slide width/aspect. */
  itemClassName?: string;
  /** Applied to the scrollable track itself. */
  className?: string;
  /** "dark" = light-on-dark arrow buttons for photos/dark sections; "light" = the default dark-on-light pill. */
  arrowsVariant?: "light" | "dark";
}

/**
 * Shared low-level swipe/scroll-snap mechanics for every invitation
 * carousel (gallery photos, guest wishes) — one index-tracked horizontal
 * track, touch/mouse-wheel swipe via native scroll-snap, prev/next arrow
 * buttons, keyboard left/right navigation, and a dot or "i / N" counter
 * indicator depending on item count. Callers only ever differ in WHAT each
 * slide renders and how it's styled (itemClassName/arrowsVariant) — never
 * in how paging/indexing works, per the "one carousel mechanism, five
 * visual variants" requirement.
 */
export function SwipeTrack({ children, accent, labelPrev, labelNext, itemClassName = "", className = "", arrowsVariant = "light" }: Props) {
  const items = Children.toArray(children);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = items.length;

  const scrollToIndex = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(count - 1, i));
    const child = track.children[clamped] as HTMLElement | undefined;
    if (child) track.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const children = Array.from(track.children) as HTMLElement[];
        const center = track.scrollLeft + track.clientWidth / 2;
        let closest = 0;
        let closestDist = Infinity;
        children.forEach((c, i) => {
          const mid = c.offsetLeft + c.clientWidth / 2;
          const dist = Math.abs(mid - center);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        });
        setIndex(closest);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [count]);

  if (count === 0) return null;

  const arrowStyle: React.CSSProperties =
    arrowsVariant === "dark"
      ? { background: "rgba(255,255,255,0.16)", color: "white", backdropFilter: "blur(6px)" }
      : { background: "rgba(28,25,23,0.45)", color: "white", backdropFilter: "blur(6px)" };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        role="group"
        aria-label={labelPrev}
        tabIndex={count > 1 ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            scrollToIndex(index + 1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            scrollToIndex(index - 1);
          }
        }}
        className={`no-scrollbar flex overflow-x-auto snap-x snap-mandatory scroll-smooth outline-none ${className}`}
      >
        {items.map((child, i) => (
          <div key={i} className={`shrink-0 snap-center ${itemClassName}`}>
            {child}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label={labelPrev}
            onClick={() => scrollToIndex(index - 1)}
            disabled={index === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-0 transition-opacity"
            style={arrowStyle}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={labelNext}
            onClick={() => scrollToIndex(index + 1)}
            disabled={index === count - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-0 transition-opacity"
            style={arrowStyle}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="flex items-center justify-center gap-3 mt-3">
            {count <= 6 ? (
              <div className="flex items-center gap-1.5">
                {items.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={String(i + 1)}
                    aria-current={i === index}
                    onClick={() => scrollToIndex(i)}
                    className="rounded-full transition-all duration-200"
                    style={{ width: i === index ? 16 : 6, height: 6, background: i === index ? accent : `${accent}40` }}
                  />
                ))}
              </div>
            ) : (
              <span className="text-xs font-medium tabular-nums" style={{ color: accent }}>
                {index + 1} / {count}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
