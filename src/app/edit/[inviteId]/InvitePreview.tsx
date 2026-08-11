"use client";

import type { Template } from "@/lib/templates";
import type { EditorData } from "./EditorClient";
import { useSingleAudioPreview } from "./useSingleAudioPreview";
import { getWeddingLayout } from "@/lib/wedding-template-layouts";
import { WeddingHero } from "@/components/wedding/WeddingHero";

interface Props {
  data: EditorData;
  template: Template | null;
}

function fmt(s: string) {
  if (!s) return "";
  try {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("kk-KZ", { day: "numeric", month: "long", year: "numeric" });
  } catch { return s; }
}

export function InvitePreview({ data, template }: Props) {
  const preview = useSingleAudioPreview();
  const accent = data.accentColor || template?.accent || "#C4963E";
  const textDark = template?.textDark || "#1C1917";
  const textMuted = template?.textMuted || "#78716C";
  const isDark = template?.dark || false;

  // One of the 5 flagship Wedding templates (see lib/wedding-template-
  // layouts.ts) — null for every other template, which keeps rendering
  // exactly as before this feature. When set, the customer's main photo is
  // rendered ENTIRELY inside the hero composition below (WeddingHero), not
  // as a whole-page background — see the contentBg/bgType override just
  // below for why the generic image-background layers are skipped here.
  const weddingLayout = getWeddingLayout(template?.slug);

  // Ordered sections (enabled only)
  const orderedEnabled = data.sections.filter((s) => s.enabled).map((s) => s.id);
  const has = (id: string) => orderedEnabled.includes(id);

  const name = data.groomName
    ? data.brideName ? `${data.groomName} & ${data.brideName}` : data.groomName
    : "Атыңыз";

  const bgType = data.bgType || "color";
  const fallbackBg = template?.bg || "#FAF8F3";

  // For image/video: outer container gets the fallback (shown before media loads),
  // the content layer is transparent so the absolute media shows through.
  // For color/gradient: outer has no bg, content layer carries the actual background.
  let contentBg: React.CSSProperties = {};
  if (weddingLayout) {
    // The photo lives inside WeddingHero's own composition (full-bleed /
    // top-band / framed / fade / arched) — the page behind it stays a flat
    // template color, matching every one of the 5 designs' own spec
    // ("ivory content area", "cream page", "dark background", …).
    contentBg = { background: fallbackBg };
  } else if (bgType === "color") {
    contentBg = { background: data.bgColor || fallbackBg };
  } else if (bgType === "gradient") {
    contentBg = { background: data.bgGradient || fallbackBg };
  } else {
    contentBg = { background: "transparent" };
  }

  const textColor = isDark ? "#FAF8F3" : textDark;

  return (
    <div
      className="relative h-full overflow-hidden flex flex-col"
      style={!weddingLayout && (bgType === "image" || bgType === "video") ? { background: fallbackBg } : {}}
    >
      {/* Background layers */}
      {!weddingLayout && bgType === "image" && data.bgImageUrl && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${data.bgImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: data.bgBlur ? `blur(${data.bgBlur}px)` : undefined,
            opacity: data.bgOpacity ?? 1,
            transform: "scale(1.05)",
          }}
        />
      )}
      {!weddingLayout && bgType === "video" && data.bgVideoUrl && (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={data.bgVideoUrl}
          autoPlay muted loop playsInline
          style={{ opacity: data.bgOpacity ?? 1 }}
        />
      )}
      {/* Overlay */}
      {!weddingLayout && (bgType === "image" || bgType === "video") && data.bgOverlay && data.bgOverlay !== "rgba(0,0,0,0)" && (
        <div className="absolute inset-0" style={{ background: data.bgOverlay }} />
      )}

      {/* Content scroll */}
      <div className="relative z-10 h-full overflow-y-auto flex flex-col" style={contentBg}>
        {orderedEnabled.map((id) => {
          const card = weddingLayout
            ? { background: weddingLayout.sectionCardBg, borderTop: `1px solid ${weddingLayout.sectionCardBorder}` }
            : { background: isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.55)", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}` };

          if (id === "hero" && weddingLayout) return (
            <div key="hero" className="shrink-0" style={{ minHeight: 300 }}>
              <WeddingHero
                compact
                layout={weddingLayout}
                tokens={{ accent, textDark, textMuted, isDark, bg: fallbackBg }}
                data={{
                  name: data.groomName,
                  partner: data.brideName || null,
                  hostsLine: data.hosts || data.parents || null,
                  date: data.date || null,
                  time: data.time || null,
                  location: data.location || null,
                  address: data.address || null,
                  message: data.invitationText || null,
                  // note is rendered once, unconditionally, below the
                  // section list already (see the trailing data.note block)
                  // — kept out of WeddingHero here to avoid showing it twice.
                  note: null,
                  age: data.age || null,
                  photoUrl: data.bgImageUrl || null,
                }}
              />
            </div>
          );

          if (id === "hero") return (
            <div key="hero" className="relative flex flex-col items-center justify-center gap-3 p-5 text-center min-h-[180px]">
              {template?.slug === "zaure-premium" && (
                <>
                  <span className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full pointer-events-none" style={{ background: accent, opacity: 0.25 }} />
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full pointer-events-none" style={{ background: accent, opacity: 0.25 }} />
                  <span className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full pointer-events-none" style={{ background: accent, opacity: 0.2 }} />
                  <span className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full pointer-events-none" style={{ background: accent, opacity: 0.2 }} />
                </>
              )}
              <p className="label-caps text-[9px]" style={{ color: textMuted }}>Іс-шараға шақырамыз</p>
              <p className="font-serif text-xl font-semibold leading-tight" style={{ color: textColor }}>{name}</p>
              {(data.hosts || data.parents) && (
                <p className="text-[10px]" style={{ color: textMuted }}>{data.hosts || data.parents}</p>
              )}
              <div className="w-full h-px opacity-20 my-1" style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
              {data.date && <p className="font-serif text-sm" style={{ color: textMuted }}>{fmt(data.date)}{data.time && ` · ${data.time}`}</p>}
              {data.location && <p className="text-xs" style={{ color: textMuted }}>{data.location}</p>}
              {data.address && <p className="text-[10px]" style={{ color: textMuted }}>{data.address}</p>}
            </div>
          );

          if (id === "countdown") return (
            <div key="countdown" className="flex justify-around px-4 py-3 shrink-0" style={card}>
              {[{ n: "32", l: "күн" }, { n: "14", l: "сағ" }, { n: "27", l: "мин" }].map((t) => (
                <div key={t.l} className="text-center">
                  <p className="font-serif text-lg font-bold" style={{ color: textColor }}>{t.n}</p>
                  <p className="text-[10px]" style={{ color: textMuted }}>{t.l}</p>
                </div>
              ))}
            </div>
          );

          if (id === "invitation_text" && data.invitationText) return (
            <div key="invitation_text" className="mx-4 my-2 p-3 rounded-xl text-xs italic text-center leading-relaxed shrink-0"
              style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: textMuted }}>
              &ldquo;{data.invitationText}&rdquo;
            </div>
          );

          if (id === "love_story") return (
            <div key="love_story" className="mx-4 my-2 p-3 rounded-xl shrink-0"
              style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}>
              <p className="text-[10px] font-semibold mb-1" style={{ color: textMuted }}>Біздің тарих</p>
              <p className="text-[10px] leading-relaxed" style={{ color: textMuted }}>
                {data.loveStory || "Сүйіспеншілік тарихымыз..."}
              </p>
            </div>
          );

          if (id === "gallery" && data.galleryUrls.length > 0) return (
            <div key="gallery" className="px-4 py-2 shrink-0">
              <div className="flex gap-1.5 overflow-x-auto">
                {data.galleryUrls.slice(0, 4).map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                ))}
              </div>
            </div>
          );

          if (id === "video_section" && data.videoUrl) return (
            <div key="video_section" className="mx-4 my-2 shrink-0">
              <div className="w-full h-20 rounded-xl flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider"
                style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", color: textMuted }}>
                Бейне
              </div>
            </div>
          );

          if (id === "program") return (
            <div key="program" className="mx-4 my-2 p-3 rounded-xl shrink-0"
              style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}>
              <p className="text-[10px] font-semibold mb-2" style={{ color: textMuted }}>Бағдарлама</p>
              {data.programItems.length === 0 && data.programText ? (
                <p className="text-[9px] leading-relaxed" style={{ color: textMuted }}>{data.programText}</p>
              ) : (
                (data.programItems.length > 0 ? data.programItems : [
                  { time: "18:00", label: "Қонақтарды қарсы алу" },
                  { time: "19:00", label: "Той басталады" },
                  { time: "21:00", label: "Би кеші" },
                ]).map((p) => (
                  <div key={p.time} className="flex gap-2 text-[9px] mb-1" style={{ color: textMuted }}>
                    <span className="shrink-0 font-mono" style={{ color: accent }}>{p.time}</span>
                    <span>{p.label}</span>
                  </div>
                ))
              )}
            </div>
          );

          if (id === "dress_code") return (
            <div key="dress_code" className="mx-4 my-1 p-2 rounded-lg shrink-0"
              style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}>
              <p className="text-[10px] font-semibold mb-0.5" style={{ color: textMuted }}>Dress Code</p>
              <p className="text-[9px]" style={{ color: textMuted }}>{data.dressCode || "Ақ-алтын түстер"}</p>
            </div>
          );

          if (id === "wishes") return (
            <div key="wishes" className="mx-4 my-1 p-2 rounded-lg shrink-0"
              style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}>
              <p className="text-[10px] font-semibold" style={{ color: textMuted }}>Тілектер</p>
            </div>
          );

          if (id === "map" && data.mapLink) return (
            <div key="map" className="mx-4 my-1 p-2 rounded-lg text-center text-[10px] shrink-0"
              style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: textMuted }}>
              Картада қарау ↗
            </div>
          );

          if (id === "rsvp") return (
            <div key="rsvp" className="px-4 pb-2 pt-2 shrink-0">
              <button className="w-full py-2 rounded-full text-[10px] font-semibold text-white" style={{ background: accent }}>
                {data.rsvpText || "RSVP беру ✓"}
              </button>
            </div>
          );

          if (id === "contacts") return (
            <div key="contacts" className="mx-4 my-1 p-2 rounded-lg shrink-0"
              style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}>
              <p className="text-[10px] font-semibold mb-0.5" style={{ color: textMuted }}>Байланыс</p>
              <p className="text-[9px]" style={{ color: textMuted }}>{data.contactsText || data.organizerPhone || "+7 700 000 0000"}</p>
            </div>
          );

          if (id === "gift_info") return (
            <div key="gift_info" className="mx-4 my-1 p-2 rounded-lg shrink-0"
              style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}>
              <p className="text-[10px] font-semibold mb-0.5" style={{ color: textMuted }}>Сыйлық</p>
              <p className="text-[9px]" style={{ color: textMuted }}>{data.giftInfo || "Kaspi карта..."}</p>
            </div>
          );

          if (id === "whatsapp" && data.whatsapp) return (
            <div key="whatsapp" className="px-4 py-1 shrink-0">
              <div className="py-2 rounded-full text-[10px] font-semibold text-white text-center" style={{ background: "#25D366" }}>
                WhatsApp
              </div>
            </div>
          );

          return null;
        })}
        {data.note && (
          <p className="mx-4 mb-2 text-[9px] leading-relaxed shrink-0" style={{ color: textMuted }}>{data.note}</p>
        )}
      </div>

      {/* Background audio — floating, not part of the scrolling section
          list. Mirrors the public page's minimal control: just a small
          circular play/pause button, no title/pill (see MusicPlayer.tsx).
          Not draggable here — this is a small fixed phone-frame preview,
          not the real viewport the public button drags around in. Gated on
          musicEnabled alone, same as /i/[slug]/page.tsx. */}
      {data.musicEnabled && data.musicUrl && (
        <button
          type="button"
          onClick={() => preview.toggle(data.musicUrl)}
          aria-label={preview.playingUrl === data.musicUrl ? "Тоқтату" : "Ойнату"}
          className="absolute bottom-3 left-3 z-20 w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: accent, boxShadow: "0 2px 10px rgba(0,0,0,0.25)" }}
        >
          {preview.playingUrl === data.musicUrl ? (
            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <rect x="5" y="4" width="3" height="12" rx="1" />
              <rect x="12" y="4" width="3" height="12" rx="1" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
