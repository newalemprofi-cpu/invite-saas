import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getInvite } from "@/lib/data/invites";
import { getProductSettings } from "@/lib/product";
import { db } from "@/lib/db";
import { StaticInviteCard } from "@/components/StaticInviteCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { PaymentFlow } from "@/components/payment/PaymentFlow";
import { EVENT_TYPES, THEMES, TEMPLATES } from "@/types/invite";

interface Props {
  params: Promise<{ id: string }>;
}

interface StoredData {
  eventType?: string;
  date?: string;
  time?: string;
  // New field names
  template?: string | null;
  groomName?: string | null;
  brideName?: string | null;
  location?: string | null;
  mapLink?: string | null;
  invitationText?: string | null;
  enabledBlocks?: string[];
  // Legacy field names
  person1?: string | null;
  person2?: string | null;
  locationName?: string | null;
  mapUrl?: string | null;
  theme?: string | null;
  message?: string | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return {};
  const invite = await getInvite(id, session.userId, session.role);
  return { title: invite ? `${invite.title} — Dashboard` : "Шақыру" };
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-3 border-b border-zinc-50 last:border-0">
      <span className="text-xs text-zinc-400 shrink-0 w-28">{label}</span>
      <span className="text-sm text-zinc-800 text-right break-words">{value}</span>
    </div>
  );
}

export default async function InviteDetailPage({ params }: Props) {
  const { id } = await params;

  const session = (await getSession())!;
  const [invite, product] = await Promise.all([
    getInvite(id, session.userId, session.role),
    getProductSettings(),
  ]);
  if (!invite) notFound();

  const guests = await db.guest.findMany({
    where: { inviteId: invite.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const data = (invite.data ?? {}) as StoredData;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const shareUrl = `${appUrl}/i/${invite.slug}`;

  const eventLabel = EVENT_TYPES.find((e) => e.value === data.eventType)?.label;
  const themeLabel =
    TEMPLATES.find((t) => t.id === data.template)?.name ??
    THEMES.find((t) => t.id === data.theme)?.name;

  const locationDisplay = data.location ?? data.locationName;

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/dashboard" className="hover:text-zinc-700 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium truncate">{invite.title}</span>
      </div>

      {/* Title + status */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{invite.title}</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Slug:{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">
              {invite.slug}
            </code>
          </p>
        </div>
        <StatusBadge status={invite.status} />
      </div>

      {/* Preview + share */}
      <div className="grid sm:grid-cols-2 gap-5 items-start">
        <div className="max-w-[200px] mx-auto sm:mx-0">
          <StaticInviteCard data={data} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Жариялау сілтемесі
            </p>
            <div className="flex items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2.5 mb-3">
              <span className="text-xs text-zinc-500 font-mono truncate flex-1">
                {shareUrl}
              </span>
            </div>
            <CopyButton text={shareUrl} className="w-full justify-center" />
            {invite.status !== "PUBLISHED" && (
              <p className="text-xs text-zinc-400 mt-2 text-center">
                Сілтеме белсенді болуы үшін шақыруды жарияланғын
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Қонақтар
            </p>
            <p className="text-3xl font-bold text-zinc-900">{invite._count.guests}</p>
            <p className="text-xs text-zinc-400 mt-0.5">RSVP жауабы</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
          Мәліметтер
        </p>
        <DetailRow label="Іс-шара" value={eventLabel} />
        <DetailRow label="Тақырып" value={invite.title} />
        <DetailRow
          label="Күні"
          value={
            data.date
              ? new Date(data.date).toLocaleDateString("kk-KZ", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : undefined
          }
        />
        <DetailRow label="Уақыты" value={data.time ? `Сағат ${data.time}` : undefined} />
        <DetailRow label="Орны" value={locationDisplay} />
        <DetailRow label="Тема" value={themeLabel} />
        {(data.invitationText ?? data.message) && (
          <DetailRow label="Хабарлама" value={data.invitationText ?? data.message} />
        )}
        <DetailRow
          label="Жасалған"
          value={invite.createdAt.toLocaleDateString("kk-KZ", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        />
        {invite.expiresAt && (
          <DetailRow
            label="Мерзімі бітеді"
            value={invite.expiresAt.toLocaleDateString("kk-KZ", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        )}
      </div>

      {/* Guest list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-zinc-900">
            Қонақтар
            {guests.length > 0 && (
              <span className="ml-2 text-sm font-normal text-zinc-400">
                ({guests.length})
              </span>
            )}
          </h2>
        </div>

        {guests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 p-8 text-center">
            <p className="text-sm text-zinc-400">Әлі RSVP жауабы жоқ</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-zinc-50 border-b border-zinc-50">
              {(
                [
                  {
                    label: "Барады",
                    value: guests
                      .filter((g) => g.status === "COMING")
                      .reduce((s, g) => s + g.peopleCount, 0),
                    color: "text-emerald-600",
                  },
                  {
                    label: "Белгісіз",
                    value: guests
                      .filter((g) => g.status === "MAYBE")
                      .reduce((s, g) => s + g.peopleCount, 0),
                    color: "text-amber-600",
                  },
                  {
                    label: "Бармайды",
                    value: guests
                      .filter((g) => g.status === "NOT_COMING")
                      .reduce((s, g) => s + g.peopleCount, 0),
                    color: "text-red-500",
                  },
                ] as const
              ).map((s) => (
                <div key={s.label} className="p-3 text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="divide-y divide-zinc-50">
              {guests.map((g) => {
                const statusMap = {
                  COMING: { label: "Барады", cls: "bg-emerald-100 text-emerald-700" },
                  NOT_COMING: { label: "Бармайды", cls: "bg-red-100 text-red-600" },
                  MAYBE: { label: "Белгісіз", cls: "bg-amber-100 text-amber-700" },
                } as const;
                const st =
                  statusMap[g.status as keyof typeof statusMap] ?? {
                    label: g.status,
                    cls: "bg-zinc-100 text-zinc-500",
                  };
                return (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {g.name}
                      </p>
                      {g.phone && (
                        <p className="text-xs text-zinc-400 mt-0.5">{g.phone}</p>
                      )}
                      {g.note && (
                        <p className="text-xs text-zinc-400 italic truncate mt-0.5">
                          &ldquo;{g.note}&rdquo;
                        </p>
                      )}
                    </div>
                    {g.peopleCount > 1 && (
                      <span className="text-xs text-zinc-400 tabular-nums shrink-0">
                        {g.peopleCount} адам
                      </span>
                    )}
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}
                    >
                      {st.label}
                    </span>
                    <span className="text-[10px] text-zinc-300 tabular-nums hidden sm:block shrink-0">
                      {g.createdAt.toLocaleDateString("kk-KZ", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Payment / publish flow */}
      {invite.status === "DRAFT" || invite.status === "PENDING_PAYMENT" ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <PaymentFlow
            inviteId={invite.id}
            inviteTitle={invite.title}
            currentStatus={invite.status}
            price={product.price}
            kaspiLink={product.kaspiPaymentLink}
          />
        </div>
      ) : invite.status === "PUBLISHED" ? (
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold text-emerald-700">
            Шақыру жарияланған
          </p>
          <Link
            href={`/i/${invite.slug}?preview=1`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Алдын ала қарау ↗
          </Link>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          ← Dashboard
        </Link>
      </div>
    </main>
  );
}
