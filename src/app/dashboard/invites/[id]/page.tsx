import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getInvite } from "@/lib/data/invites";
import { getProductSettings } from "@/lib/product";
import { db } from "@/lib/db";
import { StaticInviteCard } from "@/components/StaticInviteCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { PaymentFlow } from "@/components/payment/PaymentFlow";
import { EVENT_TYPES, THEMES, TEMPLATES } from "@/types/invite";
import { buildLoginUrl } from "@/lib/auth-redirect";
import { getAppOrigin } from "@/lib/site-url";
import { resolveLang, type Lang } from "@/lib/i18n";
import { getCheckoutProviders } from "@/lib/payment-providers";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
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

const T = {
  kk: {
    breadcrumb: "Менің шақыруларым",
    slug: "Сілтеме атауы:",
    shareLinkTitle: "Жариялау сілтемесі",
    notActiveYet: "Сілтеме белсенді болуы үшін шақыруды жариялаңыз",
    guestResponsesTitle: "Қонақ жауабы",
    detailsTitle: "Мәліметтер",
    eventType: "Іс-шара",
    subject: "Тақырып",
    date: "Күні",
    time: "Уақыты",
    timeValue: (t: string) => `Сағат ${t}`,
    place: "Орны",
    theme: "Тема",
    messageLabel: "Хабарлама",
    createdAt: "Жасалған",
    expiresAt: "Мерзімі бітеді",
    guestsTitle: "Қонақтар",
    noResponsesYet: "Әлі RSVP жауабы жоқ",
    coming: "Барады",
    maybe: "Белгісіз",
    notComing: "Бармайды",
    peopleSuffix: "адам",
    published: "Шақыру жарияланған",
    previewLink: "Алдын ала қарау ↗",
    back: "← Менің шақыруларым",
    locale: "kk-KZ",
  },
  ru: {
    breadcrumb: "Мои приглашения",
    slug: "Название ссылки:",
    shareLinkTitle: "Ссылка для публикации",
    notActiveYet: "Опубликуйте приглашение, чтобы ссылка стала активной",
    guestResponsesTitle: "Ответы гостей",
    detailsTitle: "Детали",
    eventType: "Мероприятие",
    subject: "Тема",
    date: "Дата",
    time: "Время",
    timeValue: (t: string) => `${t}`,
    place: "Место",
    theme: "Оформление",
    messageLabel: "Сообщение",
    createdAt: "Создано",
    expiresAt: "Истекает",
    guestsTitle: "Гости",
    noResponsesYet: "Пока нет ответов RSVP",
    coming: "Придут",
    maybe: "Не определились",
    notComing: "Не придут",
    peopleSuffix: "чел.",
    published: "Приглашение опубликовано",
    previewLink: "Предпросмотр ↗",
    back: "← Мои приглашения",
    locale: "ru-RU",
  },
} as const;

const GUEST_STATUS_LABEL: Record<Lang, Record<"COMING" | "NOT_COMING" | "MAYBE", string>> = {
  kk: { COMING: "Барады", NOT_COMING: "Бармайды", MAYBE: "Белгісіз" },
  ru: { COMING: "Придёт", NOT_COMING: "Не придёт", MAYBE: "Не определился" },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession();
  if (!session) return {};
  const invite = await getInvite(id, session.userId, session.role);
  return { title: invite ? `${invite.title} — Шақыру` : "Шақыру" };
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

export default async function InviteDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);
  const t = T[lang];

  // This route is already protected twice over (proxy.ts's /dashboard/:path*
  // matcher, and dashboard/layout.tsx's own getSession() check), so this
  // should never actually redirect in practice — but defense-in-depth means
  // this page defends itself too, rather than trusting an assertion.
  const session = await getSession();
  if (!session) redirect(buildLoginUrl({ from: `/dashboard/invites/${id}?lang=${lang}`, lang }));

  const [invite, product, checkoutProviders] = await Promise.all([
    getInvite(id, session.userId, session.role),
    getProductSettings(),
    getCheckoutProviders(),
  ]);
  if (!invite) notFound();

  const guests = await db.guest.findMany({
    where: { inviteId: invite.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const data = (invite.data ?? {}) as StoredData;
  const appUrl = await getAppOrigin();
  const shareUrl = `${appUrl}/i/${invite.slug}`;

  const eventLabel = EVENT_TYPES.find((e) => e.value === data.eventType)?.label;
  const themeLabel =
    TEMPLATES.find((tm) => tm.id === data.template)?.name ??
    THEMES.find((tm) => tm.id === data.theme)?.name;

  const locationDisplay = data.location ?? data.locationName;

  // RSVP summary: attending/declined/unanswered counts (by party size) plus
  // total responses — the SAME Guest rows the dashboard's "Қонақ жауабы"
  // stat is derived from (see dashboard/page.tsx), just broken down here.
  const rsvpSummary = [
    { label: t.coming, value: guests.filter((g) => g.status === "COMING").reduce((s, g) => s + g.peopleCount, 0), color: "text-emerald-600" },
    { label: t.maybe, value: guests.filter((g) => g.status === "MAYBE").reduce((s, g) => s + g.peopleCount, 0), color: "text-amber-600" },
    { label: t.notComing, value: guests.filter((g) => g.status === "NOT_COMING").reduce((s, g) => s + g.peopleCount, 0), color: "text-red-500" },
  ] as const;

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Link href={`/dashboard?lang=${lang}`} className="hover:text-zinc-700 transition-colors">
          {t.breadcrumb}
        </Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium truncate">{invite.title}</span>
      </div>

      {/* Title + status */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{invite.title}</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {t.slug}{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">
              {invite.slug}
            </code>
          </p>
        </div>
        <StatusBadge status={invite.status} lang={lang} />
      </div>

      {/* Preview + share */}
      <div className="grid sm:grid-cols-2 gap-5 items-start">
        <div className="max-w-[200px] mx-auto sm:mx-0">
          <StaticInviteCard data={data} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              {t.shareLinkTitle}
            </p>
            <div className="flex items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2.5 mb-3">
              <span className="text-xs text-zinc-500 font-mono truncate flex-1">
                {shareUrl}
              </span>
            </div>
            <CopyButton text={shareUrl} className="w-full justify-center" />
            {invite.status !== "PUBLISHED" && (
              <p className="text-xs text-zinc-400 mt-2 text-center">
                {t.notActiveYet}
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              {t.guestsTitle}
            </p>
            <p className="text-3xl font-bold text-zinc-900">{invite._count.guests}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{t.guestResponsesTitle}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
          {t.detailsTitle}
        </p>
        <DetailRow label={t.eventType} value={eventLabel} />
        <DetailRow label={t.subject} value={invite.title} />
        <DetailRow
          label={t.date}
          value={
            data.date
              ? new Date(data.date).toLocaleDateString(t.locale, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : undefined
          }
        />
        <DetailRow label={t.time} value={data.time ? t.timeValue(data.time) : undefined} />
        <DetailRow label={t.place} value={locationDisplay} />
        <DetailRow label={t.theme} value={themeLabel} />
        {(data.invitationText ?? data.message) && (
          <DetailRow label={t.messageLabel} value={data.invitationText ?? data.message} />
        )}
        <DetailRow
          label={t.createdAt}
          value={invite.createdAt.toLocaleDateString(t.locale, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        />
        {invite.expiresAt && (
          <DetailRow
            label={t.expiresAt}
            value={invite.expiresAt.toLocaleDateString(t.locale, {
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
            {t.guestsTitle}
            {guests.length > 0 && (
              <span className="ml-2 text-sm font-normal text-zinc-400">
                ({guests.length})
              </span>
            )}
          </h2>
        </div>

        {guests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 p-8 text-center">
            <p className="text-sm text-zinc-400">{t.noResponsesYet}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-zinc-50 border-b border-zinc-50">
              {rsvpSummary.map((s) => (
                <div key={s.label} className="p-3 text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="divide-y divide-zinc-50">
              {guests.map((g) => {
                const statusCls = {
                  COMING: "bg-emerald-100 text-emerald-700",
                  NOT_COMING: "bg-red-100 text-red-600",
                  MAYBE: "bg-amber-100 text-amber-700",
                } as const;
                const key = g.status as keyof typeof statusCls;
                const label = GUEST_STATUS_LABEL[lang][key] ?? g.status;
                const cls = statusCls[key] ?? "bg-zinc-100 text-zinc-500";
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
                        {g.peopleCount} {t.peopleSuffix}
                      </span>
                    )}
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}
                    >
                      {label}
                    </span>
                    <span className="text-[10px] text-zinc-300 tabular-nums hidden sm:block shrink-0">
                      {g.createdAt.toLocaleDateString(t.locale, {
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

      {/* Payment / publish flow — EXPIRED is included because it's still a
          PAYABLE_STATUS server-side (see /api/payments/create): renewing
          simply pays again the same way an unpaid DRAFT does. */}
      {invite.status === "DRAFT" || invite.status === "PENDING_PAYMENT" || invite.status === "EXPIRED" ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <PaymentFlow
            inviteId={invite.id}
            inviteTitle={invite.title}
            currentStatus={invite.status}
            price={product.price}
            lang={lang}
            providers={checkoutProviders}
          />
        </div>
      ) : invite.status === "PUBLISHED" ? (
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold text-emerald-700">
            {t.published}
          </p>
          <Link
            href={`/i/${invite.slug}?preview=1`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            {t.previewLink}
          </Link>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Link
          href={`/dashboard?lang=${lang}`}
          className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          {t.back}
        </Link>
      </div>
    </main>
  );
}
