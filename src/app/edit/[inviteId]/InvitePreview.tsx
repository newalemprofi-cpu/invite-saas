"use client";

import type { Template } from "@/lib/templates";
import type { EditorData } from "./EditorClient";
import { useSingleAudioPreview } from "./useSingleAudioPreview";

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
  if (bgType === "color") {
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
      style={bgType === "image" || bgType === "video" ? { background: fallbackBg } : {}}
    >
      {/* Background layers */}
      {bgType === "image" && data.bgImageUrl && (
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
      {bgType === "video" && data.bgVideoUrl && (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={data.bgVideoUrl}
          autoPlay muted loop playsInline
          style={{ opacity: data.bgOpacity ?? 1 }}
        />
      )}
      {/* Overlay */}
      {(bgType === "image" || bgType === "video") && data.bgOverlay && data.bgOverlay !== "rgba(0,0,0,0)" && (
        <div className="absolute inset-0" style={{ background: data.bgOverlay }} />
      )}

      {/* Content scroll */}
      <div className="relative z-10 h-full overflow-y-auto flex flex-col" style={contentBg}>
        {orderedEnabled.map((id) => {
          const card = { background: isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.55)", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}` };

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
              <div className="w-full h-px opacity-20 my-1" style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
              {data.date && <p className="font-serif text-sm" style={{ color: textMuted }}>{fmt(data.date)}{data.time && ` · ${data.time}`}</p>}
              {data.location && <p className="text-xs" style={{ color: textMuted }}>{data.location}</p>}
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
              {(data.programItems.length > 0 ? data.programItems : [
                { time: "18:00", label: "Қонақтарды қарсы алу" },
                { time: "19:00", label: "Той басталады" },
                { time: "21:00", label: "Би кеші" },
              ]).map((p) => (
                <div key={p.time} className="flex gap-2 text-[9px] mb-1" style={{ color: textMuted }}>
                  <span className="shrink-0 font-mono" style={{ color: accent }}>{p.time}</span>
                  <span>{p.label}</span>
                </div>
              ))}
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
      </div>

      {/* Background audio — floating, not part of the scrolling section
          list (matches the public page's own floating control). Gated on
          musicEnabled alone, same as /i/[slug]/page.tsx. */}
      {data.musicEnabled && data.musicUrl && (
        <button
          type="button"
          onClick={() => preview.toggle(data.musicUrl)}
          className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 max-w-[85%]"
          style={{
            background: isDark ? "rgba(20,17,16,0.85)" : "rgba(255,255,255,0.9)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
          }}
        >
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] text-white"
            style={{ background: accent }}
          >
            {preview.playingUrl === data.musicUrl ? "⏸" : "▶"}
          </span>
          <span className="text-[9px] truncate" style={{ color: textMuted }}>{data.musicTitle || "Музыка"}</span>
        </button>
      )}
    </div>
  );
}
