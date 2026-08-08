import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listInvites, type InviteWithCount } from "@/lib/data/invites";
import { resolveLang, type Lang } from "@/lib/i18n";
import { buildLoginUrl } from "@/lib/auth-redirect";
import { getAppOrigin } from "@/lib/site-url";
import { DeleteInviteButton } from "@/components/dashboard/DeleteInviteButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Менің шақыруларым — Шақыру" };

const STATUS_MAP = {
  kk: {
    DRAFT: { label: "Жоба", bg: "rgba(28,25,23,0.06)", color: "var(--muted)" },
    PENDING_PAYMENT: { label: "Төлем күтілуде", bg: "rgba(196,150,62,0.1)", color: "var(--gold-dark)" },
    PAID: { label: "Төленді", bg: "rgba(196,150,62,0.15)", color: "var(--gold)" },
    PUBLISHED: { label: "Жарияланды", bg: "rgba(34,197,94,0.1)", color: "#16a34a" },
    EXPIRED: { label: "Мерзімі өтті", bg: "rgba(239,68,68,0.08)", color: "#dc2626" },
    CANCELLED: { label: "Бекерленді", bg: "rgba(113,113,122,0.1)", color: "#71717a" },
  },
  ru: {
    DRAFT: { label: "Черновик", bg: "rgba(28,25,23,0.06)", color: "var(--muted)" },
    PENDING_PAYMENT: { label: "Ожидает оплаты", bg: "rgba(196,150,62,0.1)", color: "var(--gold-dark)" },
    PAID: { label: "Оплачено", bg: "rgba(196,150,62,0.15)", color: "var(--gold)" },
    PUBLISHED: { label: "Опубликовано", bg: "rgba(34,197,94,0.1)", color: "#16a34a" },
    EXPIRED: { label: "Срок истёк", bg: "rgba(239,68,68,0.08)", color: "#dc2626" },
    CANCELLED: { label: "Отменено", bg: "rgba(113,113,122,0.1)", color: "#71717a" },
  },
} as const;

const T = {
  kk: {
    heading: "Менің шақыруларым",
    newBtn: "+ Жаңа",
    statTotal: "Барлығы",
    statPublished: "Жарияланды",
    statGuests: "Қонақ жауабы",
    noRsvp: "Жауап жоқ",
    edit: "Редакторлау",
    manage: "Басқару",
    emptyTitle: "Шақырулар жоқ",
    emptyDesc: "Алғашқы шақыруыңызды жасаңыз",
    emptyCta: "✨ Жаңа шақыру жасау",
    today: "Бүгін",
    yesterday: "Кеше",
    daysAgo: (n: number) => `${n} күн бұрын`,
    weeksAgo: (n: number) => `${n} апта бұрын`,
  },
  ru: {
    heading: "Мои приглашения",
    newBtn: "+ Новое",
    statTotal: "Всего",
    statPublished: "Опубликовано",
    statGuests: "Ответы гостей",
    noRsvp: "Нет ответов",
    edit: "Редактировать",
    manage: "Управление",
    emptyTitle: "Приглашений пока нет",
    emptyDesc: "Создайте своё первое приглашение",
    emptyCta: "✨ Создать приглашение",
    today: "Сегодня",
    yesterday: "Вчера",
    daysAgo: (n: number) => `${n} дн. назад`,
    weeksAgo: (n: number) => `${n} нед. назад`,
  },
} as const;

function relativeDate(date: Date, lang: Lang): string {
  const t = T[lang];
  const diff = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diff === 0) return t.today;
  if (diff === 1) return t.yesterday;
  if (diff < 7) return t.daysAgo(diff);
  if (diff < 30) return t.weeksAgo(Math.floor(diff / 7));
  return date.toLocaleDateString(lang === "ru" ? "ru-RU" : "kk-KZ");
}

function InviteCard({
  invite,
  appUrl,
  lang,
}: {
  invite: InviteWithCount;
  appUrl: string;
  lang: Lang;
}) {
  const t = T[lang];
  const shareUrl = `${appUrl}/i/${invite.slug}`;
  const st =
    STATUS_MAP[lang][invite.status as keyof typeof STATUS_MAP["kk"]] ??
    STATUS_MAP[lang].DRAFT;

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 transition-all hover:shadow-md"
      style={{
        background: "white",
        border: "1px solid var(--border)",
        boxShadow: "0 2px 12px rgba(28,25,23,0.04)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold truncate"
            style={{ color: "var(--charcoal)" }}
          >
            {invite.title}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {relativeDate(invite.createdAt, lang)} ·{" "}
            {invite._count.guests === 0
              ? t.noRsvp
              : `${invite._count.guests} RSVP`}
          </p>
        </div>
        <span
          className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: st.bg, color: st.color }}
        >
          {st.label}
        </span>
      </div>

      <div
        className="text-xs font-mono truncate px-3 py-2 rounded-xl"
        style={{ background: "var(--cream)", color: "var(--muted)" }}
      >
        {shareUrl}
      </div>

      <div className="flex gap-2 pt-1">
        <Link
          href={`/edit/${invite.id}?lang=${lang}`}
          className="flex-1 text-center py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: "var(--cream)",
            color: "var(--charcoal)",
            border: "1px solid var(--border)",
          }}
        >
          {t.edit}
        </Link>
        <Link
          href={`/dashboard/invites/${invite.id}?lang=${lang}`}
          className="flex-1 text-center py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "var(--charcoal)" }}
        >
          {t.manage}
        </Link>
        <DeleteInviteButton
          inviteId={invite.id}
          lang={lang}
          className="flex-1 text-center py-2 rounded-xl text-sm font-medium transition-all"
        />
      </div>
    </div>
  );
}

function EmptyState({ lang }: { lang: Lang }) {
  const t = T[lang];
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
      <div
        className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
        style={{
          background: "rgba(196,150,62,0.06)",
          border: "1px solid rgba(196,150,62,0.15)",
        }}
      >
        💌
      </div>
      <div>
        <p
          className="font-serif text-xl font-semibold mb-2"
          style={{ color: "var(--charcoal)" }}
        >
          {t.emptyTitle}
        </p>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {t.emptyDesc}
        </p>
      </div>
      <Link href={`/templates?lang=${lang}`} className="btn-gold">
        {t.emptyCta}
      </Link>
    </div>
  );
}

interface Props {
  searchParams: Promise<{ lang?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);
  const t = T[lang];

  const session = await getSession();
  if (!session) redirect(buildLoginUrl({ from: `/dashboard?lang=${lang}`, lang }));
  const invites = await listInvites(session.userId);
  const appUrl = await getAppOrigin();

  // Canonical stat definitions (see the audit report — keep these in sync
  // with the Manage page's own RSVP summary, which reads the same rows):
  //   "Барлығы"      total invitations owned by this user, any status.
  //   "Жарияланды"   invitations currently PUBLISHED.
  //   "Қонақ жауабы" total Guest rows (= submitted RSVP responses, any
  //                  attending/declined/undecided status) across every
  //                  invitation this user owns. Real DB data, never
  //                  hardcoded — invite._count.guests comes straight from
  //                  listInvites()'s Prisma query.
  const stats = {
    total: invites.length,
    published: invites.filter((i) => i.status === "PUBLISHED").length,
    guests: invites.reduce((s, i) => s + i._count.guests, 0),
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1
          className="heading-display text-3xl"
          style={{ color: "var(--charcoal)" }}
        >
          {t.heading}
        </h1>
        <Link href={`/templates?lang=${lang}`} className="btn-gold text-sm">
          {t.newBtn}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: t.statTotal, value: stats.total },
          { label: t.statPublished, value: stats.published },
          { label: t.statGuests, value: stats.guests },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-4 text-center"
            style={{
              background: "white",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 12px rgba(28,25,23,0.04)",
            }}
          >
            <p
              className="font-serif text-3xl font-bold"
              style={{ color: "var(--charcoal)" }}
            >
              {s.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Invite list */}
      {invites.length === 0 ? (
        <EmptyState lang={lang} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {invites.map((invite) => (
            <InviteCard key={invite.id} invite={invite} appUrl={appUrl} lang={lang} />
          ))}
        </div>
      )}
    </main>
  );
}
