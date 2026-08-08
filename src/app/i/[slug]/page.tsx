import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getTemplate } from "@/lib/templates";
import { getDbTemplate } from "@/lib/db-templates";
import { THEMES } from "@/types/invite";
import { RSVPForm } from "./RSVPForm";
import { MusicPlayer } from "./MusicPlayer";
import { Countdown } from "./Countdown";

interface Section { id: string; enabled: boolean }

interface D {
  // Naming (new and legacy)
  templateSlug?: string | null;
  template?: string | null;
  groomName?: string | null;
  brideName?: string | null;
  person1?: string | null;
  person2?: string | null;
  // Event
  date?: string;
  time?: string;
  location?: string | null;
  locationName?: string | null;
  mapLink?: string | null;
  mapUrl?: string | null;
  invitationText?: string | null;
  message?: string | null;
  // Contacts
  whatsapp?: string | null;
  organizerPhone?: string | null;
  // Blocks (ordered sections or legacy array)
  sections?: Section[];
  enabledBlocks?: string[];
  // Design
  bgColor?: string | null;
  accentColor?: string | null;
  fontFamily?: string | null;
  // Background
  bgType?: "color" | "gradient" | "image" | "video" | null;
  bgImageUrl?: string | null;
  bgVideoUrl?: string | null;
  bgGradient?: string | null;
  bgBlur?: number | null;
  bgOpacity?: number | null;
  bgOverlay?: string | null;
  // Media
  galleryUrls?: string[];
  musicUrl?: string | null;
  musicTitle?: string | null;
  musicEnabled?: boolean;
  musicLoop?: boolean;
  musicAutoplay?: boolean;
  // Block content
  programItems?: Array<{ time: string; label: string }>;
  loveStory?: string | null;
  dressCode?: string | null;
  wishesText?: string | null;
  contactsText?: string | null;
  giftInfo?: string | null;
  videoUrl?: string | null;
  rsvpText?: string | null;
  // Legacy
  theme?: string | null;
}

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const invite = await db.invite.findUnique({ where: { slug }, select: { title: true } });
  if (!invite) return {};
  return {
    title: `${invite.title} — Шақыру`,
    description: `Сізді ${invite.title} шарасына шақырамыз`,
  };
}

function fmt(s: string) {
  try {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("kk-KZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return s; }
}

function ZaureFloralCorner({ mirror = false, vflip = false }: { mirror?: boolean; vflip?: boolean }) {
  const transforms: string[] = [];
  if (mirror) transforms.push("scaleX(-1)");
  if (vflip) transforms.push("scaleY(-1)");
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"
      style={transforms.length ? { transform: transforms.join(" ") } : undefined}>
      <path d="M8,112 Q35,75 58,48 Q78,24 108,8" stroke="#B8925A" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.45"/>
      <path d="M35,82 Q22,68 28,56" stroke="#B8925A" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.3"/>
      <path d="M58,48 Q72,44 78,32" stroke="#B8925A" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.3"/>
      <path d="M38,78 C28,62 36,54 44,62 C42,72 38,78 38,78Z" fill="#C9A87C" opacity="0.28"/>
      <path d="M58,48 C70,36 76,42 70,52 C62,54 58,48 58,48Z" fill="#C9A87C" opacity="0.28"/>
      <path d="M22,94 C14,80 22,72 30,80 C28,88 22,94 22,94Z" fill="#C9A87C" opacity="0.22"/>
      <g transform="translate(103,15)">
        <ellipse cx="0" cy="-8" rx="4.5" ry="8" fill="#D4B080" opacity="0.4" transform="rotate(0)"/>
        <ellipse cx="0" cy="-8" rx="4.5" ry="8" fill="#D4B080" opacity="0.4" transform="rotate(60)"/>
        <ellipse cx="0" cy="-8" rx="4.5" ry="8" fill="#D4B080" opacity="0.4" transform="rotate(120)"/>
        <ellipse cx="0" cy="-8" rx="4.5" ry="8" fill="#D4B080" opacity="0.4" transform="rotate(180)"/>
        <ellipse cx="0" cy="-8" rx="4.5" ry="8" fill="#D4B080" opacity="0.4" transform="rotate(240)"/>
        <ellipse cx="0" cy="-8" rx="4.5" ry="8" fill="#D4B080" opacity="0.4" transform="rotate(300)"/>
        <circle cx="0" cy="0" r="4" fill="#C4963E" opacity="0.5"/>
      </g>
      <g transform="translate(60,44)">
        <ellipse cx="0" cy="-6" rx="3.5" ry="6" fill="#D4B080" opacity="0.38" transform="rotate(0)"/>
        <ellipse cx="0" cy="-6" rx="3.5" ry="6" fill="#D4B080" opacity="0.38" transform="rotate(60)"/>
        <ellipse cx="0" cy="-6" rx="3.5" ry="6" fill="#D4B080" opacity="0.38" transform="rotate(120)"/>
        <ellipse cx="0" cy="-6" rx="3.5" ry="6" fill="#D4B080" opacity="0.38" transform="rotate(180)"/>
        <ellipse cx="0" cy="-6" rx="3.5" ry="6" fill="#D4B080" opacity="0.38" transform="rotate(240)"/>
        <ellipse cx="0" cy="-6" rx="3.5" ry="6" fill="#D4B080" opacity="0.38" transform="rotate(300)"/>
        <circle cx="0" cy="0" r="3" fill="#C4963E" opacity="0.48"/>
      </g>
      <g transform="translate(28,78)">
        <ellipse cx="0" cy="-4" rx="2.5" ry="4" fill="#D4B080" opacity="0.32" transform="rotate(0)"/>
        <ellipse cx="0" cy="-4" rx="2.5" ry="4" fill="#D4B080" opacity="0.32" transform="rotate(72)"/>
        <ellipse cx="0" cy="-4" rx="2.5" ry="4" fill="#D4B080" opacity="0.32" transform="rotate(144)"/>
        <ellipse cx="0" cy="-4" rx="2.5" ry="4" fill="#D4B080" opacity="0.32" transform="rotate(216)"/>
        <ellipse cx="0" cy="-4" rx="2.5" ry="4" fill="#D4B080" opacity="0.32" transform="rotate(288)"/>
        <circle cx="0" cy="0" r="2" fill="#C4963E" opacity="0.4"/>
      </g>
    </svg>
  );
}

function Gate({ emoji, title, msg }: { emoji: string; title: string; msg: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-6" style={{ background: "var(--ivory)" }}>
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl" style={{ background: "rgba(196,150,62,0.08)", border: "1px solid rgba(196,150,62,0.2)" }}>
        {emoji}
      </div>
      <div>
        <h1 className="font-serif text-2xl font-semibold mb-2" style={{ color: "var(--charcoal)" }}>{title}</h1>
        <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>{msg}</p>
      </div>
      <Link href="/" className="btn-gold text-sm">Өз шақыруыңызды жасаңыз →</Link>
    </div>
  );
}

function resolveEnabledBlocks(d: D): string[] {
  if (d.sections && d.sections.length > 0) {
    return d.sections.filter((s) => s.enabled).map((s) => s.id);
  }
  return d.enabledBlocks ?? ["hero", "date", "countdown", "rsvp"];
}

export default async function PublicInvitePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;

  const invite = await db.invite.findUnique({ where: { slug } });
  if (!invite) notFound();

  db.invite.update({ where: { id: invite.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  let isPreview = false;
  if (preview === "1") {
    const s = await getSession();
    isPreview = s?.userId === invite.userId || s?.role === "ADMIN";
  }

  const now = new Date();
  const expired = invite.status === "EXPIRED" || (invite.status === "PUBLISHED" && invite.expiresAt !== null && invite.expiresAt < now);

  if (expired && !isPreview) return <Gate emoji="⏳" title={invite.title} msg="Бұл шақырудың мерзімі аяқталды. RSVP қабылдау тоқтатылды." />;
  if (invite.status !== "PUBLISHED" && !isPreview) return <Gate emoji="💌" title={invite.title} msg="Бұл шақыру әлі белсенді емес. Жарияланғаннан кейін қолжетімді болады." />;

  const d = (invite.data ?? {}) as D;

  // Resolve template: static list first (fast), then DB for admin-created templates
  const newSlug = d.templateSlug ?? d.template ?? null;
  const tmpl = newSlug
    ? (getTemplate(newSlug) ?? (await getDbTemplate(newSlug)) ?? null)
    : null;
  const legacy = THEMES.find((t) => t.id === d.theme) ?? THEMES[0];

  const accent = d.accentColor || tmpl?.accent || legacy.accent;
  const textDark = tmpl?.textDark || legacy.textColor;
  const textMuted = tmpl?.textMuted || (tmpl?.dark ?? legacy.dark ? "rgba(255,255,255,0.55)" : "#78716C");
  const isDark = tmpl?.dark ?? legacy.dark;
  const emoji = tmpl?.emoji || "✨";
  const isZaurePremium = newSlug === "zaure-premium";
  const fontFamily = d.fontFamily === "sans" ? "var(--font-sans)" : "var(--font-serif)";

  // Names
  const name = d.groomName ?? d.person1 ?? invite.title;
  const partner = d.brideName ?? d.person2 ?? null;
  const displayName = partner ? `${name} & ${partner}` : name;
  const location = d.location ?? d.locationName;
  const mapUrl = d.mapLink ?? d.mapUrl;
  const message = d.invitationText ?? d.message;
  const gallery = d.galleryUrls ?? [];

  // Blocks — respect sections ordering if available
  const blocks = resolveEnabledBlocks(d);
  const has = (id: string) => blocks.includes(id);

  // Background
  const bgType = d.bgType || "color";
  const fallbackBg = tmpl?.bg || (isDark ? "#0F1729" : "#FAF8F3");
  const gradient = tmpl?.gradient || legacy.gradient;

  let heroBg: string;
  if (bgType === "gradient") heroBg = d.bgGradient || fallbackBg;
  else if (bgType === "color") heroBg = d.bgColor || fallbackBg;
  else heroBg = fallbackBg;

  // Program items
  const programItems = (d.programItems && d.programItems.length > 0)
    ? d.programItems
    : [
        { time: "18:00", label: "Қонақтарды қарсы алу" },
        { time: "19:00", label: "Сазды кеш" },
        { time: "20:00", label: "Кешкі ас" },
        { time: "21:00", label: "Би кеші" },
      ];

  const cardBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)";
  const cardBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";

  return (
    <div className="min-h-screen" style={{ fontFamily }}>
      {isPreview && (
        <div className="sticky top-0 z-50 text-center text-sm font-semibold py-2 px-4 text-white" style={{ background: "var(--gold-dark)" }}>
          👁 Алдын ала қарау — шақыру жарияланбаған
        </div>
      )}

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
        {/* Background layers */}
        {bgType === "image" && d.bgImageUrl ? (
          <>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${d.bgImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: d.bgBlur ? `blur(${d.bgBlur}px)` : undefined,
                opacity: d.bgOpacity ?? 1,
                transform: "scale(1.05)",
              }}
            />
            {d.bgOverlay && d.bgOverlay !== "rgba(0,0,0,0)" && (
              <div className="absolute inset-0" style={{ background: d.bgOverlay }} />
            )}
          </>
        ) : bgType === "video" && d.bgVideoUrl ? (
          <>
            <video
              className="absolute inset-0 w-full h-full object-cover"
              src={d.bgVideoUrl}
              autoPlay muted loop playsInline
              style={{ opacity: d.bgOpacity ?? 1 }}
            />
            {d.bgOverlay && d.bgOverlay !== "rgba(0,0,0,0)" && (
              <div className="absolute inset-0" style={{ background: d.bgOverlay }} />
            )}
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} style={{ background: heroBg }} />
        )}

        {/* Ambient glow */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle,${accent}20,transparent 70%)` }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle,${accent}15,transparent 70%)` }} />

        {/* Zaure Premium floral corner ornaments */}
        {isZaurePremium && (
          <>
            <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none z-[5]"><ZaureFloralCorner /></div>
            <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none z-[5]"><ZaureFloralCorner mirror /></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 pointer-events-none z-[5]"><ZaureFloralCorner vflip /></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none z-[5]"><ZaureFloralCorner mirror vflip /></div>
          </>
        )}

        <div className="relative z-10 w-full max-w-md mx-auto text-center flex flex-col items-center gap-6">
          {has("hero") && (
            <>
              <span className="text-7xl sm:text-8xl drop-shadow-lg leading-none animate-float">{emoji}</span>
              <p className="label-caps" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)" }}>
                Сізді шақырамыз
              </p>
              <h1 className="heading-display text-4xl sm:text-5xl break-words" style={{ color: textDark }}>
                {displayName}
              </h1>
            </>
          )}

          <div className="flex items-center gap-4 w-full px-4">
            <div className="flex-1 h-px opacity-25" style={{ background: accent }} />
            <span className="opacity-40" style={{ color: accent, fontSize: isZaurePremium ? "0.7rem" : "0.875rem", letterSpacing: isZaurePremium ? "0.35em" : undefined }}>
              {isZaurePremium ? "❀ ✦ ❀" : "◆"}
            </span>
            <div className="flex-1 h-px opacity-25" style={{ background: accent }} />
          </div>

          {has("date") && d.date && (
            <div className="flex flex-col items-center gap-1.5">
              <p className="font-serif text-xl sm:text-2xl font-semibold" style={{ color: textDark }}>{fmt(d.date)}</p>
              {d.time && <p className="text-sm" style={{ color: textMuted }}>Сағат {d.time}</p>}
            </div>
          )}

          {location && (
            <div className="flex flex-col items-center gap-1.5">
              <p className="font-semibold text-base" style={{ color: textDark }}>📍 {location}</p>
              {mapUrl && (
                <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-2 hover:opacity-80" style={{ color: accent }}>
                  Картада ашу ↗
                </a>
              )}
            </div>
          )}

          {has("invitation_text") && message && (
            <div className="w-full rounded-2xl px-6 py-4 text-sm leading-relaxed italic text-center"
              style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)", color: textMuted }}>
              &ldquo;{message}&rdquo;
            </div>
          )}
        </div>

        {has("rsvp") && (
          <div className="absolute bottom-7 inset-x-0 flex flex-col items-center gap-2 pointer-events-none">
            <p className="label-caps text-[9px]" style={{ color: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.22)" }}>Жауап беріңіз</p>
            <div className="w-5 h-8 rounded-full border-2 flex items-start justify-center pt-1.5"
              style={{ borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)" }}>
              <div className="w-1 h-2 rounded-full animate-bounce" style={{ background: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.2)" }} />
            </div>
          </div>
        )}
      </section>

      {/* Zaure Premium ornamental band */}
      {isZaurePremium && (
        <div className="py-3 flex items-center justify-center gap-3" style={{ background: "#F3EDE3" }}>
          <div className="h-px w-12 opacity-20" style={{ background: "#B8925A" }} />
          <p className="text-xs tracking-[0.35em] opacity-30" style={{ color: "#B8925A" }}>✿  ✦  ✿</p>
          <div className="h-px w-12 opacity-20" style={{ background: "#B8925A" }} />
        </div>
      )}

      {/* ── Countdown ── */}
      {has("countdown") && d.date && (
        <section className="py-14 px-4" style={{ background: isDark ? "#1C1917" : "var(--cream)" }}>
          <div className="max-w-md mx-auto text-center">
            <p className="label-caps mb-8" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "var(--gold)" }}>
              Іс-шараға дейін
            </p>
            <Countdown targetDate={d.date} targetTime={d.time} accent={accent} textMuted={isDark ? "rgba(255,255,255,0.4)" : "var(--muted)"} />
          </div>
        </section>
      )}

      {/* ── Love Story ── */}
      {has("love_story") && d.loveStory && (
        <section className="py-14 px-4" style={{ background: "var(--ivory)" }}>
          <div className="max-w-md mx-auto text-center">
            <p className="label-caps mb-5" style={{ color: "var(--gold)" }}>💑 Біздің тарих</p>
            <p className="text-base leading-relaxed" style={{ color: "var(--charcoal)" }}>{d.loveStory}</p>
          </div>
        </section>
      )}

      {/* ── Music ── */}
      {has("music") && d.musicEnabled && d.musicUrl && (
        <section className="py-6" style={{ background: isDark ? "#141110" : "var(--ivory)" }}>
          <MusicPlayer
            url={d.musicUrl}
            title={d.musicTitle ?? undefined}
            accent={accent}
            isDark={isDark}
            textMuted={textMuted}
            loop={d.musicLoop ?? true}
            autoplay={d.musicAutoplay ?? false}
          />
        </section>
      )}

      {/* ── Gallery ── */}
      {has("gallery") && gallery.length > 0 && (
        <section className="py-14 px-4" style={{ background: "var(--ivory)" }}>
          <div className="max-w-2xl mx-auto">
            <p className="label-caps text-center mb-8" style={{ color: "var(--gold)" }}>Галерея</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gallery.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <div key={i} className="aspect-square rounded-2xl overflow-hidden">
                  <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Video ── */}
      {has("video_section") && d.videoUrl && (
        <section className="py-14 px-4" style={{ background: "var(--cream)" }}>
          <div className="max-w-2xl mx-auto">
            <p className="label-caps text-center mb-6" style={{ color: "var(--gold)" }}>🎬 Бейне</p>
            <div className="aspect-video rounded-2xl overflow-hidden">
              <iframe
                src={d.videoUrl.includes("youtube") ? d.videoUrl.replace("watch?v=", "embed/") : d.videoUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Program ── */}
      {has("program") && (
        <section className="py-14 px-4" style={{ background: "var(--cream)" }}>
          <div className="max-w-md mx-auto">
            <p className="label-caps text-center mb-8" style={{ color: "var(--gold)" }}>Бағдарлама</p>
            <div className="flex flex-col gap-0">
              {programItems.map((item, i) => (
                <div key={i} className="flex gap-4 relative">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ background: accent }} />
                    {i < programItems.length - 1 && <div className="w-px flex-1 my-1" style={{ background: `${accent}30` }} />}
                  </div>
                  <div className="pb-5">
                    <p className="text-sm font-semibold font-mono" style={{ color: accent }}>{item.time}</p>
                    <p className="text-sm" style={{ color: "var(--charcoal)" }}>{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Dress Code ── */}
      {has("dress_code") && d.dressCode && (
        <section className="py-12 px-4" style={{ background: "var(--ivory)" }}>
          <div className="max-w-md mx-auto text-center">
            <p className="label-caps mb-4" style={{ color: "var(--gold)" }}>👗 Dress Code</p>
            <div className="rounded-2xl p-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
              <p className="text-base" style={{ color: "var(--charcoal)" }}>{d.dressCode}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Map ── */}
      {has("map") && mapUrl && (
        <section className="py-10 px-4" style={{ background: "var(--ivory)" }}>
          <div className="max-w-md mx-auto text-center">
            <p className="label-caps mb-5" style={{ color: "var(--gold)" }}>Орын</p>
            {location && <p className="text-base font-semibold mb-3" style={{ color: "var(--charcoal)" }}>📍 {location}</p>}
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex">
              Картада ашу ↗
            </a>
          </div>
        </section>
      )}

      {/* ── WhatsApp / Contacts ── */}
      {(has("whatsapp") || has("contacts")) && (d.whatsapp || d.organizerPhone || d.contactsText) && (
        <section className="py-10 px-4" style={{ background: isDark ? "#1C1917" : "var(--cream)" }}>
          <div className="max-w-sm mx-auto text-center flex flex-col items-center gap-4">
            <p className="label-caps" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "var(--gold)" }}>Байланыс</p>
            {d.contactsText && (
              <p className="text-sm" style={{ color: "var(--charcoal)" }}>{d.contactsText}</p>
            )}
            {(d.whatsapp || d.organizerPhone) && (
              <a
                href={`https://wa.me/${(d.whatsapp || d.organizerPhone || "").replace(/\D/g, "")}?text=${encodeURIComponent("Сәлеметсіз бе! Шақыру туралы хабарласып жатырмын.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "#25D366" }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp арқылы жазу
              </a>
            )}
          </div>
        </section>
      )}

      {/* ── Wishes ── */}
      {has("wishes") && (
        <section className="py-12 px-4" style={{ background: "var(--ivory)" }}>
          <div className="max-w-md mx-auto text-center">
            <p className="label-caps mb-4" style={{ color: "var(--gold)" }}>💌 Тілектер</p>
            <div className="rounded-2xl p-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
              <p className="text-sm leading-relaxed" style={{ color: "var(--charcoal)" }}>
                {d.wishesText || "Тілектеріңізді жазыңыз..."}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Gift Info ── */}
      {has("gift_info") && d.giftInfo && (
        <section className="py-12 px-4" style={{ background: "var(--cream)" }}>
          <div className="max-w-md mx-auto text-center">
            <p className="label-caps mb-4" style={{ color: "var(--gold)" }}>🎁 Сыйлық ақпараты</p>
            <div className="rounded-2xl p-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
              <p className="text-sm leading-relaxed font-mono" style={{ color: "var(--charcoal)" }}>{d.giftInfo}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── RSVP ── */}
      {has("rsvp") && (
        <section className="py-14 px-4" style={{ background: "var(--ivory)" }}>
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <p className="label-caps mb-2" style={{ color: "var(--gold)" }}>RSVP</p>
              <h2 className="heading-display text-3xl mb-2" style={{ color: "var(--charcoal)" }}>Қатысасыз ба?</h2>
              <p className="text-sm" style={{ color: "var(--muted)" }}>{d.rsvpText || "Жауабыңызды жіберіңіз"}</p>
            </div>

            {invite.status === "PUBLISHED" ? (
              <RSVPForm inviteId={invite.id} accent={accent} />
            ) : (
              <div className="rounded-2xl p-10 text-center" style={{ border: "1px dashed var(--border)", background: "white" }}>
                <p className="text-sm" style={{ color: "var(--muted)" }}>RSVP пішіні жарияланғаннан кейін белсенді болады</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="py-8 px-4 text-center text-xs" style={{ background: "var(--charcoal)", color: "#4A4440" }}>
        Шақыру · Қазақстандық премиум цифрлы шақыру сервисі ·{" "}
        <Link href="/" style={{ color: "var(--gold)" }}>Өз шақыруыңызды жасаңыз →</Link>
      </footer>
    </div>
  );
}
