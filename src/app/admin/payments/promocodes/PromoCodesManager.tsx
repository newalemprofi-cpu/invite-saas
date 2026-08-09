"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface PromoRow {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usagePerUser: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  enabled: boolean;
  paidConversions: number;
  totalDiscount: number;
}

interface FormState {
  code: string;
  type: "PERCENT" | "FIXED";
  value: string;
  minAmount: string;
  maxDiscount: string;
  usageLimit: string;
  usagePerUser: string;
  startsAt: string;
  expiresAt: string;
  enabled: boolean;
}

const EMPTY: FormState = {
  code: "",
  type: "PERCENT",
  value: "",
  minAmount: "",
  maxDiscount: "",
  usageLimit: "",
  usagePerUser: "",
  startsAt: "",
  expiresAt: "",
  enabled: true,
};

function toForm(p: PromoRow): FormState {
  return {
    code: p.code,
    type: p.type,
    value: String(p.value),
    minAmount: p.minAmount != null ? String(p.minAmount) : "",
    maxDiscount: p.maxDiscount != null ? String(p.maxDiscount) : "",
    usageLimit: p.usageLimit != null ? String(p.usageLimit) : "",
    usagePerUser: p.usagePerUser != null ? String(p.usagePerUser) : "",
    startsAt: p.startsAt ? p.startsAt.slice(0, 10) : "",
    expiresAt: p.expiresAt ? p.expiresAt.slice(0, 10) : "",
    enabled: p.enabled,
  };
}

function fieldClass() {
  return "w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function formatDiscount(p: Pick<PromoRow, "type" | "value">) {
  return p.type === "PERCENT" ? `${p.value}%` : `${p.value.toLocaleString("kk-KZ")}₸`;
}

export function PromoCodesManager({ initial }: { initial: PromoRow[] }) {
  const [promos, setPromos] = useState<PromoRow[]>(initial);
  const [panel, setPanel] = useState<"none" | "create" | string>("none");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ENABLED" | "DISABLED" | "EXPIRED">("ALL");

  const reload = () => {
    fetch("/api/admin/promo-codes")
      .then((r) => r.json())
      .then(setPromos)
      .catch(() => {});
  };

  const set = (k: keyof FormState, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const openCreate = () => {
    setForm(EMPTY);
    setError(null);
    setPanel("create");
  };
  const openEdit = (p: PromoRow) => {
    setForm(toForm(p));
    setError(null);
    setPanel(p.id);
  };
  const close = () => setPanel("none");

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: form.code,
        type: form.type,
        value: form.value,
        minAmount: form.minAmount || null,
        maxDiscount: form.maxDiscount || null,
        usageLimit: form.usageLimit || null,
        usagePerUser: form.usagePerUser || null,
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
        enabled: form.enabled,
      };
      const url = panel === "create" ? "/api/admin/promo-codes" : `/api/admin/promo-codes/${panel}`;
      const res = await fetch(url, {
        method: panel === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Қате болды");
        return;
      }
      reload();
      close();
    } catch {
      setError("Желі қатесі");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (p: PromoRow) => {
    const res = await fetch(`/api/admin/promo-codes/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !p.enabled }),
    });
    if (res.ok) setPromos((prev) => prev.map((x) => (x.id === p.id ? { ...x, enabled: !x.enabled } : x)));
  };

  const del = async (p: PromoRow) => {
    if (!confirm(`"${p.code}" промокодын жою?`)) return;
    const res = await fetch(`/api/admin/promo-codes/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      setPromos((prev) => prev.filter((x) => x.id !== p.id));
    } else {
      const d = await res.json();
      alert(d.error ?? "Жою сәтсіз аяқталды");
    }
  };

  const [now] = useState(() => Date.now());
  const filtered = useMemo(() => {
    return promos.filter((p) => {
      if (search && !p.code.toLowerCase().includes(search.trim().toLowerCase())) return false;
      const isExpired = !!p.expiresAt && new Date(p.expiresAt).getTime() < now;
      if (statusFilter === "ENABLED" && !(p.enabled && !isExpired)) return false;
      if (statusFilter === "DISABLED" && p.enabled) return false;
      if (statusFilter === "EXPIRED" && !isExpired) return false;
      return true;
    });
  }, [promos, search, statusFilter, now]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Промокодтар</h1>
          <p className="text-sm text-zinc-500 mt-1">{promos.length} промокод</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
        >
          + Жаңа промокод
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Код бойынша іздеу..."
          className="rounded-xl border border-zinc-200 px-3.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 min-w-[220px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-xl border border-zinc-200 px-3.5 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        >
          <option value="ALL">Барлығы</option>
          <option value="ENABLED">Қосулы</option>
          <option value="DISABLED">Өшірулі</option>
          <option value="EXPIRED">Мерзімі өткен</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-10">Промокод табылмады</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Код</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Жеңілдік</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Қолданылды</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Жарамдылық мерзімі</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Статус</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const isExpired = !!p.expiresAt && new Date(p.expiresAt).getTime() < now;
                  const statusLabel = !p.enabled ? "Өшірулі" : isExpired ? "Мерзімі өткен" : "Қосулы";
                  const statusCls = !p.enabled || isExpired ? "bg-zinc-100 text-zinc-500" : "bg-emerald-100 text-emerald-700";
                  return (
                    <tr key={p.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-800">{p.code}</td>
                      <td className="px-4 py-3 text-zinc-700">{formatDiscount(p)}</td>
                      <td className="px-4 py-3 text-zinc-600 tabular-nums">
                        {p.usedCount}/{p.usageLimit && p.usageLimit > 0 ? p.usageLimit : "∞"}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">
                        {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString("kk-KZ") : "Шектеусіз"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleEnabled(p)}
                          className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold", statusCls)}
                        >
                          {statusLabel}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
                          >
                            Баптау
                          </button>
                          <button
                            onClick={() => del(p)}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                          >
                            Жою
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {panel !== "none" && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={close} />
          <div className="w-full max-w-md flex flex-col overflow-hidden bg-white">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="font-bold text-lg text-zinc-900">
                {panel === "create" ? "Жаңа промокод" : "Промокодты баптау"}
              </h2>
              <button onClick={close} className="text-2xl leading-none text-zinc-400 hover:text-zinc-700">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              {error && (
                <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">{error}</p>
              )}

              <Field label="Код">
                <input
                  value={form.code}
                  onChange={(e) => set("code", e.target.value)}
                  placeholder="WELCOME10"
                  className={cn(fieldClass(), "font-mono uppercase")}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Жеңілдік түрі">
                  <select value={form.type} onChange={(e) => set("type", e.target.value)} className={fieldClass()}>
                    <option value="PERCENT">Пайыз (%)</option>
                    <option value="FIXED">Тіркелген сома (₸)</option>
                  </select>
                </Field>
                <Field label="Жеңілдік">
                  <input
                    type="number"
                    min="0"
                    value={form.value}
                    onChange={(e) => set("value", e.target.value)}
                    placeholder={form.type === "PERCENT" ? "10" : "1000"}
                    className={fieldClass()}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Минималды төлем сомасы">
                  <input
                    type="number"
                    min="0"
                    value={form.minAmount}
                    onChange={(e) => set("minAmount", e.target.value)}
                    placeholder="—"
                    className={fieldClass()}
                  />
                </Field>
                <Field label="Максималды жеңілдік">
                  <input
                    type="number"
                    min="0"
                    value={form.maxDiscount}
                    onChange={(e) => set("maxDiscount", e.target.value)}
                    placeholder="—"
                    className={fieldClass()}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Жалпы қолдану лимиті">
                  <input
                    type="number"
                    min="0"
                    value={form.usageLimit}
                    onChange={(e) => set("usageLimit", e.target.value)}
                    placeholder="Шектеусіз"
                    className={fieldClass()}
                  />
                </Field>
                <Field label="Бір пайдаланушыға">
                  <input
                    type="number"
                    min="0"
                    value={form.usagePerUser}
                    onChange={(e) => set("usagePerUser", e.target.value)}
                    placeholder="Шектеусіз"
                    className={fieldClass()}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Басталу күні">
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => set("startsAt", e.target.value)}
                    className={fieldClass()}
                  />
                </Field>
                <Field label="Аяқталу күні">
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => set("expiresAt", e.target.value)}
                    className={fieldClass()}
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2.5 mt-1">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => set("enabled", e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <span className="text-sm font-medium text-zinc-700">Қосулы</span>
              </label>

              {panel !== "create" && (
                <div className="rounded-xl bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
                  Қолданылды: {promos.find((p) => p.id === panel)?.usedCount ?? 0} рет · Расталған төлемдер:{" "}
                  {promos.find((p) => p.id === panel)?.paidConversions ?? 0} · Берілген жеңілдік жалпы:{" "}
                  {(promos.find((p) => p.id === panel)?.totalDiscount ?? 0).toLocaleString("kk-KZ")}₸
                </div>
              )}
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-zinc-100 flex justify-end gap-2">
              <button
                onClick={close}
                className="inline-flex h-10 items-center rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Бас тарту
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex h-10 items-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 transition-colors"
              >
                {saving ? "Сақталуда..." : "Сақтау"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
