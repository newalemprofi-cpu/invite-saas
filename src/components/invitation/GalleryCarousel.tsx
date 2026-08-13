"use client";

import { SwipeTrack } from "./SwipeTrack";
import type { WeddingDecorPreset } from "@/lib/wedding-template-layouts";
import { KazakhCorner } from "@/components/wedding/KazakhOrnament";

export type GalleryVariant = WeddingDecorPreset | "default";

interface Props {
  urls: string[];
  accent: string;
  variant: GalleryVariant;
  labelPrev: string;
  labelNext: string;
}

/**
 * Shared gallery carousel behavior (swipe/arrows/pagination — see
 * SwipeTrack) with a template-specific FRAME around each photo. One
 * mechanism, five presentation variants (§12) — never five separate
 * carousel implementations. `urls` is the same ordered, already-resolved
 * `galleryUrls` every other gallery consumer uses; this component never
 * reads storage/upload state itself.
 */
export function GalleryCarousel({ urls, accent, variant, labelPrev, labelNext }: Props) {
  if (urls.length === 0) return null;

  const frame = FRAME_BY_VARIANT[variant];

  return (
    <SwipeTrack
      accent={accent}
      labelPrev={labelPrev}
      labelNext={labelNext}
      arrowsVariant={frame.arrowsVariant}
      className="gap-4 px-1 py-1"
      itemClassName="w-[82%] sm:w-[62%] first:ml-[9%] sm:first:ml-[19%] last:mr-[9%] sm:last:mr-[19%]"
    >
      {urls.map((url, i) => (
        <div
          key={url + i}
          className={`relative aspect-[4/5] overflow-hidden ${frame.frameClassName}`}
          style={frame.frameStyle}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className={`w-full h-full object-cover ${frame.imageClassName}`} draggable={false} />
          {/* Kazakh Ethno signature — two small corner accents echoing the
              hero frame, restrained enough not to compete with the photo
              itself (§15 — "photos must remain the focus"). Every other
              variant renders none of this. */}
          {variant === "ethno" && (
            <>
              <div className="absolute top-2.5 left-2.5 w-4 h-4 pointer-events-none" aria-hidden="true">
                <KazakhCorner accent={accent} className="w-full h-full" />
              </div>
              <div className="absolute bottom-2.5 right-2.5 w-4 h-4 pointer-events-none rotate-180" aria-hidden="true">
                <KazakhCorner accent={accent} className="w-full h-full" />
              </div>
            </>
          )}
        </div>
      ))}
    </SwipeTrack>
  );
}

interface FrameSpec {
  frameClassName: string;
  frameStyle?: React.CSSProperties;
  imageClassName: string;
  arrowsVariant: "light" | "dark";
}

const FRAME_BY_VARIANT: Record<GalleryVariant, FrameSpec> = {
  // Romantic: large, rounded, edge-to-edge — the photo itself is the whole card.
  romantic: {
    frameClassName: "rounded-[28px] shadow-[0_8px_28px_rgba(214,101,139,0.18)]",
    imageClassName: "",
    arrowsVariant: "light",
  },
  // Classic Gold: padded ivory mat with a thin gold border, like a framed print.
  "classic-gold": {
    frameClassName: "rounded-2xl p-2",
    frameStyle: { background: "#FFFDF8", border: "1px solid rgba(196,150,62,0.35)" },
    imageClassName: "rounded-xl",
    arrowsVariant: "light",
  },
  // Floral: soft rounded corners with a gentle sage-tinted halo.
  floral: {
    frameClassName: "rounded-[26px]",
    frameStyle: { boxShadow: "0 0 0 6px rgba(122,153,110,0.10), 0 8px 24px rgba(122,153,110,0.15)" },
    imageClassName: "",
    arrowsVariant: "light",
  },
  // Dark Luxury: cinematic — near-black mat, subtle gold hairline, dark arrows.
  "dark-luxury": {
    frameClassName: "rounded-2xl p-1.5",
    frameStyle: { background: "#151210", border: "1px solid rgba(201,169,97,0.35)" },
    imageClassName: "rounded-xl",
    arrowsVariant: "dark",
  },
  // Ethno: warm double-border evoking the hero's ornamental arch, without literally arching arbitrary photos.
  ethno: {
    frameClassName: "rounded-2xl p-1.5",
    frameStyle: { background: "#FBF4E7", boxShadow: "inset 0 0 0 1px rgba(139,105,20,0.35), 0 8px 20px rgba(139,105,20,0.12)" },
    imageClassName: "rounded-xl",
    arrowsVariant: "light",
  },
  // Non-flagship / legacy templates: a plain, neutral rounded card.
  default: {
    frameClassName: "rounded-2xl",
    frameStyle: { boxShadow: "0 4px 18px rgba(28,25,23,0.10)" },
    imageClassName: "",
    arrowsVariant: "light",
  },
};
