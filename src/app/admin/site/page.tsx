"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { EVENT_CATEGORIES } from "@/lib/event-categories";
import {
  uploadCategoryCoverAction,
  removeCategoryCoverAction,
  uploadHeroPreviewImageAction,
  removeHeroPreviewImageAction,
} from "./actions";

interface SiteContent {
  heroTitle?: string;
  heroTitleRu?: string;
  heroSubtitle?: string;
  heroSubtitleRu?: string;
  heroCtaPrimary?: string;
  heroCtaPrimaryRu?: string;
  heroCtaSecondary?: string;
  heroCtaSecondaryRu?: string;
  companyDescriptionKk?: string;
  companyDescriptionRu?: string;
  primaryColor?: string;
  primaryColorForeground?: string;
  heroPreviewTemplateSlug?: string;
  heroPreviewImage?: string;
  categoryCovers?: Record<string, string>;
  hiddenCategories?: string[];
  categoryOrder?: string[];
  featuredTemplateSlugs?: string[];
  pricingAmount?: string;
  pricingPeriod?: string;
  pricingFeatures?: string[];
  seoTitle?: string;
  seoDescription?: string;
  footerText?: string;
  announcementBar?: string;
  announcementEnabled?: boolean;
}

interface AdminTemplateRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  isActive: boolean;
}

const DEFAULTS: SiteContent = {
  heroTitle: "Ерекше күніңізге\nерекше шақыру",
  heroTitleRu: "Особенному дню —\nособенное приглашение",
  heroSubtitle: "Дайын дизайнды таңдаңыз, ақпаратыңызды енгізіңіз — шақыру бірнеше минутта дайын.",
  heroSubtitleRu: "Выберите готовый дизайн, укажите данные — приглашение готово за пару минут.",
  heroCtaPrimary: "Шақыру жасау",
  heroCtaPrimaryRu: "Создать приглашение",
  heroCtaSecondary: "Шаблондарды көру",
  heroCtaSecondaryRu: "Смотреть шаблоны",
  companyDescriptionKk: "Shaqyru — заманауи цифрлық шақыру жасау сервисі. Дайын үлгіні таңдап, бірнеше минут ішінде шақыруыңызды дайындаңыз.",
  companyDescriptionRu: "Shaqyru — современный сервис создания цифровых приглашений. Выберите готовый шаблон и подготовьте приглашение за пару минут.",
  primaryColor: "#C4963E",
  primaryColorForeground: "#1C1917",
  heroPreviewTemplateSlug: "",
  heroPreviewImage: "",
  categoryCovers: {},
  hiddenCategories: [],
  categoryOrder: [],
  featuredTemplateSlugs: [],
  pricingAmount: "4 990",
  pricingPeriod: "90 күн белсенді",
  pricingFeatures: [
    "Кез-келген шаблонды таңдаңыз",
    "Шексіз RSVP жинау",
    "Бөлісу сілтемесі",
    "Визуалды редактор",
    "WhatsApp интеграциясы",
    "Картадан орынды қосу",
  ],
  seoTitle: "Шақыру — Премиум цифрлы шақырулар",
  seoDescription: "Элегантты цифрлы шақырулар. Үйлену той, ұзату, туылған күн үшін.",
  footerText: "Қазақстандық премиум цифрлы шақыру сервисі",
  announcementBar: "",
  announcementEnabled: false,
};

/** Mirrors lib/storage.ts's getPublicUrl() — kept tiny and local since that module isn't safe to import client-side. */
function coverSrc(key: string): string {
  return `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export default function AdminSitePage() {
  const [content, setContent] = useState<SiteContent>(DEFAULTS);
  const [templates, setTemplates] = useState<AdminTemplateRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [featuresText, setFeaturesText] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/site-settings").then((r) => r.json()),
      fetch("/api/admin/templates").then((r) => r.json()),
    ])
      .then(([data, tmpls]: [SiteContent, AdminTemplateRow[]]) => {
        const merged = { ...DEFAULTS, ...data };
        setContent(merged);
        setFeaturesText((merged.pricingFeatures ?? DEFAULTS.pricingFeatures ?? []).join("\n"));
        setTemplates(Array.isArray(tmpls) ? tmpls : []);
        setLoading(false);
      })
      .catch(() => {
        setFeaturesText((DEFAULTS.pricingFeatures ?? []).join("\n"));
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const pricingFeatures = featuresText.split("\n").map((s) => s.trim()).filter(Boolean);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...content, pricingFeatures }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const up = (patch: Partial<SiteContent>) => setContent((prev) => ({ ...prev, ...patch }));

  const toggleHidden = (id: string) => {
    const hidden = content.hiddenCategories ?? [];
    up({ hiddenCategories: hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id] });
  };

  const orderedCategoryIds = [
    ...(content.categoryOrder ?? []).filter((id) => EVENT_CATEGORIES.some((c) => c.id === id)),
    ...EVENT_CATEGORIES.map((c) => c.id).filter((id) => !(content.categoryOrder ?? []).includes(id)),
  ];
  const moveCategory = (id: string, dir: -1 | 1) => {
    const idx = orderedCategoryIds.indexOf(id);
    const target = idx + dir;
    if (target < 0 || target >= orderedCategoryIds.length) return;
    const next = [...orderedCategoryIds];
    [next[idx], next[target]] = [next[target], next[idx]];
    up({ categoryOrder: next });
  };

  const toggleFeatured = (slug: string) => {
    const cur = content.featuredTemplateSlugs ?? [];
    up({ featuredTemplateSlugs: cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug] });
  };

  if (loading) return <div className="text-sm" style={{ color: "var(--muted)" }}>Жүктелуде...</div>;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold" style={{ color: "var(--charcoal)" }}>
            Сайт CMS
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Сайттың барлық мәтіндерін осы жерден басқарыңыз
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="btn-gold px-6"
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Сақталуда..." : saved ? "✓ Сақталды" : "Сақтау"}
        </button>
      </div>

      {/* Announcement */}
      <Card title="Хабарландыру жолағы">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={content.announcementEnabled ?? false}
            onChange={(e) => up({ announcementEnabled: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm" style={{ color: "var(--charcoal)" }}>Хабарландыруды қосу</span>
        </label>
        <TextArea label="Хабарландыру мәтіні" value={content.announcementBar ?? ""} onChange={(v) => up({ announcementBar: v })} rows={2} placeholder="🎉 Жаңа жаңарту: AI мәтін генераторы қосылды!" />
      </Card>

      {/* Hero */}
      <Card title="Hero бөлімі">
        <p className="label-caps" style={{ color: "var(--muted)" }}>Қазақша</p>
        <TextArea label="Бас тақырып" value={content.heroTitle ?? ""} onChange={(v) => up({ heroTitle: v })} rows={2} placeholder="Ерекше күніңізге ерекше шақыру" />
        <TextArea label="Сипаттама" value={content.heroSubtitle ?? ""} onChange={(v) => up({ heroSubtitle: v })} rows={3} placeholder="Дайын дизайнды таңдаңыз..." />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Негізгі батырма" value={content.heroCtaPrimary ?? ""} onChange={(v) => up({ heroCtaPrimary: v })} placeholder="Шақыру жасау" />
          <TextField label="Екінші батырма" value={content.heroCtaSecondary ?? ""} onChange={(v) => up({ heroCtaSecondary: v })} placeholder="Шаблондарды көру" />
        </div>
        <div className="h-px" style={{ background: "var(--border)" }} />
        <p className="label-caps" style={{ color: "var(--muted)" }}>Орысша</p>
        <TextArea label="Заголовок" value={content.heroTitleRu ?? ""} onChange={(v) => up({ heroTitleRu: v })} rows={2} placeholder="Особенному дню — особенное приглашение" />
        <TextArea label="Описание" value={content.heroSubtitleRu ?? ""} onChange={(v) => up({ heroSubtitleRu: v })} rows={3} placeholder="Выберите готовый дизайн..." />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Основная кнопка" value={content.heroCtaPrimaryRu ?? ""} onChange={(v) => up({ heroCtaPrimaryRu: v })} placeholder="Создать приглашение" />
          <TextField label="Вторая кнопка" value={content.heroCtaSecondaryRu ?? ""} onChange={(v) => up({ heroCtaSecondaryRu: v })} placeholder="Смотреть шаблоны" />
        </div>
      </Card>

      {/* Site colors — public marketing site's primary CTA only (Header/Hero/
          Template-choose/Final CTA). Never touches invitation TEMPLATE
          colors (Фон/Акцент/... in /admin/templates) — those are a fully
          separate, per-template setting. */}
      <Card title="Сайт түстері">
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Сайттың негізгі батырмасының түсі (Шақыру жасау). Шаблондардың өз түстеріне әсер етпейді.
        </p>
        <ColorField
          label="Негізгі батырма түсі"
          value={content.primaryColor ?? "#C4963E"}
          onChange={(v) => up({ primaryColor: v })}
        />
        <ColorField
          label="Негізгі батырма мәтінінің түсі"
          value={content.primaryColorForeground ?? "#1C1917"}
          onChange={(v) => up({ primaryColorForeground: v })}
        />
        <ColorPreview bg={content.primaryColor ?? "#C4963E"} fg={content.primaryColorForeground ?? "#1C1917"} />
      </Card>

      {/* Hero preview — what shows inside the homepage hero's phone mockup */}
      <Card title="Hero алдын ала көрінісі">
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Басты беттегі телефон макетінің экранында не көрсетілетінін таңдаңыз. Егер сурет жүктелсе — ол шаблоннан басым болады.
        </p>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Шаблон</label>
          <select
            className="input-premium"
            value={content.heroPreviewTemplateSlug ?? ""}
            onChange={(e) => up({ heroPreviewTemplateSlug: e.target.value })}
          >
            <option value="">Әдепкі (автоматты)</option>
            {templates.filter((tm) => tm.isActive).map((tm) => (
              <option key={tm.id} value={tm.slug}>{tm.title} ({tm.category})</option>
            ))}
          </select>
        </div>

        <HeroPreviewImageField
          imageKey={content.heroPreviewImage}
          onUploaded={(key) => up({ heroPreviewImage: key })}
          onRemoved={() => up({ heroPreviewImage: "" })}
        />
      </Card>

      {/* Category covers */}
      <Card title="Мереке категориялары (басты бет)">
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Әр категорияға сурет жүктеңіз, көрінуін басқарыңыз және ретін өзгертіңіз. Сурет жоқ болса, эмодзи автоматты көрсетіледі.
        </p>
        <div className="flex flex-col gap-3">
          {orderedCategoryIds.map((id, i) => {
            const cat = EVENT_CATEGORIES.find((c) => c.id === id)!;
            const hidden = (content.hiddenCategories ?? []).includes(id);
            const coverKey = content.categoryCovers?.[id];
            return (
              <CategoryCoverRow
                key={id}
                category={cat}
                coverKey={coverKey}
                hidden={hidden}
                canMoveUp={i > 0}
                canMoveDown={i < orderedCategoryIds.length - 1}
                onToggleHidden={() => toggleHidden(id)}
                onMoveUp={() => moveCategory(id, -1)}
                onMoveDown={() => moveCategory(id, 1)}
                onUploaded={(key) => up({ categoryCovers: { ...(content.categoryCovers ?? {}), [id]: key } })}
                onRemoved={() => {
                  const next = { ...(content.categoryCovers ?? {}) };
                  delete next[id];
                  up({ categoryCovers: next });
                  removeCategoryCoverAction(id).catch(() => {});
                }}
              />
            );
          })}
        </div>
      </Card>

      {/* Featured templates */}
      <Card title="Танымал шаблондар (басты бет)">
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Ешнәрсе таңдалмаса, соңғы қосылған белсенді шаблондар автоматты көрсетіледі.
        </p>
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {templates.filter((t) => t.isActive).map((tmpl) => (
            <label key={tmpl.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={(content.featuredTemplateSlugs ?? []).includes(tmpl.slug)}
                onChange={() => toggleFeatured(tmpl.slug)}
                className="w-4 h-4 shrink-0"
              />
              <span className="text-sm" style={{ color: "var(--charcoal)" }}>{tmpl.title}</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>({tmpl.category})</span>
            </label>
          ))}
          {templates.length === 0 && (
            <p className="text-xs" style={{ color: "var(--muted)" }}>Шаблондар жоқ</p>
          )}
        </div>
      </Card>

      {/* Pricing */}
      <Card title="Баға бөлімі">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Сома (₸)" value={content.pricingAmount ?? ""} onChange={(v) => up({ pricingAmount: v })} placeholder="4 990" />
          <TextField label="Мерзім" value={content.pricingPeriod ?? ""} onChange={(v) => up({ pricingPeriod: v })} placeholder="90 күн белсенді" />
        </div>
        <TextArea
          label="Тарифтің мүмкіндіктері (жол-жол)"
          value={featuresText}
          onChange={setFeaturesText}
          rows={7}
          placeholder={"Кез-келген шаблонды таңдаңыз\nШексіз RSVP жинау\nБөлісу сілтемесі"}
        />
      </Card>

      {/* Company description — marketing copy shown in the footer. Operational
          contact channels (phone/email/Instagram/TikTok/WhatsApp) moved to
          Admin → Баптаулар, so this page only holds text content. */}
      <Card title="Компания туралы">
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Footer-де көрсетілетін қысқа сипаттама. Телефон, email, Instagram, TikTok — Баптаулар бетінде.
        </p>
        <TextArea
          label="Қысқа сипаттама (қазақша)"
          value={content.companyDescriptionKk ?? ""}
          onChange={(v) => up({ companyDescriptionKk: v })}
          rows={3}
          placeholder="Shaqyru — заманауи цифрлық шақыру жасау сервисі..."
        />
        <TextArea
          label="Краткое описание (русский)"
          value={content.companyDescriptionRu ?? ""}
          onChange={(v) => up({ companyDescriptionRu: v })}
          rows={3}
          placeholder="Shaqyru — современный сервис создания цифровых приглашений..."
        />
      </Card>

      {/* SEO */}
      <Card title="SEO">
        <TextField label="SEO тақырып" value={content.seoTitle ?? ""} onChange={(v) => up({ seoTitle: v })} placeholder="Шақыру — Премиум цифрлы шақырулар" />
        <TextArea label="SEO сипаттамасы" value={content.seoDescription ?? ""} onChange={(v) => up({ seoDescription: v })} rows={3} placeholder="Элегантты цифрлы шақырулар..." />
      </Card>

      {/* Footer */}
      <Card title="Footer">
        <TextField label="Footer мәтіні" value={content.footerText ?? ""} onChange={(v) => up({ footerText: v })} placeholder="Қазақстандық премиум цифрлы шақыру сервисі" />
      </Card>

      <div className="pb-8 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="btn-gold px-8"
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Сақталуда..." : saved ? "✓ Сақталды" : "Барлығын сақтау"}
        </button>
      </div>
    </div>
  );
}

function CategoryCoverRow({
  category, coverKey, hidden, canMoveUp, canMoveDown, onToggleHidden, onMoveUp, onMoveDown, onUploaded, onRemoved,
}: {
  category: { id: string; emoji: string; labelKk: string };
  coverKey: string | undefined;
  hidden: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleHidden: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUploaded: (key: string) => void;
  onRemoved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    const form = new FormData();
    form.append("category", category.id);
    form.append("file", file);
    startTransition(async () => {
      const result = await uploadCategoryCoverAction(form);
      if (result.error) setError(result.error);
      else if (result.key) onUploaded(result.key);
    });
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ border: "1px solid var(--border)" }}>
      <div
        className="w-14 h-14 rounded-lg shrink-0 overflow-hidden flex items-center justify-center text-2xl"
        style={{ background: "rgba(196,150,62,0.08)" }}
      >
        {coverKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverSrc(coverKey)} alt={category.labelKk} className="w-full h-full object-cover" />
        ) : (
          <span>{category.emoji}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--charcoal)" }}>{category.labelKk}</p>
        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="text-xs font-medium"
            style={{ color: "var(--gold-dark)" }}
          >
            {isPending ? "Жүктелуде..." : "Сурет жүктеу"}
          </button>
          {coverKey && (
            <button type="button" onClick={onRemoved} className="text-xs" style={{ color: "var(--muted)" }}>
              Алып тастау
            </button>
          )}
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
        {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
      </div>

      <label className="flex items-center gap-1.5 text-xs shrink-0 cursor-pointer" style={{ color: "var(--muted)" }}>
        <input type="checkbox" checked={!hidden} onChange={onToggleHidden} className="w-3.5 h-3.5" />
        Көрсету
      </label>

      <div className="flex flex-col shrink-0">
        <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className="text-xs disabled:opacity-30" style={{ color: "var(--muted)" }}>▲</button>
        <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className="text-xs disabled:opacity-30" style={{ color: "var(--muted)" }}>▼</button>
      </div>
    </div>
  );
}

function HeroPreviewImageField({ imageKey, onUploaded, onRemoved }: {
  imageKey: string | undefined;
  onUploaded: (key: string) => void;
  onRemoved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    const form = new FormData();
    form.append("file", file);
    startTransition(async () => {
      const result = await uploadHeroPreviewImageAction(form);
      if (result.error) setError(result.error);
      else if (result.key) onUploaded(result.key);
    });
  };

  const handleRemove = () => {
    onRemoved();
    removeHeroPreviewImageAction().catch(() => {});
  };

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>Меншікті сурет (screenshot)</label>
      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <div
          className="w-14 h-14 rounded-lg shrink-0 overflow-hidden flex items-center justify-center text-xl"
          style={{ background: "rgba(196,150,62,0.08)" }}
        >
          {imageKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverSrc(imageKey)} alt="Hero алдын ала көрінісі" className="w-full h-full object-cover" />
          ) : (
            <span>📱</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="text-xs font-medium"
              style={{ color: "var(--gold-dark)" }}
            >
              {isPending ? "Жүктелуде..." : imageKey ? "Ауыстыру" : "Суретті жүктеу"}
            </button>
            {imageKey && (
              <button type="button" onClick={handleRemove} className="text-xs" style={{ color: "var(--muted)" }}>
                Алып тастау
              </button>
            )}
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
          {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: "white", border: "1px solid var(--border)" }}>
      <p className="label-caps" style={{ color: "var(--gold)" }}>{title}</p>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>{label}</label>
      <input
        type="text"
        className="input-premium"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>{label}</label>
      <textarea
        className="input-premium resize-none"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function ColorField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  // A local draft so a mid-typing, momentarily-invalid hex (e.g. "#D6A")
  // doesn't get force-corrected on every keystroke — only committed
  // upstream (and only reflected in the live color picker) once it's a
  // full valid 6-digit hex. No mount-sync effect needed: this component
  // only ever mounts after the parent's data has finished loading (see
  // the `if (loading) return ...` guard above), so the useState
  // initializer already captures the real value, and `value` only ever
  // changes afterward as an echo of this component's own `commit()`.
  const [draft, setDraft] = useState(value);

  const isValid = HEX_RE.test(draft);

  const commit = (v: string) => {
    setDraft(v);
    if (HEX_RE.test(v)) onChange(v);
  };

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isValid ? draft : value}
          onChange={(e) => commit(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer shrink-0"
          style={{ border: "1.5px solid var(--border)", padding: 2 }}
        />
        <input
          type="text"
          className="input-premium font-mono"
          value={draft}
          onChange={(e) => commit(e.target.value)}
          placeholder="#D6A84B"
          maxLength={7}
        />
      </div>
      {!isValid && <p className="text-[11px] text-red-500 mt-1">HEX форматы дұрыс емес (мысалы, #D6A84B)</p>}
    </div>
  );
}

/** Relative luminance per WCAG 2.x, used only for a soft contrast hint — never blocks saving. */
function relativeLuminance(hex: string): number {
  const c = hex.slice(1).match(/.{2}/g)!.map((h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA];
  return (lighter + 0.05) / (darker + 0.05);
}

function ColorPreview({ bg, fg }: { bg: string; fg: string }) {
  const bothValid = HEX_RE.test(bg) && HEX_RE.test(fg);
  const ratio = bothValid ? contrastRatio(bg, fg) : null;
  // WCAG AA for large/bold button-label text is 3:1 — a plain, honest
  // heads-up rather than a hard block, per "do not silently mutate the
  // admin's chosen brand color unless necessary."
  const lowContrast = ratio !== null && ratio < 3;

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-xs font-medium" style={{ color: "var(--muted)" }}>Алдын ала қарау</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold"
          style={{ background: bothValid ? bg : "var(--gold)", color: bothValid ? fg : "#1C1917" }}
        >
          Шақыру жасау →
        </button>
        {ratio !== null && (
          <span className="text-xs" style={{ color: lowContrast ? "#dc2626" : "var(--muted)" }}>
            Контраст: {ratio.toFixed(1)}:1{lowContrast ? " — тым төмен, мәтін оқылмауы мүмкін" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
