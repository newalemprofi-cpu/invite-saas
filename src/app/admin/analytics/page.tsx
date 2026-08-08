import type { Metadata } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Аналитика — Admin" };

const MODE_LABELS: Record<string, string> = {
  romantic: "❤️ Романтикалық", kazakh: "🇰🇿 Қазақша", modern: "✨ Заманауи",
  rsvp: "RSVP", thanks: "Алғыс", welcome: "Қарсы алу", reminder: "Еске салу",
  suggest_colors: "🎨 Түс", suggest_music: "🎵 Музыка", suggest_template: "Шаблон",
  explain_editor: "🧠 Редактор", chat: "💬 Сөйлесу", full: "✨ Толық генерация",
};

export default async function AnalyticsPage() {
  const [
    invites,
    guests,
    payments,
    topViewed,
    topRSVP,
    recentSignups,
    aiLogs,
    rsvpInvites,
  ] = await Promise.all([
    db.invite.groupBy({ by: ["status"], _count: { id: true } }),
    db.guest.groupBy({ by: ["status"], _count: { id: true } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
    db.invite.findMany({
      orderBy: { viewCount: "desc" },
      take: 5,
      select: { id: true, title: true, slug: true, viewCount: true, _count: { select: { guests: true } } },
    }),
    db.invite.findMany({
      orderBy: { guests: { _count: "desc" } },
      take: 5,
      select: { id: true, title: true, slug: true, viewCount: true, _count: { select: { guests: true } } },
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 7,
      select: { id: true, email: true, name: true, createdAt: true, role: true, _count: { select: { invites: true } } },
    }),
    db.auditLog.findMany({
      where: { action: "ai_query" },
      orderBy: { createdAt: "desc" },
      take: 2000,
      include: { user: { select: { id: true, email: true, name: true } } },
    }),
    // RSVP prediction: published invites with at least 1 guest
    db.invite.findMany({
      where: { status: "PUBLISHED", guests: { some: {} } },
      orderBy: { guests: { _count: "desc" } },
      take: 15,
      select: {
        id: true, title: true, slug: true,
        guests: { select: { status: true } },
        _count: { select: { guests: true } },
      },
    }),
  ]);

  const totalRevenue = Number(payments._sum.amount ?? 0);
  const statusMap = Object.fromEntries(invites.map((i) => [i.status, i._count.id]));
  const guestMap = Object.fromEntries(guests.map((g) => [g.status, g._count.id]));

  // ── RSVP prediction ───────────────────────────────────────────────
  const rsvpRows = rsvpInvites.map((inv) => {
    const coming = inv.guests.filter((g) => g.status === "COMING").length;
    const maybe = inv.guests.filter((g) => g.status === "MAYBE").length;
    const notComing = inv.guests.filter((g) => g.status === "NOT_COMING").length;
    const total = inv._count.guests;
    const likelyComing = coming + Math.round(maybe * 0.5);
    const rsvpRate = total > 0 ? Math.round(((coming + maybe + notComing) / total) * 100) : 0;
    return { title: inv.title, slug: inv.slug, total, coming, maybe, notComing, likelyComing, rsvpRate };
  });
  const globalExpected = rsvpRows.reduce((s, r) => s + r.total, 0);
  const globalLikely = rsvpRows.reduce((s, r) => s + r.likelyComing, 0);
  const avgRsvpRate = rsvpRows.length > 0 ? Math.round(rsvpRows.reduce((s, r) => s + r.rsvpRate, 0) / rsvpRows.length) : 0;

  // ── AI analytics ──────────────────────────────────────────────────
  type AiMeta = { type?: string; inputTokens?: number; outputTokens?: number; total?: number; date?: string };

  const totalAiQueries = aiLogs.length;
  const totalAiTokens = aiLogs.reduce((sum, l) => sum + ((l.meta as AiMeta | null)?.total ?? 0), 0);

  // Queries by mode (top 8)
  const byMode: Record<string, number> = {};
  aiLogs.forEach((l) => {
    const type = (l.meta as AiMeta | null)?.type ?? "chat";
    byMode[type] = (byMode[type] ?? 0) + 1;
  });
  const topModes = Object.entries(byMode).sort(([, a], [, b]) => b - a).slice(0, 8);

  // Top users
  const byUser = new Map<string, { email: string; name: string | null; count: number; tokens: number }>();
  aiLogs.forEach((l) => {
    if (!l.userId || !l.user) return;
    const u = byUser.get(l.userId) ?? { email: l.user.email, name: l.user.name, count: 0, tokens: 0 };
    u.count++;
    u.tokens += (l.meta as AiMeta | null)?.total ?? 0;
    byUser.set(l.userId, u);
  });
  const topAiUsers = Array.from(byUser.values()).sort((a, b) => b.count - a.count).slice(0, 5);

  // Daily usage (last 7 days)
  const dailyMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap[d.toISOString().split("T")[0]] = 0;
  }
  aiLogs.forEach((l) => {
    const key = l.createdAt.toISOString().split("T")[0];
    if (key in dailyMap) dailyMap[key]++;
  });
  const dailyEntries = Object.entries(dailyMap);
  const maxDaily = Math.max(...dailyEntries.map(([, v]) => v), 1);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="label-caps mb-1" style={{ color: "var(--gold)" }}>Аналитика</p>
        <h1 className="heading-display text-3xl" style={{ color: "var(--charcoal)" }}>Статистика</h1>
      </div>

      {/* Invite summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Жарияланды", value: statusMap["PUBLISHED"] ?? 0, accent: "#16a34a" },
          { label: "Жоба", value: statusMap["DRAFT"] ?? 0, accent: "var(--muted)" },
          { label: "Төлем күтілуде", value: statusMap["PENDING_PAYMENT"] ?? 0, accent: "var(--gold)" },
          { label: "Кіріс (₸)", value: totalRevenue.toLocaleString("kk-KZ"), accent: "var(--gold)" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-5 text-center" style={{ background: "white", border: "1px solid var(--border)" }}>
            <p className="font-serif text-3xl font-bold" style={{ color: s.accent }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* RSVP breakdown */}
      <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid var(--border)" }}>
        <h2 className="font-semibold mb-4" style={{ color: "var(--charcoal)" }}>RSVP жауаптары</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Барады", value: guestMap["COMING"] ?? 0, color: "#16a34a", bg: "#dcfce7" },
            { label: "Белгісіз", value: guestMap["MAYBE"] ?? 0, color: "#d97706", bg: "#fef3c7" },
            { label: "Бармайды", value: guestMap["NOT_COMING"] ?? 0, color: "#dc2626", bg: "#fee2e2" },
          ].map((s) => (
            <div key={s.label} className="text-center py-4 rounded-xl" style={{ background: s.bg }}>
              <p className="font-serif text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: s.color }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Top viewed */}
        <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid var(--border)" }}>
          <h2 className="font-semibold mb-4" style={{ color: "var(--charcoal)" }}>Ең көп қаралды</h2>
          <div className="flex flex-col gap-3">
            {topViewed.map((inv, i) => (
              <div key={inv.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-bold w-5 shrink-0" style={{ color: "var(--gold)" }}>{i + 1}</span>
                  <p className="text-sm truncate" style={{ color: "var(--charcoal)" }}>{inv.title}</p>
                </div>
                <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>{inv.viewCount} қарау</span>
              </div>
            ))}
            {topViewed.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>Деректер жоқ</p>}
          </div>
        </div>

        {/* Top RSVP */}
        <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid var(--border)" }}>
          <h2 className="font-semibold mb-4" style={{ color: "var(--charcoal)" }}>Ең көп RSVP</h2>
          <div className="flex flex-col gap-3">
            {topRSVP.map((inv, i) => (
              <div key={inv.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-bold w-5 shrink-0" style={{ color: "var(--gold)" }}>{i + 1}</span>
                  <p className="text-sm truncate" style={{ color: "var(--charcoal)" }}>{inv.title}</p>
                </div>
                <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>{inv._count.guests} RSVP</span>
              </div>
            ))}
            {topRSVP.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>Деректер жоқ</p>}
          </div>
        </div>
      </div>

      {/* ── AI Usage Section ── */}
      <div>
        <p className="label-caps mb-1" style={{ color: "var(--gold)" }}>AI Агент</p>
        <h2 className="heading-display text-2xl mb-4" style={{ color: "var(--charcoal)" }}>Пайдалану статистикасы</h2>
      </div>

      {/* AI summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Барлық сұраулар", value: totalAiQueries.toLocaleString(), accent: "var(--charcoal)" },
          { label: "Барлық токендер", value: totalAiTokens.toLocaleString(), accent: "var(--gold)" },
          { label: "Бүгін", value: (dailyMap[new Date().toISOString().split("T")[0]] ?? 0).toString(), accent: "#16a34a" },
          { label: "Белсенді пайд.", value: byUser.size.toString(), accent: "var(--charcoal)" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-5 text-center" style={{ background: "white", border: "1px solid var(--border)" }}>
            <p className="font-serif text-3xl font-bold" style={{ color: s.accent }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Daily chart + top modes */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Daily bar chart */}
        <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid var(--border)" }}>
          <h3 className="font-semibold mb-4" style={{ color: "var(--charcoal)" }}>Күнделікті (соңғы 7 күн)</h3>
          <div className="flex items-end gap-2 h-28">
            {dailyEntries.map(([day, count]) => {
              const pct = Math.round((count / maxDaily) * 100);
              const label = new Date(day).toLocaleDateString("kk-KZ", { weekday: "short" });
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px]" style={{ color: "var(--muted)" }}>{count > 0 ? count : ""}</span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{ height: `${Math.max(pct, 4)}%`, background: count > 0 ? "var(--gold)" : "var(--cream)" }}
                  />
                  <span className="text-[9px] truncate w-full text-center" style={{ color: "var(--muted)" }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top modes */}
        <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid var(--border)" }}>
          <h3 className="font-semibold mb-4" style={{ color: "var(--charcoal)" }}>Ең жиі қолданылатын режимдер</h3>
          <div className="flex flex-col gap-2.5">
            {topModes.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>Деректер жоқ</p>}
            {topModes.map(([mode, count]) => {
              const pct = Math.round((count / (topModes[0]?.[1] ?? 1)) * 100);
              return (
                <div key={mode}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: "var(--charcoal)" }}>
                      {MODE_LABELS[mode] ?? mode}
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>{count}</span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ background: "var(--cream)" }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: "var(--gold)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top AI users */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid var(--border)" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-semibold" style={{ color: "var(--charcoal)" }}>Белсенді пайдаланушылар (AI)</h3>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {topAiUsers.length === 0 && (
            <p className="px-6 py-4 text-sm" style={{ color: "var(--muted)" }}>Деректер жоқ</p>
          )}
          {topAiUsers.map((u, i) => (
            <div key={u.email} className="px-6 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-bold w-5 shrink-0" style={{ color: "var(--gold)" }}>{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--charcoal)" }}>{u.name ?? u.email}</p>
                  <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-right">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--charcoal)" }}>{u.count}</p>
                  <p className="text-[10px]" style={{ color: "var(--muted)" }}>сұрау</p>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--gold)" }}>{u.tokens.toLocaleString()}</p>
                  <p className="text-[10px]" style={{ color: "var(--muted)" }}>токен</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RSVP Prediction Section ── */}
      <div>
        <p className="label-caps mb-1" style={{ color: "var(--gold)" }}>Болжам</p>
        <h2 className="heading-display text-2xl mb-4" style={{ color: "var(--charcoal)" }}>RSVP Болжамы</h2>
      </div>

      {/* Prediction summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Шақырылғандар", value: globalExpected, accent: "var(--charcoal)", sub: "Жалпы RSVP" },
          { label: "Келуі ықтимал", value: globalLikely, accent: "#16a34a", sub: "COMING + 50% MAYBE" },
          { label: "Орт. RSVP rate", value: `${avgRsvpRate}%`, accent: "var(--gold)", sub: "Жауап берген %" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-5 text-center" style={{ background: "white", border: "1px solid var(--border)" }}>
            <p className="font-serif text-3xl font-bold" style={{ color: s.accent }}>{s.value}</p>
            <p className="text-xs font-semibold mt-1" style={{ color: "var(--charcoal)" }}>{s.label}</p>
            <p className="text-[10px]" style={{ color: "var(--muted)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Per-invite prediction table */}
      {rsvpRows.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid var(--border)" }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <h3 className="font-semibold" style={{ color: "var(--charcoal)" }}>Шақыру бойынша болжам</h3>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Болжам = COMING + 50% MAYBE</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--cream)" }}>
                  {["Шақыру", "RSVP", "Барады", "Мүмкін", "Бармайды", "Болжам"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: "var(--muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rsvpRows.map((r) => (
                  <tr key={r.slug} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-[160px]" style={{ color: "var(--charcoal)" }}>{r.title}</p>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>{r.total}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold" style={{ color: "#16a34a" }}>{r.coming}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold" style={{ color: "#d97706" }}>{r.maybe}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: "#dc2626" }}>{r.notComing}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold" style={{ color: "var(--charcoal)" }}>{r.likelyComing}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3" style={{ borderTop: "1px solid var(--border)", background: "var(--cream)" }}>
            <p className="text-[10px]" style={{ color: "var(--muted)" }}>
              Болжам формуласы: COMING + ⌊MAYBE × 0.5⌋. Тек PUBLISHED шақырулар есептеледі.
            </p>
          </div>
        </div>
      )}

      {rsvpRows.length === 0 && (
        <div className="rounded-2xl p-8 text-center" style={{ background: "white", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Жарияланған шақыруларда RSVP деректер жоқ</p>
        </div>
      )}

      {/* Recent signups */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid var(--border)" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--charcoal)" }}>Соңғы тіркелулер</h2>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {recentSignups.map((u) => (
            <div key={u.id} className="px-6 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--charcoal)" }}>{u.name ?? u.email}</p>
                <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{u.email}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs" style={{ color: "var(--muted)" }}>{u._count.invites} шақыру</span>
                {u.role === "ADMIN" && (
                  <span className="label-caps px-2 py-0.5 rounded-full text-[9px]" style={{ background: "rgba(196,150,62,0.1)", color: "var(--gold-dark)" }}>Admin</span>
                )}
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {u.createdAt.toLocaleDateString("kk-KZ", { day: "numeric", month: "short" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
