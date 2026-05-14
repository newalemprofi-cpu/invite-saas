import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { EVENT_TYPES, THEMES } from "@/types/invite";
import { cn } from "@/lib/utils";
import { RSVPForm } from "./RSVPForm";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoredData {
  eventType?: string;
  person1?: string;
  person2?: string | null;
  date?: string;
  time?: string;
  locationName?: string;
  mapUrl?: string | null;
  theme?: string;
  message?: string | null;
}

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const invite = await db.invite.findUnique({
    where: { slug },
    select: { title: true },
  });
  if (!invite) return {};
  return {
    title: `${invite.title} — Шақыру`,
    description: `Сізді ${invite.title} шарасына шақырамыз`,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("kk-KZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Inactive / expired states ───────────────────────────────────────────────

function NotActive({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-4 text-center gap-5">
      <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-4xl">
        💌
      </div>
      <div>
        <h1 className="text-xl font-bold text-zinc-900">{title}</h1>
        <p className="text-zinc-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
          Бұл шақыру әлі белсенді емес.
          <br />
          Жарияланғаннан кейін қолжетімді болады.
        </p>
      </div>
      <Link
        href="/"
        className="text-sm text-rose-500 hover:text-rose-600 font-medium transition-colors"
      >
        Өз шақыруыңызды жасаңыз →
      </Link>
    </div>
  );
}

function Expired({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-4 text-center gap-5">
      <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-4xl">
        ⏳
      </div>
      <div>
        <h1 className="text-xl font-bold text-zinc-900">{title}</h1>
        <p className="text-zinc-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
          Бұл шақырудың мерзімі аяқталды.
          <br />
          RSVP қабылдау тоқтатылды.
        </p>
      </div>
      <Link
        href="/"
        className="text-sm text-rose-500 hover:text-rose-600 font-medium transition-colors"
      >
        Өз шақыруыңызды жасаңыз →
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicInvitePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;

  const invite = await db.invite.findUnique({ where: { slug } });
  if (!invite) notFound();

  // Owner preview mode — user must be logged in and own the invite
  let isPreview = false;
  if (preview === "1") {
    const session = await getSession();
    isPreview =
      session?.userId === invite.userId || session?.role === "ADMIN";
  }

  // Runtime expiry check: catch the window before the cron job runs.
  // Only treat PUBLISHED invites as runtime-expired — DRAFT/PENDING_PAYMENT invites
  // should show "Not Active", not "Expired", even after their creation-time expiresAt passes.
  const now = new Date();
  const isExpired =
    invite.status === "EXPIRED" ||
    (invite.status === "PUBLISHED" &&
      invite.expiresAt !== null &&
      invite.expiresAt < now);

  if (isExpired && !isPreview) {
    return <Expired title={invite.title} />;
  }

  if (invite.status !== "PUBLISHED" && !isPreview) {
    return <NotActive title={invite.title} />;
  }

  const data = (invite.data ?? {}) as StoredData;
  const theme = THEMES.find((t) => t.id === data.theme) ?? THEMES[0];
  const eventType = EVENT_TYPES.find((e) => e.value === data.eventType);

  return (
    <div className="min-h-screen">
      {/* Preview banner */}
      {isPreview && (
        <div className="sticky top-0 z-50 bg-amber-500 text-white text-center text-sm font-semibold py-2 px-4">
          👁 Алдын ала қарау — шақыру әлі жарияланбаған
        </div>
      )}

      {/* ── Hero section ────────────────────────────────────────────────── */}
      <section
        className={cn(
          "relative min-h-screen flex flex-col items-center justify-center px-5 py-20 overflow-hidden",
          `bg-gradient-to-br ${theme.gradient}`
        )}
      >
        {/* Background blobs */}
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ backgroundColor: theme.accent }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ backgroundColor: theme.accent }}
        />

        {/* Kazakh Heritage border stripes */}
        {data.theme === "KAZAKH" && (
          <>
            <div className="absolute top-0 inset-x-0 h-3 bg-amber-400 pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-3 bg-amber-400 pointer-events-none" />
          </>
        )}

        {/* Content */}
        <div className="relative z-10 w-full max-w-lg mx-auto text-center flex flex-col items-center gap-6">
          {/* Event emoji */}
          <span className="text-6xl sm:text-7xl drop-shadow-md leading-none">
            {eventType?.emoji ?? "✨"}
          </span>

          {/* Invited label */}
          <p
            className="text-[11px] tracking-[0.45em] uppercase font-semibold"
            style={{
              color: theme.dark
                ? "rgba(255,255,255,0.5)"
                : "rgba(0,0,0,0.38)",
            }}
          >
            Сізді шақырамыз
          </p>

          {/* Title */}
          <h1
            className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight break-words"
            style={{ color: theme.textColor }}
          >
            {invite.title}
          </h1>

          {/* Ornamental divider */}
          <div className="flex items-center gap-5 w-full px-8">
            <div
              className="flex-1 h-px opacity-20"
              style={{ backgroundColor: theme.accent }}
            />
            <span
              className="text-base opacity-60"
              style={{ color: theme.accent }}
            >
              ◆
            </span>
            <div
              className="flex-1 h-px opacity-20"
              style={{ backgroundColor: theme.accent }}
            />
          </div>

          {/* Event details */}
          <div className="flex flex-col gap-4 w-full max-w-sm">
            {data.date && (
              <div className="flex items-start gap-4 text-left">
                <span className="text-2xl leading-none shrink-0 mt-0.5">📅</span>
                <div>
                  <p
                    className="font-semibold text-base leading-snug"
                    style={{ color: theme.textColor }}
                  >
                    {formatDate(data.date)}
                  </p>
                  {data.time && (
                    <p
                      className="text-sm mt-0.5"
                      style={{
                        color: theme.dark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.5)",
                      }}
                    >
                      Сағат {data.time}
                    </p>
                  )}
                </div>
              </div>
            )}

            {data.locationName && (
              <div className="flex items-start gap-4 text-left">
                <span className="text-2xl leading-none shrink-0 mt-0.5">📍</span>
                <div>
                  <p
                    className="font-semibold text-base leading-snug"
                    style={{ color: theme.textColor }}
                  >
                    {data.locationName}
                  </p>
                  {data.mapUrl && (
                    <a
                      href={data.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm mt-0.5 inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80 transition-opacity"
                      style={{ color: theme.accent }}
                    >
                      Картада ашу
                      <svg
                        className="w-3 h-3"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Personal message */}
          {data.message && (
            <div
              className="w-full max-w-sm rounded-2xl px-6 py-4 text-sm leading-relaxed italic text-center"
              style={{
                backgroundColor: theme.dark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.05)",
                color: theme.textColor,
              }}
            >
              &ldquo;{data.message}&rdquo;
            </div>
          )}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-7 inset-x-0 flex flex-col items-center gap-1.5 pointer-events-none">
          <p
            className="text-[10px] tracking-[0.35em] uppercase font-medium"
            style={{
              color: theme.dark
                ? "rgba(255,255,255,0.35)"
                : "rgba(0,0,0,0.28)",
            }}
          >
            RSVP
          </p>
          <div
            className="w-5 h-8 rounded-full border-2 flex items-start justify-center pt-1.5"
            style={{
              borderColor: theme.dark
                ? "rgba(255,255,255,0.25)"
                : "rgba(0,0,0,0.2)",
            }}
          >
            <div
              className="w-1 h-2 rounded-full animate-bounce"
              style={{
                backgroundColor: theme.dark
                  ? "rgba(255,255,255,0.35)"
                  : "rgba(0,0,0,0.25)",
              }}
            />
          </div>
        </div>
      </section>

      {/* ── RSVP section ────────────────────────────────────────────────── */}
      <section className="bg-zinc-50 px-4 py-14">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-zinc-900">
              Қатысасыз ба?
            </h2>
            <p className="text-sm text-zinc-500 mt-1.5">
              Жауабыңызды жіберіп, ойыңызды бізбен бөлісіңіз
            </p>
          </div>

          {invite.status === "PUBLISHED" ? (
            <RSVPForm inviteId={invite.id} />
          ) : (
            // Preview mode — show disabled form placeholder
            <div className="bg-white rounded-2xl border border-dashed border-zinc-200 p-10 text-center">
              <p className="text-sm text-zinc-400">
                RSVP пішіні жарияланғаннан кейін белсенді болады
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-zinc-100 py-6">
        <p className="text-center text-xs text-zinc-400">
          Онлайн шақыру сервисі ·{" "}
          <Link
            href="/"
            className="text-rose-400 hover:text-rose-500 transition-colors"
          >
            Шақыру
          </Link>
        </p>
      </footer>
    </div>
  );
}
