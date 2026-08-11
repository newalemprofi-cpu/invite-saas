"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import type { InviteTemplate } from "@prisma/client";
import { uploadTemplateImageAction, removeTemplateImageAction } from "./actions";
import { TEMPLATE_FILTERS } from "@/lib/templates";

interface FormState {
  title: string;
  slug: string;
  nameKk: string;
  nameRu: string;
  category: string;
  language: string;
  style: string;
  description: string;
  descriptionRu: string;
  previewImage: string;
  demoImage: string;
  isActive: boolean;
  sortOrder: string;
  isPremium: boolean;
  bg: string;
  gradient: string;
  accent: string;
  textDark: string;
  textMuted: string;
  dark: boolean;
  emoji: string;
  demoName1: string;
  demoName2: string;
  tags: string;
  tagsKk: string;
  tagsRu: string;
}

const EMPTY: FormState = {
  title: "", slug: "", nameKk: "", nameRu: "", category: "wedding", language: "both",
  style: "elegant", description: "", descriptionRu: "", previewImage: "", demoImage: "",
  isActive: true, sortOrder: "0", isPremium: false,
  bg: "#FAF8F3", gradient: "from-amber-50 via-stone-50 to-rose-50",
  accent: "#C4963E", textDark: "#1C1917", textMuted: "#78716C",
  dark: false, emoji: "✨", demoName1: "", demoName2: "", tags: "", tagsKk: "", tagsRu: "",
};

// Single canonical style-bucket source (§3/§4) — mirrors exactly what
// /templates?cat= and getDbTemplates({cat}) filter against. Deliberately
// NOT the 8-id EVENT_CATEGORIES (lib/event-categories.ts): that's the
// customer-facing "what kind of celebration" list (drives the simple
// constructor's category picker + which EventFormSchema applies), while
// this is the narrower "which visual style bucket" a template belongs to
// — several EVENT_CATEGORIES ids intentionally share one style bucket
// (e.g. besiktoi/sundettoi/kudalyk all bucket under "kazakh") so templates
// stay reusable across related event types instead of fragmenting 1:1.
const CATEGORIES = TEMPLATE_FILTERS.filter((f) => f.id !== "all").map((f) => ({ value: f.id, label: f.labelKk }));

const LANGUAGES = [
  { value: "both", label: "Екі тілде" },
  { value: "kk", label: "Қазақша ғана" },
  { value: "ru", label: "Орысша ғана" },
];

function toForm(t: InviteTemplate): FormState {
  return {
    title: t.title, slug: t.slug, nameKk: t.nameKk ?? "", nameRu: t.nameRu ?? "",
    category: t.category, language: t.language, style: t.style,
    description: t.description ?? "", descriptionRu: t.descriptionRu ?? "",
    previewImage: t.previewImage ?? "",
    demoImage: t.demoImage ?? "", isActive: t.isActive,
    sortOrder: String(t.sortOrder), isPremium: t.isPremium,
    bg: t.bg, gradient: t.gradient, accent: t.accent,
    textDark: t.textDark, textMuted: t.textMuted, dark: t.dark,
    emoji: t.emoji, demoName1: t.demoName1, demoName2: t.demoName2 ?? "",
    tags: t.tags.join(", "), tagsKk: t.tagsKk.join(", "), tagsRu: t.tagsRu.join(", "),
  };
}

export function TemplatesManager() {
  const [templates, setTemplates] = useState<InviteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<"none" | "create" | string>("none");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/templates")
      .then((r) => r.json())
      .then(setTemplates)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const set = (k: keyof FormState, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v }));

  const openCreate = () => { setForm(EMPTY); setPanel("create"); setError(null); };
  const openEdit = (t: InviteTemplate) => { setForm(toForm(t)); setPanel(t.id); setError(null); };
  const close = () => setPanel("none");

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const splitTags = (s: string) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
      const payload = {
        ...form,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
        tags: splitTags(form.tags),
        tagsKk: splitTags(form.tagsKk),
        tagsRu: splitTags(form.tagsRu),
        nameKk: form.nameKk || null,
        nameRu: form.nameRu || null,
        descriptionRu: form.descriptionRu || null,
        demoName2: form.demoName2 || null,
      };
      const url =
        panel === "create"
          ? "/api/admin/templates"
          : `/api/admin/templates/${panel}`;
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
      load();
      close();
    } catch {
      setError("Желі қатесі");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: InviteTemplate) => {
    await fetch(`/api/admin/templates/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    setTemplates((p) =>
      p.map((x) => (x.id === t.id ? { ...x, isActive: !x.isActive } : x))
    );
  };

  const del = async (t: InviteTemplate) => {
    if (!confirm(`"${t.title}" шаблонын жою?`)) return;
    const res = await fetch(`/api/admin/templates/${t.id}`, { method: "DELETE" });
    if (res.ok) setTemplates((p) => p.filter((x) => x.id !== t.id));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--charcoal)" }}>
            Шаблондар
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            {templates.length} шаблон · дерекқорда
          </p>
        </div>
        <button onClick={openCreate} className="btn-gold text-sm">
          + Жаңа шаблон
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Жүктелуде…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: t.bg, border: "1px solid var(--border)" }}
            >
              <div
                className={`h-24 bg-gradient-to-br ${t.gradient} flex flex-col items-center justify-center gap-1`}
              >
                <span className="text-3xl">{t.emoji}</span>
                <p className="text-xs font-semibold" style={{ color: t.textDark }}>
                  {t.demoName1}
                  {t.demoName2 ? ` & ${t.demoName2}` : ""}
                </p>
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <p className="font-semibold text-sm leading-tight" style={{ color: t.textDark }}>
                    {t.title}
                  </p>
                  <button
                    onClick={() => toggleActive(t)}
                    className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={
                      t.isActive
                        ? { background: "rgba(34,197,94,0.1)", color: "#16a34a" }
                        : { background: "rgba(113,113,122,0.1)", color: "#71717a" }
                    }
                  >
                    {t.isActive ? "Белсенді" : "Жасырын"}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  <Tag label={t.category} />
                  <Tag label={t.language} />
                  {t.isPremium && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: "rgba(196,150,62,0.12)", color: "var(--gold-dark)" }}
                    >
                      Premium
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(t)}
                    className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors"
                    style={{
                      background: "var(--cream)",
                      color: "var(--charcoal)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    Өзгерту
                  </button>
                  <button
                    onClick={() => del(t)}
                    className="text-xs py-1.5 px-2.5 rounded-lg"
                    style={{ background: "rgba(239,68,68,0.08)", color: "#dc2626" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Side panel */}
      {panel !== "none" && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={close}
          />
          <div
            className="w-full max-w-lg flex flex-col overflow-hidden"
            style={{ background: "white" }}
          >
            {/* Panel header */}
            <div
              className="shrink-0 flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h2 className="font-bold text-lg" style={{ color: "var(--charcoal)" }}>
                {panel === "create" ? "Жаңа шаблон" : "Шаблонды өзгерту"}
              </h2>
              <button
                onClick={close}
                className="text-2xl leading-none"
                style={{ color: "var(--muted)" }}
              >
                ×
              </button>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
              {error && (
                <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </p>
              )}

              {/* Basic */}
              <Section label="Негізгі ақпарат">
                <FI label="Атауы *" value={form.title} onChange={(v) => set("title", v)} />
                <FI
                  label="Slug *"
                  value={form.slug}
                  onChange={(v) => set("slug", v.toLowerCase().replace(/\s+/g, "-"))}
                />
                <FI label="Атауы (қазақша)" value={form.nameKk} onChange={(v) => set("nameKk", v)} />
                <FI label="Атауы (орысша)" value={form.nameRu} onChange={(v) => set("nameRu", v)} />
                <FS label="Санат" value={form.category} onChange={(v) => set("category", v)} options={CATEGORIES} />
                <FS label="Тіл" value={form.language} onChange={(v) => set("language", v)} options={LANGUAGES} />
                <FI label="Сипаттама (қазақша)" value={form.description} onChange={(v) => set("description", v)} multiline />
                <FI label="Сипаттама (орысша)" value={form.descriptionRu} onChange={(v) => set("descriptionRu", v)} multiline />
                <FI label="Теги (үтірмен)" value={form.tags} onChange={(v) => set("tags", v)} placeholder="wedding, floral" />
                <FI label="Теги — қазақша (үтірмен)" value={form.tagsKk} onChange={(v) => set("tagsKk", v)} placeholder="үйлену, гүл" />
                <FI label="Теги — орысша (үтірмен)" value={form.tagsRu} onChange={(v) => set("tagsRu", v)} placeholder="свадьба, цветы" />
                <FI label="Сорт реті" type="number" value={form.sortOrder} onChange={(v) => set("sortOrder", v)} />
              </Section>

              {/* Toggles */}
              <Section label="Белгілер">
                <div className="flex flex-wrap gap-4">
                  <Toggle label="Белсенді" checked={form.isActive} onChange={(v) => set("isActive", v)} />
                  <Toggle label="Premium" checked={form.isPremium} onChange={(v) => set("isPremium", v)} />
                  <Toggle label="Қараңғы тема" checked={form.dark} onChange={(v) => set("dark", v)} />
                </div>
              </Section>

              {/* Preview */}
              <Section label="Алдын ала көру">
                <FI label="Emoji" value={form.emoji} onChange={(v) => set("emoji", v)} placeholder="✨" />
                <FI label="1-есім (demoName1)" value={form.demoName1} onChange={(v) => set("demoName1", v)} />
                <FI label="2-есім (demoName2)" value={form.demoName2} onChange={(v) => set("demoName2", v)} />
                <ImageUploadField
                  label="Preview сурет"
                  templateId={panel === "create" || panel === "none" ? null : panel}
                  field="previewImage"
                  value={form.previewImage}
                  onChange={(v) => set("previewImage", v)}
                />
                <ImageUploadField
                  label="Demo сурет"
                  templateId={panel === "create" || panel === "none" ? null : panel}
                  field="demoImage"
                  value={form.demoImage}
                  onChange={(v) => set("demoImage", v)}
                />
              </Section>

              {/* Visual tokens */}
              <Section label="Визуал токендер">
                <div className="grid grid-cols-2 gap-3">
                  <FI label="Фон (bg)" value={form.bg} onChange={(v) => set("bg", v)} placeholder="#FAF8F3" />
                  <FI label="Акцент" value={form.accent} onChange={(v) => set("accent", v)} placeholder="#C4963E" />
                  <FI label="Қараңғы мәтін" value={form.textDark} onChange={(v) => set("textDark", v)} />
                  <FI label="Боз мәтін" value={form.textMuted} onChange={(v) => set("textMuted", v)} />
                </div>
                <FI
                  label="Градиент (Tailwind класы)"
                  value={form.gradient}
                  onChange={(v) => set("gradient", v)}
                  placeholder="from-amber-50 via-stone-50 to-rose-50"
                />
              </Section>

              <button
                onClick={save}
                disabled={saving}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{
                  background: "var(--charcoal)",
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Сақталуда…" : "Сақтау"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Small helpers ─────────────────────────────── */

function Tag({ label }: { label: string }) {
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded-full"
      style={{ background: "rgba(0,0,0,0.06)", color: "var(--muted)" }}
    >
      {label}
    </span>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="label-caps" style={{ color: "var(--gold)" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

/** Mirrors lib/storage.ts's resolveStoredImage()/getPublicUrl() — kept local since storage.ts pulls in the AWS SDK, which must never reach a client bundle. */
function resolveImageSrc(value: string): string {
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  return `/api/media/${value.split("/").map(encodeURIComponent).join("/")}`;
}

function ImageUploadField({
  label, templateId, field, value, onChange,
}: {
  label: string;
  templateId: string | null;
  field: "previewImage" | "demoImage";
  value: string;
  onChange: (v: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!templateId) return;
    setError(null);
    const form = new FormData();
    form.append("templateId", templateId);
    form.append("field", field);
    form.append("file", file);
    startTransition(async () => {
      const result = await uploadTemplateImageAction(form);
      if (result.error) setError(result.error);
      else if (result.key) onChange(result.key);
    });
  };

  const handleRemove = () => {
    if (!templateId) return;
    setError(null);
    startTransition(async () => {
      const result = await removeTemplateImageAction(templateId, field);
      if (result.error) setError(result.error);
      else onChange("");
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</label>
      {!templateId ? (
        <p className="text-xs italic" style={{ color: "var(--muted)" }}>
          Алдымен шаблонды сақтаңыз, содан кейін сурет қосасыз.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
            style={{ background: "var(--cream)", border: "1px solid var(--border)" }}
          >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveImageSrc(value)} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl" style={{ opacity: 0.3 }}>🖼️</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="text-xs font-medium text-left"
              style={{ color: "var(--gold-dark)" }}
            >
              {isPending ? "Жүктелуде..." : value ? "Ауыстыру" : "Суретті жүктеу"}
            </button>
            {value && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isPending}
                className="text-xs text-left"
                style={{ color: "var(--muted)" }}
              >
                Өшіру
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) handleFile(f);
            }}
          />
        </div>
      )}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

function FI({
  label, value, onChange, type = "text", multiline, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; multiline?: boolean; placeholder?: string;
}) {
  const base =
    "w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors focus:ring-1";
  const style = {
    border: "1.5px solid var(--border)",
    color: "var(--charcoal)",
  };
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} resize-none`}
          style={style}
          rows={3}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
          style={style}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function FS({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
        style={{ border: "1.5px solid var(--border)", color: "var(--charcoal)" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  label, checked, onChange,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm font-medium select-none"
      style={{ color: "var(--charcoal)" }}
    >
      <span
        className="relative w-9 h-5 rounded-full shrink-0 transition-colors"
        style={{ background: checked ? "var(--charcoal)" : "var(--border)" }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: checked ? "18px" : "2px" }}
        />
      </span>
      {label}
    </button>
  );
}
