"use client";

import { useEffect, useMemo, useState } from "react";
import type { InviteTemplate } from "@prisma/client";
import type { Lang } from "@/lib/i18n";
import { InvitationView, type D } from "@/app/i/[slug]/InvitationView";
import type { Template, TemplateCategory } from "@/lib/templates";
import { TEMPLATE_FILTERS } from "@/lib/templates";
import { FEATURE_KEYS } from "@/lib/features";
import { parseTemplateDemoContent, type TemplateDemoContent } from "@/lib/template-demo";
import { TemplateDemoEditor, type DemoTrackOption } from "./TemplateDemoEditor";
import {
  uploadTemplateImageAction, removeTemplateImageAction,
  listTemplateAssetsAction, uploadTemplateAssetAction, deleteTemplateAssetAction, renameTemplateAssetAction,
} from "./actions";
import { type AssetCategory, type TemplateAssetDTO } from "@/lib/template-assets";
import {
  parseVisualConfig,
  resolveSectionOrder,
  EMPTY_VISUAL_CONFIG,
  DEFAULT_SECTION_ORDER,
  HERO_VARIANTS,
  ORNAMENT_VARIANTS,
  GALLERY_VARIANTS,
  DECORATION_IDS,
  FONT_OPTIONS,
  RADIUS_PRESETS,
  SPACING_PRESETS,
  SHADOW_PRESETS,
  BUTTON_STYLES,
  SECTION_CONTENT_FIELDS,
  SECTION_VISIBILITY_FIELDS,
  TEXT_SIZE_PRESETS,
  TEXT_WEIGHTS,
  TEXT_ALIGNS,
  LETTER_SPACINGS,
  OBJECT_FITS,
  ASPECT_RATIOS,
  BACKGROUND_TYPES,
  GRADIENT_PRESETS,
  DECORATION_PLACEMENTS,
  DECORATION_SIZES,
  BORDER_STYLES,
  SPACING_SIZES,
  type VisualConfig,
  type SectionId,
  type ReorderableSectionId,
  type SectionConfig,
  type DecorationId,
  type FontId,
  type RadiusPreset,
  type SpacingPreset,
  type ShadowPreset,
  type ButtonStyle,
  type TypographyRole,
  type DecorationInstance,
  type DecorationPlacement,
  type DecorationSize,
  type TextSizePreset,
  type TextWeight,
  type TextAlign,
  type LetterSpacing,
  type ObjectFit,
  type AspectRatioPreset,
  type BackgroundType,
  type GradientPreset,
  type BorderStyle,
  type SpacingSize,
} from "@/lib/visual-config";

/**
 * The Admin Template Builder (§11–§18 of the Template Engine task) — a
 * full-screen overlay, NOT a free-form page builder: every control here
 * writes into the closed, Zod-validated `VisualConfig` schema (variant
 * enums, decoration IDs, font IDs, preset tokens) — never raw HTML/CSS.
 * The center pane renders the exact same `InvitationView` component used
 * by /templates/[slug] and /i/[slug], fed the CURRENT unsaved builder
 * state via `visualConfigOverride`, so "Builder Preview ≠ Demo ≠ Public"
 * drift is structurally impossible (§17/§20).
 */

const CATEGORIES = TEMPLATE_FILTERS.filter((f) => f.id !== "all").map((f) => ({ value: f.id, label: f.labelKk }));

const HERO_VARIANT_LABELS: Record<string, string> = {
  fullBleed: "Толық фото (full-bleed)",
  arch: "Арка (arch)",
  topBand: "Жоғарғы жолақ (top-band)",
  framed: "Дөңгелек жақтау (framed)",
  fadeDark: "Қараңғыға еніп кету (fade-dark)",
};
const ORNAMENT_LABELS: Record<string, string> = { default: "Әдепкі", ethno: "Ұлттық (ethno)" };
const GALLERY_VARIANT_LABELS: Record<string, string> = {
  default: "Әдепкі",
  romantic: "Романтикалық",
  classicGold: "Классикалық алтын",
  floral: "Гүлді",
  darkLuxury: "Қараңғы люкс",
  ethno: "Ұлттық (ethno)",
};
const DECORATION_LABELS: Record<DecorationId, string> = {
  none: "Жоқ",
  "kazakh-qoshqar": "Қазақы (қошқармүйіз)",
  "classic-hairline": "Классикалық сызық",
  "minimal-line": "Минимал сызық",
  "minimal-diamond": "Минимал ромб",
};
const SECTION_LABELS: Record<SectionId, string> = {
  hero: "Hero (фото/есімдер)",
  hosts: "Той иелері",
  datetime: "Күні мен уақыты",
  invitation: "Шақыру мәтіні",
  countdown: "Санақ (Countdown)",
  program: "Бағдарлама",
  location: "Орналасқан жері",
  gallery: "Галерея",
  wishes: "Тілектер",
  rsvp: "RSVP",
  footer: "Төменгі жолақ (Footer)",
};
const RADIUS_LABELS: Record<string, string> = { sharp: "Тік бұрыш", soft: "Жұмсақ", large: "Дөңгелек" };
const SPACING_LABELS: Record<string, string> = { compact: "Ықшам", comfortable: "Ыңғайлы", generous: "Кең" };
const SHADOW_LABELS: Record<string, string> = { none: "Жоқ", soft: "Жұмсақ", elevated: "Көлеңкелі" };
const BUTTON_STYLE_LABELS: Record<string, string> = { rounded: "Дөңгеленген", pill: "Капсула", square: "Тік бұрыш" };

/** Config presets (§23) — client-side prefill only, never persisted as a
 * separate DB entity. Each patches theme + a few section variants/
 * decorations at once; the admin can freely edit anything afterward. */
const PRESETS: { id: string; label: string; apply: (theme: ThemeForm) => { theme: Partial<ThemeForm>; config: VisualConfig } }[] = [
  {
    id: "blank",
    label: "Бос",
    apply: () => ({ theme: {}, config: { version: 1 } }),
  },
  {
    id: "romantic",
    label: "Романтикалық",
    apply: () => ({
      theme: { bg: "#FDF6F3", accent: "#D6658B", textDark: "#3A1F26", textMuted: "#8A6670", gradient: "from-rose-50 to-pink-50", dark: false },
      config: { version: 1, sections: { hero: { variant: "fullBleed" }, gallery: { variant: "romantic" } } },
    }),
  },
  {
    id: "classic",
    label: "Классикалық алтын",
    apply: () => ({
      theme: { bg: "#FFFDF8", accent: "#C4963E", textDark: "#1C1917", textMuted: "#78716C", gradient: "from-amber-50 to-stone-50", dark: false },
      config: { version: 1, sections: { hero: { variant: "topBand" }, gallery: { variant: "classicGold" }, hosts: { decorationId: "classic-hairline" }, datetime: { decorationId: "classic-hairline" } } },
    }),
  },
  {
    id: "floral",
    label: "Гүлді",
    apply: () => ({
      theme: { bg: "#F7FAF3", accent: "#7A996E", textDark: "#26311F", textMuted: "#6C7C63", gradient: "from-green-50 to-lime-50", dark: false },
      config: { version: 1, sections: { hero: { variant: "framed" }, gallery: { variant: "floral" } } },
    }),
  },
  {
    id: "luxury",
    label: "Қараңғы люкс",
    apply: () => ({
      theme: { bg: "#151210", accent: "#C9A961", textDark: "#F0E6D3", textMuted: "rgba(240,230,211,0.65)", gradient: "from-stone-900 to-neutral-900", dark: true },
      config: { version: 1, sections: { hero: { variant: "fadeDark" }, gallery: { variant: "darkLuxury" } } },
    }),
  },
  {
    id: "kazakh",
    label: "Ұлттық",
    apply: () => ({
      theme: { bg: "#FBF6EA", accent: "#A67C3D", textDark: "#3E2D14", textMuted: "#8A6C3E", gradient: "from-amber-50 via-stone-50 to-yellow-50", dark: false },
      config: {
        version: 1,
        sections: {
          hero: { variant: "arch" },
          hosts: { variant: "ethno", decorationId: "kazakh-qoshqar" },
          datetime: { variant: "ethno", decorationId: "kazakh-qoshqar" },
          invitation: { decorationId: "kazakh-qoshqar" },
          countdown: { variant: "ethno", decorationId: "kazakh-qoshqar" },
          program: { variant: "ethno", decorationId: "kazakh-qoshqar" },
          location: { variant: "ethno", decorationId: "kazakh-qoshqar" },
          gallery: { variant: "ethno" },
          wishes: { variant: "ethno", decorationId: "kazakh-qoshqar" },
          rsvp: { variant: "ethno", decorationId: "kazakh-qoshqar" },
        },
        sectionOrder: DEFAULT_SECTION_ORDER,
      },
    }),
  },
];

interface ThemeForm {
  bg: string;
  accent: string;
  textDark: string;
  textMuted: string;
  gradient: string;
  dark: boolean;
}

interface BasicForm {
  title: string;
  nameKk: string;
  nameRu: string;
  category: string;
  description: string;
  descriptionRu: string;
  isPremium: boolean;
  isActive: boolean;
  previewImage: string;
  demoImage: string;
  emoji: string;
  demoName1: string;
  demoName2: string;
}

function toTheme(t: InviteTemplate): ThemeForm {
  return { bg: t.bg, accent: t.accent, textDark: t.textDark, textMuted: t.textMuted, gradient: t.gradient, dark: t.dark };
}
function toBasic(t: InviteTemplate): BasicForm {
  return {
    title: t.title, nameKk: t.nameKk ?? "", nameRu: t.nameRu ?? "", category: t.category,
    description: t.description ?? "", descriptionRu: t.descriptionRu ?? "",
    isPremium: t.isPremium, isActive: t.isActive,
    previewImage: t.previewImage ?? "", demoImage: t.demoImage ?? "",
    emoji: t.emoji, demoName1: t.demoName1, demoName2: t.demoName2 ?? "",
  };
}

/** Client-safe mirror of lib/storage.ts's resolveStoredImage()/getPublicUrl() — storage.ts itself pulls in the AWS SDK and must never reach a client bundle. */
function resolveImageSrc(value?: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  return `/api/media/${value.split("/").map(encodeURIComponent).join("/")}`;
}

function buildPreviewD(slug: string, demo: TemplateDemoContent, theme: ThemeForm, lang: Lang): D {
  let dateStr = demo.date;
  if (!dateStr) {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + 4);
    dateStr = fallback.toISOString().slice(0, 10);
  }
  const gallery = (demo.gallery ?? []).map((k) => resolveImageSrc(k)).filter((u): u is string => !!u);
  return {
    templateSlug: slug,
    groomName: demo.groomName || "Ерасыл",
    brideName: demo.brideName || "Айгерім",
    hosts: demo.hosts,
    date: dateStr,
    time: demo.time || "18:00",
    location: demo.location || "Grand Hall",
    address: demo.address || "Алматы қаласы",
    invitationText: (lang === "ru" ? demo.invitationTextRu : demo.invitationTextKk) || (lang === "ru" ? "Приглашаем разделить с нами этот день." : "Осы қуанышты күнде бізбен бірге болыңыз."),
    programText: (lang === "ru" ? demo.programTextRu : demo.programTextKk) || "18:00 — Қонақтарды қарсы алу\n19:00 — Той басталады\n21:00 — Би кеші",
    note: lang === "ru" ? demo.noteRu : demo.noteKk,
    dressCode: undefined,
    bgImageUrl: resolveImageSrc(demo.mainPhoto),
    bgType: demo.mainPhoto ? "image" : "color",
    galleryUrls: gallery,
    mapLink: demo.mapLink,
    accentColor: theme.accent,
    // Music intentionally left disabled in the Builder's inline preview:
    // RecommendedTrack URLs need the same server-only resolution as
    // images, and MusicPlayer is position:fixed to the real viewport —
    // inside a scaled preview frame it would escape the phone mockup and
    // float over the whole admin page. The Demo Content tab's track
    // picker still saves musicTrackId correctly either way; it plays
    // normally on the real /templates/[slug] full preview.
    musicEnabled: false,
    sections: [
      { id: "hero", enabled: true },
      { id: "countdown", enabled: true },
      { id: "invitation_text", enabled: true },
      { id: "gallery", enabled: gallery.length > 0 },
      { id: "program", enabled: true },
      { id: "map", enabled: !!demo.mapLink },
      { id: "rsvp", enabled: true },
      { id: "wishes", enabled: true },
    ],
  };
}

type Tab = "template" | "design" | "sections" | "demo" | "card";

export function TemplateBuilder({
  template, tracks, onClose, onSaved,
}: {
  template: InviteTemplate;
  tracks: DemoTrackOption[];
  onClose: () => void;
  onSaved: (t: InviteTemplate) => void;
}) {
  const [theme, setTheme] = useState<ThemeForm>(() => toTheme(template));
  const [basic, setBasic] = useState<BasicForm>(() => toBasic(template));
  const [demo, setDemo] = useState<TemplateDemoContent>(() => parseTemplateDemoContent(template.demoContent));
  const [visualConfig, setVisualConfig] = useState<VisualConfig>(() => parseVisualConfig(template.visualConfig) ?? EMPTY_VISUAL_CONFIG);
  const [tab, setTab] = useState<Tab>("design");
  const [activeSection, setActiveSection] = useState<SectionId>("hero");
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [previewLang, setPreviewLang] = useState<Lang>("kk");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Template Asset Library (§14) — loaded once on mount, shared by every
  // section's Background/Decorations asset pickers below. Client-side
  // state only; uploads/renames/deletes go through the admin-gated Server
  // Actions in actions.ts, never a direct DB call from this component.
  const [assets, setAssets] = useState<TemplateAssetDTO[]>([]);
  useEffect(() => {
    listTemplateAssetsAction().then((res) => { if (res.assets) setAssets(res.assets); });
  }, []);
  // Plain assetId→URL map — the exact shape InvitationView's `assetUrls`
  // prop expects, letting the Builder's live preview resolve the SAME
  // Template Asset Library references the real public page/demo resolve
  // server-side, without this Client Component ever touching the DB
  // itself (see InvitationView's `assetUrls` prop doc).
  const assetUrls = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a.url])), [assets]);

  const patchSection = (id: SectionId, patch: Partial<{ variant: string; decorationId: DecorationId }>) => {
    setVisualConfig((prev) => ({
      ...prev,
      sections: { ...prev.sections, [id]: { ...prev.sections?.[id], ...patch } },
    }));
  };

  const moveSection = (id: ReorderableSectionId, dir: -1 | 1) => {
    setVisualConfig((prev) => {
      const order = prev.sectionOrder ?? DEFAULT_SECTION_ORDER;
      const idx = order.indexOf(id);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= order.length) return prev;
      const next = [...order];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return { ...prev, sectionOrder: next };
    });
  };

  /** Generic per-section field merge for the object-shaped v2 fields
   * (typography/media/background/border/spacing) — each just shallow-
   * merges its patch into the existing sub-object, exactly like
   * patchSection above does for variant/decorationId. `decorations`
   * (an array) and `content` (needs its own nested key logic) use their
   * own dedicated setters below instead. */
  const patchSectionField = (
    id: SectionId, field: "media" | "background" | "border" | "spacing", patch: Record<string, unknown>
  ) => {
    setVisualConfig((prev) => {
      const prevSection = prev.sections?.[id] ?? {};
      const prevValue = (prevSection[field] as object | undefined) ?? {};
      return { ...prev, sections: { ...prev.sections, [id]: { ...prevSection, [field]: { ...prevValue, ...patch } } } } as VisualConfig;
    });
  };

  const patchTypography = (id: SectionId, role: "heading" | "kicker", patch: Partial<TypographyRole>) => {
    setVisualConfig((prev) => {
      const prevSection = prev.sections?.[id] ?? {};
      const prevTypo = prevSection.typography ?? {};
      const prevRole = prevTypo[role] ?? {};
      return { ...prev, sections: { ...prev.sections, [id]: { ...prevSection, typography: { ...prevTypo, [role]: { ...prevRole, ...patch } } } } };
    });
  };

  const patchContentText = (id: SectionId, key: string, lang: Lang, value: string) => {
    setVisualConfig((prev) => {
      const prevSection = prev.sections?.[id] ?? {};
      const prevContent = prevSection.content ?? {};
      const prevText = prevContent.text ?? {};
      const prevEntry = prevText[key] ?? {};
      return {
        ...prev,
        sections: { ...prev.sections, [id]: { ...prevSection, content: { ...prevContent, text: { ...prevText, [key]: { ...prevEntry, [lang]: value } } } } },
      };
    });
  };

  const patchVisibility = (id: SectionId, key: string, value: boolean) => {
    setVisualConfig((prev) => {
      const prevSection = prev.sections?.[id] ?? {};
      const prevContent = prevSection.content ?? {};
      const prevVis = prevContent.visibility ?? {};
      return {
        ...prev,
        sections: { ...prev.sections, [id]: { ...prevSection, content: { ...prevContent, visibility: { ...prevVis, [key]: value } } } },
      };
    });
  };

  const setDecorations = (id: SectionId, updater: (prev: DecorationInstance[]) => DecorationInstance[]) => {
    setVisualConfig((prev) => {
      const prevSection = prev.sections?.[id] ?? {};
      const prevDecos = prevSection.decorations ?? [];
      return { ...prev, sections: { ...prev.sections, [id]: { ...prevSection, decorations: updater(prevDecos) } } };
    });
  };

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const { theme: themePatch, config } = preset.apply(theme);
    setTheme((prev) => ({ ...prev, ...themePatch }));
    setVisualConfig(config);
  };

  const previewTmpl: Template = useMemo(() => ({
    id: template.id,
    slug: template.slug,
    name: basic.title,
    nameKk: basic.nameKk || basic.title,
    nameRu: basic.nameRu || basic.title,
    category: basic.category as TemplateCategory,
    style: template.style,
    description: basic.description,
    descKk: basic.description,
    descRu: basic.descriptionRu || basic.description,
    price: 0,
    isPremium: basic.isPremium,
    tags: [], tagsKk: [], tagsRu: [],
    bg: theme.bg, gradient: theme.gradient, accent: theme.accent, textDark: theme.textDark, textMuted: theme.textMuted, dark: theme.dark,
    emoji: basic.emoji, demoName1: demo.groomName || basic.demoName1, demoName2: demo.brideName || basic.demoName2,
    previewImage: null, demoImage: null, demoContent: demo,
    visualConfig: null, // never read directly — visualConfigOverride below always wins in the Builder
  }), [template.id, template.slug, template.style, basic, theme, demo]);

  const previewD = useMemo(() => buildPreviewD(template.slug, demo, theme, previewLang), [template.slug, demo, theme, previewLang]);

  const save = async (overrides?: Partial<{ isActive: boolean }>) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        title: basic.title,
        nameKk: basic.nameKk || null,
        nameRu: basic.nameRu || null,
        category: basic.category,
        description: basic.description || null,
        descriptionRu: basic.descriptionRu || null,
        isPremium: basic.isPremium,
        isActive: overrides?.isActive ?? basic.isActive,
        emoji: basic.emoji,
        demoName1: demo.groomName || basic.demoName1 || "Атыңыз",
        demoName2: demo.brideName || basic.demoName2 || null,
        bg: theme.bg,
        accent: theme.accent,
        textDark: theme.textDark,
        textMuted: theme.textMuted,
        gradient: theme.gradient,
        dark: theme.dark,
        demoContent: demo,
        visualConfig,
      };
      const res = await fetch(`/api/admin/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Қате болды");
        return;
      }
      const updated = (await res.json()) as InviteTemplate;
      if (overrides?.isActive !== undefined) setBasic((p) => ({ ...p, isActive: overrides.isActive as boolean }));
      setNotice(overrides?.isActive ? "Белсенді етілді" : "Сақталды");
      onSaved(updated);
    } catch {
      setError("Желі қатесі");
    } finally {
      setSaving(false);
    }
  };

  const orderedIds = resolveSectionOrder(visualConfig);
  const sectionNavIds: SectionId[] = ["hero", ...orderedIds, "footer"];

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: "#F5F0E8" }}>
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 gap-4" style={{ background: "white", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="text-sm font-medium shrink-0" style={{ color: "var(--muted)" }}>← Артқа</button>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: "var(--charcoal)" }}>{basic.title || "Атаусыз шаблон"}</p>
            <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{template.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {error && <span className="text-xs text-red-600">{error}</span>}
          {notice && !error && <span className="text-xs" style={{ color: "#16a34a" }}>{notice}</span>}
          <a
            href={`/templates/${encodeURIComponent(template.slug)}?lang=kk`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold px-3 py-2 rounded-lg"
            style={{ color: "var(--gold-dark)", border: "1px solid var(--border)" }}
          >
            Толық preview ↗
          </a>
          <button
            onClick={() => save()}
            disabled={saving}
            className="text-xs font-semibold px-4 py-2 rounded-lg text-white"
            style={{ background: "var(--charcoal)", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Сақталуда…" : "Сақтау"}
          </button>
          <button
            onClick={() => save({ isActive: true })}
            disabled={saving}
            className="btn-gold text-xs"
          >
            Белсенді ету
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* LEFT: tab + section navigator */}
        <div className="w-56 shrink-0 flex flex-col overflow-y-auto" style={{ background: "white", borderRight: "1px solid var(--border)" }}>
          <div className="p-2 flex flex-col gap-0.5">
            <NavButton label="Үлгі" active={tab === "template"} onClick={() => setTab("template")} />
            <NavButton label="Дизайн" active={tab === "design"} onClick={() => setTab("design")} />
            <NavButton label="Бөлімдер" active={tab === "sections"} onClick={() => setTab("sections")} />
            <NavButton label="Демо мазмұн" active={tab === "demo"} onClick={() => setTab("demo")} />
            <NavButton label="Каталог карточкасы" active={tab === "card"} onClick={() => setTab("card")} />
          </div>

          {tab === "sections" && (
            <div className="px-2 pb-3 flex flex-col gap-0.5" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="label-caps px-2.5 pt-3 pb-1" style={{ color: "var(--gold)" }}>Бөлім реті</p>
              {sectionNavIds.map((id) => {
                const isReorderable = id !== "hero" && id !== "footer";
                const idx = isReorderable ? orderedIds.indexOf(id as ReorderableSectionId) : -1;
                return (
                  <div key={id} className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveSection(id)}
                      className="flex-1 text-left px-2.5 py-1.5 rounded-lg text-xs font-medium truncate"
                      style={{
                        background: activeSection === id ? "var(--cream)" : "transparent",
                        color: activeSection === id ? "var(--charcoal)" : "var(--muted)",
                      }}
                    >
                      {SECTION_LABELS[id]}
                    </button>
                    {isReorderable && (
                      <div className="flex flex-col shrink-0">
                        <button
                          type="button"
                          onClick={() => moveSection(id as ReorderableSectionId, -1)}
                          disabled={idx <= 0}
                          className="text-[10px] leading-none px-1 disabled:opacity-20"
                          style={{ color: "var(--muted)" }}
                          aria-label="Жоғары"
                        >▲</button>
                        <button
                          type="button"
                          onClick={() => moveSection(id as ReorderableSectionId, 1)}
                          disabled={idx >= orderedIds.length - 1}
                          className="text-[10px] leading-none px-1 disabled:opacity-20"
                          style={{ color: "var(--muted)" }}
                          aria-label="Төмен"
                        >▼</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CENTER: live preview */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: "#E8E2D5" }}>
          <div className="shrink-0 flex items-center justify-center gap-3 py-2.5" style={{ background: "white", borderBottom: "1px solid var(--border)" }}>
            <SegButton label="Mobile 390" active={previewMode === "mobile"} onClick={() => setPreviewMode("mobile")} />
            <SegButton label="Desktop" active={previewMode === "desktop"} onClick={() => setPreviewMode("desktop")} />
            <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
            <SegButton label="ҚАЗ" active={previewLang === "kk"} onClick={() => setPreviewLang("kk")} />
            <SegButton label="РУС" active={previewLang === "ru"} onClick={() => setPreviewLang("ru")} />
          </div>
          <div className="flex-1 overflow-auto flex justify-center py-6">
            <div
              className="overflow-y-auto overflow-x-hidden shrink-0"
              style={{
                width: previewMode === "mobile" ? 390 : "min(1200px, 100%)",
                height: "calc(100vh - 170px)",
                background: "white",
                borderRadius: previewMode === "mobile" ? 28 : 12,
                boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
                border: "8px solid #2A2622",
              }}
            >
              <InvitationView
                d={previewD}
                tmpl={previewTmpl}
                entitled={FEATURE_KEYS}
                wishes={[]}
                invite={null}
                demo
                lang={previewLang}
                visualConfigOverride={visualConfig}
                assetUrls={assetUrls}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: inspector */}
        <div className="w-80 shrink-0 overflow-y-auto p-5 flex flex-col gap-5" style={{ background: "white", borderLeft: "1px solid var(--border)" }}>
          {tab === "template" && <TemplateTab basic={basic} setBasic={setBasic} />}
          {tab === "design" && (
            <DesignTab
              theme={theme}
              setTheme={setTheme}
              themeExtras={visualConfig.theme}
              setThemeExtras={(patch) => setVisualConfig((prev) => ({ ...prev, theme: { ...prev.theme, ...patch } }))}
              onApplyPreset={applyPreset}
            />
          )}
          {tab === "sections" && (
            <SectionInspector
              sectionId={activeSection}
              config={visualConfig.sections?.[activeSection]}
              onChange={(patch) => patchSection(activeSection, patch)}
              onPatchField={(field, patch) => patchSectionField(activeSection, field, patch)}
              onPatchTypography={(role, patch) => patchTypography(activeSection, role, patch)}
              onPatchContentText={(key, lang, value) => patchContentText(activeSection, key, lang, value)}
              onPatchVisibility={(key, value) => patchVisibility(activeSection, key, value)}
              onSetDecorations={(updater) => setDecorations(activeSection, updater)}
              assets={assets}
              onAssetsChange={setAssets}
            />
          )}
          {tab === "demo" && (
            <TemplateDemoEditor
              templateId={template.id}
              slug={template.slug}
              value={demo}
              onChange={(patch) => setDemo((p) => ({ ...p, ...patch }))}
              tracks={tracks}
            />
          )}
          {tab === "card" && (
            <CardTab
              basic={basic}
              setBasic={setBasic}
              templateId={template.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function NavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left px-3 py-2 rounded-lg text-sm font-semibold"
      style={{ background: active ? "var(--cream)" : "transparent", color: active ? "var(--charcoal)" : "var(--muted)" }}
    >
      {label}
    </button>
  );
}

function SegButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-semibold px-3 py-1.5 rounded-full"
      style={{ background: active ? "var(--charcoal)" : "transparent", color: active ? "white" : "var(--muted)" }}
    >
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = { border: "1.5px solid var(--border)", color: "var(--charcoal)" };
const inputClass = "w-full px-3 py-2 rounded-xl text-sm outline-none";

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} style={inputStyle}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function TemplateTab({ basic, setBasic }: { basic: BasicForm; setBasic: (fn: (p: BasicForm) => BasicForm) => void }) {
  const set = <K extends keyof BasicForm>(k: K, v: BasicForm[K]) => setBasic((p) => ({ ...p, [k]: v }));
  return (
    <>
      <p className="label-caps" style={{ color: "var(--gold)" }}>Негізгі ақпарат</p>
      <Field label="Атауы"><input className={inputClass} style={inputStyle} value={basic.title} onChange={(e) => set("title", e.target.value)} /></Field>
      <Field label="Атауы (қазақша)"><input className={inputClass} style={inputStyle} value={basic.nameKk} onChange={(e) => set("nameKk", e.target.value)} /></Field>
      <Field label="Атауы (орысша)"><input className={inputClass} style={inputStyle} value={basic.nameRu} onChange={(e) => set("nameRu", e.target.value)} /></Field>
      <Field label="Санат"><Select value={basic.category} onChange={(v) => set("category", v)} options={CATEGORIES} /></Field>
      <Field label="Сипаттама (қазақша)"><textarea rows={3} className={`${inputClass} resize-none`} style={inputStyle} value={basic.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <Field label="Сипаттама (орысша)"><textarea rows={3} className={`${inputClass} resize-none`} style={inputStyle} value={basic.descriptionRu} onChange={(e) => set("descriptionRu", e.target.value)} /></Field>
      <label className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--charcoal)" }}>
        <input type="checkbox" checked={basic.isPremium} onChange={(e) => set("isPremium", e.target.checked)} />
        Premium
      </label>
    </>
  );
}

interface ThemeExtrasForm {
  headingFont?: FontId;
  bodyFont?: FontId;
  radius?: RadiusPreset;
  spacing?: SpacingPreset;
  shadow?: ShadowPreset;
  buttonStyle?: ButtonStyle;
}

function DesignTab({
  theme, setTheme, themeExtras, setThemeExtras, onApplyPreset,
}: {
  theme: ThemeForm;
  setTheme: (fn: (p: ThemeForm) => ThemeForm) => void;
  themeExtras?: ThemeExtrasForm;
  setThemeExtras: (patch: ThemeExtrasForm) => void;
  onApplyPreset: (id: string) => void;
}) {
  const set = <K extends keyof ThemeForm>(k: K, v: ThemeForm[K]) => setTheme((p) => ({ ...p, [k]: v }));
  return (
    <>
      <div>
        <p className="label-caps mb-2" style={{ color: "var(--gold)" }}>Дайын стильдер</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => onApplyPreset(p.id)}
              className="text-xs px-2.5 py-1.5 rounded-full font-medium"
              style={{ background: "var(--cream)", color: "var(--charcoal)", border: "1px solid var(--border)" }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <p className="label-caps" style={{ color: "var(--gold)" }}>Түстер</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Фон"><ColorInput value={theme.bg} onChange={(v) => set("bg", v)} /></Field>
        <Field label="Акцент (негізгі)"><ColorInput value={theme.accent} onChange={(v) => set("accent", v)} /></Field>
        <Field label="Қою мәтін"><ColorInput value={theme.textDark} onChange={(v) => set("textDark", v)} /></Field>
        <Field label="Боз мәтін"><ColorInput value={theme.textMuted} onChange={(v) => set("textMuted", v)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--charcoal)" }}>
        <input type="checkbox" checked={theme.dark} onChange={(e) => set("dark", e.target.checked)} />
        Қараңғы тема
      </label>

      <p className="label-caps" style={{ color: "var(--gold)" }}>Типографика</p>
      <Field label="Тақырып қарпі">
        <Select
          value={themeExtras?.headingFont ?? ""}
          onChange={(v) => setThemeExtras({ headingFont: (v || undefined) as FontId | undefined })}
          options={[{ value: "", label: "— әдепкі (Serif) —" }, ...FONT_OPTIONS.map((f) => ({ value: f.id, label: f.label }))]}
        />
      </Field>
      <Field label="Дене мәтін қарпі">
        <Select
          value={themeExtras?.bodyFont ?? ""}
          onChange={(v) => setThemeExtras({ bodyFont: (v || undefined) as FontId | undefined })}
          options={[{ value: "", label: "— әдепкі —" }, ...FONT_OPTIONS.map((f) => ({ value: f.id, label: f.label }))]}
        />
      </Field>

      <p className="label-caps" style={{ color: "var(--gold)" }}>Пішін</p>
      <div className="grid grid-cols-1 gap-3">
        <Field label="Бұрыш (radius)">
          <Select
            value={themeExtras?.radius ?? ""}
            onChange={(v) => setThemeExtras({ radius: (v || undefined) as RadiusPreset | undefined })}
            options={[{ value: "", label: "— әдепкі —" }, ...RADIUS_PRESETS.map((r) => ({ value: r, label: RADIUS_LABELS[r] }))]}
          />
        </Field>
        <Field label="Аралық (spacing)">
          <Select
            value={themeExtras?.spacing ?? ""}
            onChange={(v) => setThemeExtras({ spacing: (v || undefined) as SpacingPreset | undefined })}
            options={[{ value: "", label: "— әдепкі —" }, ...SPACING_PRESETS.map((s) => ({ value: s, label: SPACING_LABELS[s] }))]}
          />
        </Field>
        <Field label="Көлеңке (shadow)">
          <Select
            value={themeExtras?.shadow ?? ""}
            onChange={(v) => setThemeExtras({ shadow: (v || undefined) as ShadowPreset | undefined })}
            options={[{ value: "", label: "— әдепкі —" }, ...SHADOW_PRESETS.map((s) => ({ value: s, label: SHADOW_LABELS[s] }))]}
          />
        </Field>
        <Field label="Батырма стилі">
          <Select
            value={themeExtras?.buttonStyle ?? ""}
            onChange={(v) => setThemeExtras({ buttonStyle: (v || undefined) as ButtonStyle | undefined })}
            options={[{ value: "", label: "— әдепкі —" }, ...BUTTON_STYLES.map((b) => ({ value: b, label: BUTTON_STYLE_LABELS[b] }))]}
          />
        </Field>
      </div>
    </>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#C4963E"} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 rounded-lg border-0 shrink-0 cursor-pointer" />
      <input className={inputClass} style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/**
 * The v2 per-section inspector (§19/§20 of the Full Production Template
 * Designer task) — 8 collapsible accordion groups: Content, Variant,
 * Typography, Media, Background, Decorations, Border & Shadow, Spacing.
 * Groups whose control has NO real renderer behavior for the current
 * section are simply not shown (§17/§26 — e.g. Hero's 5 fixed photoMode
 * compositions never go through SectionShell, so Background/Decorations/
 * Border/Spacing would silently do nothing there; Footer is a fixed
 * product-policy bar with content-only overrides).
 */
function SectionInspector({
  sectionId, config, onChange, onPatchField, onPatchTypography, onPatchContentText, onPatchVisibility, onSetDecorations, assets, onAssetsChange,
}: {
  sectionId: SectionId;
  config?: SectionConfig;
  onChange: (patch: Partial<{ variant: string; decorationId: DecorationId }>) => void;
  onPatchField: (field: "media" | "background" | "border" | "spacing", patch: Record<string, unknown>) => void;
  onPatchTypography: (role: "heading" | "kicker", patch: Partial<TypographyRole>) => void;
  onPatchContentText: (key: string, lang: Lang, value: string) => void;
  onPatchVisibility: (key: string, value: boolean) => void;
  onSetDecorations: (updater: (prev: DecorationInstance[]) => DecorationInstance[]) => void;
  assets: TemplateAssetDTO[];
  onAssetsChange: (fn: (prev: TemplateAssetDTO[]) => TemplateAssetDTO[]) => void;
}) {
  const isHero = sectionId === "hero";
  const isFooter = sectionId === "footer";
  const isGallery = sectionId === "gallery";
  // Capability audit (§6 of the follow-up task): the "heading" typography
  // role only has an actual heading-ish text element to style in these
  // sections (renderer-verified — see InvitationView.tsx's
  // typographyStyle("<id>","heading") call sites). Invitation/Countdown/
  // Gallery/Program only ever render a single kicker-style label, so
  // showing a second "heading" sub-editor there would be a dead control
  // with no rendering effect.
  const HEADING_ROLE_SECTIONS: readonly SectionId[] = ["hero", "hosts", "datetime", "location", "wishes", "rsvp", "footer"];
  const hasHeadingRole = HEADING_ROLE_SECTIONS.includes(sectionId);

  const variantOptions =
    sectionId === "hero"
      ? HERO_VARIANTS.map((v) => ({ value: v, label: HERO_VARIANT_LABELS[v] }))
      : sectionId === "gallery"
        ? GALLERY_VARIANTS.map((v) => ({ value: v, label: GALLERY_VARIANT_LABELS[v] }))
        : ORNAMENT_VARIANTS.map((v) => ({ value: v, label: ORNAMENT_LABELS[v] }));
  // Gallery's kicker DOES render through the same SectionDecoration/
  // decorationId system as every other body section (verified against
  // InvitationView.tsx's sectionDecorationId("gallery") call sites) —
  // Hero and Footer are the only two that genuinely never consume it
  // (Hero renders its own kicker/name markup directly; Footer has no
  // SectionDecoration at all).
  const showDecorationId = !isHero && !isFooter;
  // Capability audit finding: Hosts and Datetime never consume
  // `sectionOrnament`/`resolveSectionVariant` anywhere in the renderer
  // (verified — they only read `decorationId`, a separate field already
  // exposed via showDecorationId above) — the ornament Variant dropdown
  // would be a dead control there, so it's hidden rather than shown non-
  // functionally. Every other non-footer section genuinely consumes its
  // own variant (ornament boolean, gallery frame, or hero composition).
  const showVariant = !isFooter && sectionId !== "hosts" && sectionId !== "datetime";
  // Background/Decorations/Border/Spacing are now wired for every section,
  // including Hero (as safe overrides layered on top of its existing
  // photoMode composition — see InvitationView.tsx's heroFrameStyle/
  // heroBackground*/heroDecorations) and Footer (now SectionShell-wrapped).
  const showShellGroups = true;
  const contentFields = SECTION_CONTENT_FIELDS[sectionId] ?? [];
  const visibilityFields = SECTION_VISIBILITY_FIELDS[sectionId] ?? [];

  return (
    <div className="flex flex-col gap-2.5">
      <p className="label-caps" style={{ color: "var(--gold)" }}>{SECTION_LABELS[sectionId]}</p>

      {(contentFields.length > 0 || visibilityFields.length > 0) && (
        <AccordionGroup title="1. Мазмұн (Content)" defaultOpen>
          {contentFields.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>{f.label}</label>
              <div className="grid grid-cols-2 gap-2">
                {(["kk", "ru"] as const).map((lang) =>
                  f.multiline ? (
                    <textarea
                      key={lang} rows={2} placeholder={lang.toUpperCase()} className={`${inputClass} resize-none`} style={inputStyle}
                      value={config?.content?.text?.[f.key]?.[lang] ?? ""}
                      onChange={(e) => onPatchContentText(f.key, lang, e.target.value)}
                    />
                  ) : (
                    <input
                      key={lang} placeholder={lang.toUpperCase()} className={inputClass} style={inputStyle}
                      value={config?.content?.text?.[f.key]?.[lang] ?? ""}
                      onChange={(e) => onPatchContentText(f.key, lang, e.target.value)}
                    />
                  )
                )}
              </div>
            </div>
          ))}
          {visibilityFields.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1" style={{ borderTop: contentFields.length > 0 ? "1px dashed var(--border)" : undefined }}>
              {visibilityFields.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--charcoal)" }}>
                  <input type="checkbox" checked={config?.content?.visibility?.[f.key] ?? true} onChange={(e) => onPatchVisibility(f.key, e.target.checked)} />
                  {f.label}
                </label>
              ))}
            </div>
          )}
        </AccordionGroup>
      )}

      {showVariant && (
        <AccordionGroup title="2. Композиция (Variant)">
          <Field label="Нұсқа (variant)">
            <Select value={config?.variant ?? ""} onChange={(v) => onChange({ variant: v })} options={[{ value: "", label: "— әдепкі —" }, ...variantOptions]} />
          </Field>
          {showDecorationId && (
            <Field label="Оюлар (decoration)">
              <Select
                value={config?.decorationId ?? ""}
                onChange={(v) => onChange({ decorationId: (v || "none") as DecorationId })}
                options={[{ value: "", label: "— әдепкі —" }, ...DECORATION_IDS.map((id) => ({ value: id, label: DECORATION_LABELS[id] }))]}
              />
            </Field>
          )}
          {isHero && (
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
              &ldquo;Арка&rdquo; нұсқасы Қазақ Этно стиліндегі жақтау мен су таңбаны автоматты түрде қосады — бұл нұсқаның өзіндік дизайны, бөлек ою таңдаудың қажеті жоқ.
            </p>
          )}
        </AccordionGroup>
      )}

      <AccordionGroup title="3. Мәтін (Typography)">
        <TypographyRoleEditor label={isFooter ? "CTA сілтемесі" : "Kicker"} role={config?.typography?.kicker} onChange={(patch) => onPatchTypography("kicker", patch)} />
        {hasHeadingRole && (
          <TypographyRoleEditor label={isFooter ? "Брендинг мәтіні" : "Тақырып (heading)"} role={config?.typography?.heading} onChange={(patch) => onPatchTypography("heading", patch)} />
        )}
      </AccordionGroup>

      {(isGallery || isHero) && (
        <AccordionGroup title="4. Фото (Media)">
          <Field label="Object-fit">
            <Select
              value={config?.media?.fit ?? ""}
              onChange={(v) => onPatchField("media", { fit: (v || undefined) as ObjectFit | undefined })}
              options={[{ value: "", label: "— әдепкі (cover) —" }, ...OBJECT_FITS.map((f) => ({ value: f, label: f }))]}
            />
          </Field>
          {isGallery && (
            <Field label="Пропорция (aspect ratio)">
              <Select
                value={config?.media?.aspectRatio ?? ""}
                onChange={(v) => onPatchField("media", { aspectRatio: (v || undefined) as AspectRatioPreset | undefined })}
                options={[{ value: "", label: "— әдепкі (4/5) —" }, ...ASPECT_RATIOS.map((a) => ({ value: a, label: a }))]}
              />
            </Field>
          )}
          {isHero && (
            <>
              <Field label="Орны (position)">
                <Select
                  value={config?.media?.position ?? ""}
                  onChange={(v) => onPatchField("media", { position: v || undefined })}
                  options={[{ value: "", label: "center" }, { value: "top", label: "top" }, { value: "bottom", label: "bottom" }, { value: "left", label: "left" }, { value: "right", label: "right" }]}
                />
              </Field>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                Фото пропорциясы мен бұрышы таңдалған Hero нұсқасының (variant) өз композициясына тәуелді — оны бұзбау үшін реттелмейді.
              </p>
            </>
          )}
        </AccordionGroup>
      )}

      {showShellGroups && (
        <>
          <AccordionGroup title="5. Фон (Background)">
            <BackgroundEditor background={config?.background} onChange={(patch) => onPatchField("background", patch)} assets={assets} onAssetsChange={onAssetsChange} />
          </AccordionGroup>

          <AccordionGroup title="6. Декор (Decorations)">
            <DecorationsEditor decorations={config?.decorations ?? []} onChange={onSetDecorations} assets={assets} onAssetsChange={onAssetsChange} />
          </AccordionGroup>

          <AccordionGroup title="7. Жиек және көлеңке (Border & Shadow)">
            <Field label="Жиек стилі">
              <Select
                value={config?.border?.style ?? ""}
                onChange={(v) => onPatchField("border", { style: (v || undefined) as BorderStyle | undefined })}
                options={[{ value: "", label: "Жоқ" }, ...BORDER_STYLES.map((s) => ({ value: s, label: s === "none" ? "Жоқ" : s === "thin" ? "Жіңішке" : "Орташа" }))]}
              />
            </Field>
            {config?.border?.style && config.border.style !== "none" && (
              <Field label="Жиек түсі"><ColorInput value={config?.border?.color ?? "#C4963E"} onChange={(v) => onPatchField("border", { color: v })} /></Field>
            )}
            <Field label="Бұрыш (radius)">
              <Select
                value={config?.border?.radius ?? ""}
                onChange={(v) => onPatchField("border", { radius: (v || undefined) as RadiusPreset | undefined })}
                options={[{ value: "", label: "— әдепкі —" }, ...RADIUS_PRESETS.map((r) => ({ value: r, label: RADIUS_LABELS[r] }))]}
              />
            </Field>
            <Field label="Көлеңке (shadow)">
              <Select
                value={config?.border?.shadow ?? ""}
                onChange={(v) => onPatchField("border", { shadow: (v || undefined) as ShadowPreset | undefined })}
                options={[{ value: "", label: "— әдепкі —" }, ...SHADOW_PRESETS.map((s) => ({ value: s, label: SHADOW_LABELS[s] }))]}
              />
            </Field>
          </AccordionGroup>

          <AccordionGroup title="8. Аралық (Spacing)">
            <Field label="Жоғарғы аралық (top)">
              <Select
                value={config?.spacing?.top ?? ""}
                onChange={(v) => onPatchField("spacing", { top: (v || undefined) as SpacingSize | undefined })}
                options={[{ value: "", label: "— әдепкі —" }, ...SPACING_SIZES.map((s) => ({ value: s, label: s }))]}
              />
            </Field>
            <Field label="Төменгі аралық (bottom)">
              <Select
                value={config?.spacing?.bottom ?? ""}
                onChange={(v) => onPatchField("spacing", { bottom: (v || undefined) as SpacingSize | undefined })}
                options={[{ value: "", label: "— әдепкі —" }, ...SPACING_SIZES.map((s) => ({ value: s, label: s }))]}
              />
            </Field>
            <Field label="Ішкі аралық (gap)">
              <Select
                value={config?.spacing?.gap ?? ""}
                onChange={(v) => onPatchField("spacing", { gap: (v || undefined) as SpacingSize | undefined })}
                options={[{ value: "", label: "— әдепкі —" }, ...SPACING_SIZES.map((s) => ({ value: s, label: s }))]}
              />
            </Field>
          </AccordionGroup>
        </>
      )}
    </div>
  );
}

function AccordionGroup({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        style={{ background: open ? "var(--cream)" : "white" }}
      >
        <span className="text-xs font-bold" style={{ color: "var(--charcoal)" }}>{title}</span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>{open ? "−" : "+"}</span>
      </button>
      {open && <div className="p-3 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border)" }}>{children}</div>}
    </div>
  );
}

function TypographyRoleEditor({ label, role, onChange }: { label: string; role?: TypographyRole; onChange: (patch: Partial<TypographyRole>) => void }) {
  return (
    <div className="flex flex-col gap-2 pb-3 mb-1" style={{ borderBottom: "1px dashed var(--border)" }}>
      <p className="text-xs font-semibold" style={{ color: "var(--charcoal)" }}>{label}</p>
      <Field label="Қаріп (font)">
        <Select
          value={role?.font ?? ""}
          onChange={(v) => onChange({ font: (v || undefined) as FontId | undefined })}
          options={[{ value: "", label: "— әдепкі —" }, ...FONT_OPTIONS.map((f) => ({ value: f.id, label: f.label }))]}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Өлшем (size)">
          <Select
            value={role?.size ?? ""}
            onChange={(v) => onChange({ size: (v || undefined) as TextSizePreset | undefined })}
            options={[{ value: "", label: "— әдепкі —" }, ...TEXT_SIZE_PRESETS.map((s) => ({ value: s, label: s }))]}
          />
        </Field>
        <Field label="Салмақ (weight)">
          <Select
            value={role?.weight ?? ""}
            onChange={(v) => onChange({ weight: (v || undefined) as TextWeight | undefined })}
            options={[{ value: "", label: "— әдепкі —" }, ...TEXT_WEIGHTS.map((w) => ({ value: w, label: w }))]}
          />
        </Field>
      </div>
      <Field label="Түс (color)"><ColorInput value={role?.color ?? "#1C1917"} onChange={(v) => onChange({ color: v })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Туралау (align)">
          <Select
            value={role?.align ?? ""}
            onChange={(v) => onChange({ align: (v || undefined) as TextAlign | undefined })}
            options={[{ value: "", label: "— әдепкі —" }, ...TEXT_ALIGNS.map((a) => ({ value: a, label: a }))]}
          />
        </Field>
        <Field label="Әріп аралығы">
          <Select
            value={role?.letterSpacing ?? ""}
            onChange={(v) => onChange({ letterSpacing: (v || undefined) as LetterSpacing | undefined })}
            options={[{ value: "", label: "— әдепкі —" }, ...LETTER_SPACINGS.map((l) => ({ value: l, label: l }))]}
          />
        </Field>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--charcoal)" }}>
          <input type="checkbox" checked={role?.uppercase ?? false} onChange={(e) => onChange({ uppercase: e.target.checked })} /> Бас әріп
        </label>
        <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--charcoal)" }}>
          <input type="checkbox" checked={role?.italic ?? false} onChange={(e) => onChange({ italic: e.target.checked })} /> Курсив
        </label>
      </div>
    </div>
  );
}

function BackgroundEditor({
  background, onChange, assets, onAssetsChange,
}: {
  background?: { type?: BackgroundType; color?: string; gradient?: GradientPreset; assetId?: string; fit?: ObjectFit; position?: string; overlayColor?: string; overlayOpacity?: number };
  onChange: (patch: Record<string, unknown>) => void;
  assets: TemplateAssetDTO[];
  onAssetsChange: (fn: (prev: TemplateAssetDTO[]) => TemplateAssetDTO[]) => void;
}) {
  const type = background?.type ?? "inherit";
  const TYPE_LABELS: Record<BackgroundType, string> = { inherit: "Әдепкі (inherit)", solid: "Бір түсті", gradient: "Градиент", image: "Сурет" };
  return (
    <>
      <Field label="Түрі (type)">
        <Select value={type} onChange={(v) => onChange({ type: v as BackgroundType })} options={BACKGROUND_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))} />
      </Field>
      {type === "solid" && (
        <Field label="Түс"><ColorInput value={background?.color ?? "#FAF8F3"} onChange={(v) => onChange({ color: v })} /></Field>
      )}
      {type === "gradient" && (
        <Field label="Градиент үлгісі">
          <Select value={background?.gradient ?? "none"} onChange={(v) => onChange({ gradient: v as GradientPreset })} options={GRADIENT_PRESETS.map((g) => ({ value: g, label: g }))} />
        </Field>
      )}
      {type === "image" && (
        <>
          <AssetPickerField
            label="Фон суреті" categories={["background", "texture"]} selectedId={background?.assetId}
            onSelect={(id) => onChange({ assetId: id })} assets={assets} onAssetsChange={onAssetsChange}
          />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Fit">
              <Select
                value={background?.fit ?? ""}
                onChange={(v) => onChange({ fit: (v || undefined) as ObjectFit | undefined })}
                options={[{ value: "", label: "cover" }, ...OBJECT_FITS.map((f) => ({ value: f, label: f }))]}
              />
            </Field>
            <Field label="Орны (position)">
              <Select
                value={background?.position ?? ""}
                onChange={(v) => onChange({ position: v || undefined })}
                options={[{ value: "", label: "center" }, { value: "top", label: "top" }, { value: "bottom", label: "bottom" }, { value: "left", label: "left" }, { value: "right", label: "right" }]}
              />
            </Field>
          </div>
          <Field label="Үстіңгі қабат түсі (overlay)"><ColorInput value={background?.overlayColor ?? "#000000"} onChange={(v) => onChange({ overlayColor: v })} /></Field>
          <Field label={`Үстіңгі қабат мөлдірлігі: ${background?.overlayOpacity ?? 0}`}>
            <input type="range" min={0} max={1} step={0.05} value={background?.overlayOpacity ?? 0} onChange={(e) => onChange({ overlayOpacity: Number(e.target.value) })} className="w-full" />
          </Field>
        </>
      )}
    </>
  );
}

function DecorationsEditor({
  decorations, onChange, assets, onAssetsChange,
}: {
  decorations: DecorationInstance[];
  onChange: (updater: (prev: DecorationInstance[]) => DecorationInstance[]) => void;
  assets: TemplateAssetDTO[];
  onAssetsChange: (fn: (prev: TemplateAssetDTO[]) => TemplateAssetDTO[]) => void;
}) {
  const decorationAssets = assets.filter((a) => a.category === "decoration" || a.category === "frame" || a.category === "texture");
  const addDecoration = () => {
    if (decorationAssets.length === 0 || decorations.length >= 6) return;
    onChange((prev) => [...prev, { assetId: decorationAssets[0].id, placement: "top-center" }]);
  };
  const updateAt = (i: number, patch: Partial<DecorationInstance>) => onChange((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const removeAt = (i: number) => onChange((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-3">
      {/* Library browser/uploader — shown unconditionally (not just once an
          instance exists) so an admin can seed decoration/frame/texture
          assets into the library BEFORE adding their first decoration
          instance below; the "+ Ою қосу" button stays disabled until at
          least one such asset exists. */}
      <AssetPickerField label="Кітапхана (decoration/frame/texture)" categories={["decoration", "frame", "texture"]} onSelect={() => {}} assets={assets} onAssetsChange={onAssetsChange} />
      {decorations.map((d, i) => (
        <div key={i} className="p-2.5 rounded-lg flex flex-col gap-2" style={{ border: "1px solid var(--border)", background: "var(--cream)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--charcoal)" }}>Ою #{i + 1}</span>
            <button type="button" onClick={() => removeAt(i)} className="text-xs" style={{ color: "#dc2626" }}>Өшіру</button>
          </div>
          <AssetPickerField
            label="Сурет" categories={["decoration", "frame", "texture"]} selectedId={d.assetId}
            onSelect={(id) => id && updateAt(i, { assetId: id })} assets={assets} onAssetsChange={onAssetsChange}
          />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Орналасу">
              <Select value={d.placement} onChange={(v) => updateAt(i, { placement: v as DecorationPlacement })} options={DECORATION_PLACEMENTS.map((p) => ({ value: p, label: p }))} />
            </Field>
            <Field label="Өлшем">
              <Select value={d.size ?? "md"} onChange={(v) => updateAt(i, { size: v as DecorationSize })} options={DECORATION_SIZES.map((s) => ({ value: s, label: s }))} />
            </Field>
          </div>
          <Field label={`Мөлдірлік: ${d.opacity ?? 0.85}`}>
            <input type="range" min={0} max={1} step={0.05} value={d.opacity ?? 0.85} onChange={(e) => updateAt(i, { opacity: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label={`Бұрылу: ${d.rotation ?? 0}°`}>
            <input type="range" min={-30} max={30} step={1} value={d.rotation ?? 0} onChange={(e) => updateAt(i, { rotation: Number(e.target.value) })} className="w-full" />
          </Field>
          <div className="grid grid-cols-2 gap-2 items-end">
            <Field label="Қабат (layer)">
              <Select value={d.layer ?? "foreground"} onChange={(v) => updateAt(i, { layer: v as "background" | "foreground" })} options={[{ value: "background", label: "Фонда" }, { value: "foreground", label: "Алдында" }]} />
            </Field>
            <label className="flex items-center gap-1.5 text-xs font-medium pb-2" style={{ color: "var(--charcoal)" }}>
              <input type="checkbox" checked={d.flip ?? false} onChange={(e) => updateAt(i, { flip: e.target.checked })} /> Айналдыру (flip)
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addDecoration}
        disabled={decorationAssets.length === 0 || decorations.length >= 6}
        className="text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-40"
        style={{ background: "var(--cream)", border: "1px solid var(--border)", color: "var(--charcoal)" }}
      >
        + Ою қосу {decorations.length >= 6 ? "(макс. 6)" : ""}
      </button>
      {decorationAssets.length === 0 && (
        <p className="text-[11px]" style={{ color: "var(--muted)" }}>Алдымен төмендегі Asset Library-ге decoration/frame/texture суретін жүктеңіз.</p>
      )}
    </div>
  );
}

/** Shared Template Asset Library picker (§14) — a thumbnail grid filtered
 * to the given categories, plus an inline upload control. Used by both
 * the Background editor (single image) and the Decorations editor (one
 * per instance). Uploads/deletes go through the admin-gated Server
 * Actions in actions.ts; this component only ever mutates the shared
 * client-side `assets` list the Builder passed down. */
function AssetPickerField({
  label, categories, selectedId, onSelect, assets, onAssetsChange,
}: {
  label: string;
  categories: AssetCategory[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  assets: TemplateAssetDTO[];
  onAssetsChange: (fn: (prev: TemplateAssetDTO[]) => TemplateAssetDTO[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<AssetCategory>(categories[0]);
  const filtered = assets.filter((a) => (categories as string[]).includes(a.category));

  const handleFile = async (file: File) => {
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.append("name", file.name.replace(/\.[^.]+$/, ""));
    fd.append("category", uploadCategory);
    fd.append("file", file);
    const result = await uploadTemplateAssetAction(fd);
    if (result.error) setErr(result.error);
    else if (result.asset) {
      const created = result.asset;
      onAssetsChange((prev) => [created, ...prev]);
      onSelect(created.id);
    }
    setBusy(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Бұл суретті жойғыңыз келе ме? Оны пайдаланатын барлық үлгілерден жоғалады.")) return;
    const result = await deleteTemplateAssetAction(id);
    if (!result.error) {
      onAssetsChange((prev) => prev.filter((a) => a.id !== id));
      if (selectedId === id) onSelect(undefined);
    }
  };

  /** §5 — rename in place: same storage key, same file, no re-upload;
   * every template already referencing this asset by id keeps working
   * unchanged. A native prompt() keeps this a one-click action instead of
   * a modal-heavy flow, matching this codebase's existing lightweight
   * confirm()-based pattern for asset delete above. */
  const handleRename = async (asset: TemplateAssetDTO) => {
    const next = prompt("Жаңа атауы:", asset.name);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    const result = await renameTemplateAssetAction(asset.id, trimmed);
    if (!result.error) {
      onAssetsChange((prev) => prev.map((a) => (a.id === asset.id ? { ...a, name: trimmed } : a)));
    } else {
      setErr(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</label>
      {filtered.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="relative aspect-square rounded-lg overflow-hidden"
              style={{ border: selectedId === a.id ? "2px solid var(--gold)" : "1px solid var(--border)", background: "repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0/10px 10px" }}
            >
              <button type="button" onClick={() => onSelect(selectedId === a.id ? undefined : a.id)} className="w-full h-full" title={a.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.name} className="w-full h-full object-contain" />
              </button>
              <button
                type="button"
                onClick={() => handleRename(a)}
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[9px] leading-none flex items-center justify-center"
                aria-label="Атауын өзгерту"
                title={a.name}
              >✎</button>
              <button
                type="button"
                onClick={() => handleDelete(a.id)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[9px] leading-none flex items-center justify-center"
                aria-label="Өшіру"
              >×</button>
            </div>
          ))}
        </div>
      )}
      {filtered.length === 0 && <p className="text-[11px]" style={{ color: "var(--muted)" }}>Әзірге сурет жоқ</p>}
      <div className="flex items-center gap-2 mt-1">
        {categories.length > 1 && (
          <Select value={uploadCategory} onChange={(v) => setUploadCategory(v as AssetCategory)} options={categories.map((c) => ({ value: c, label: c }))} />
        )}
        <label className="text-xs font-medium cursor-pointer px-2.5 py-1.5 rounded-lg" style={{ color: "var(--gold-dark)", border: "1px solid var(--border)" }}>
          {busy ? "Жүктелуде..." : "+ Жүктеу"}
          <input
            type="file" accept="image/png,image/webp,image/jpeg,image/gif" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFile(f); }}
          />
        </label>
      </div>
      {err && <p className="text-[11px] text-red-500">{err}</p>}
    </div>
  );
}

function CardTab({ basic, setBasic, templateId }: { basic: BasicForm; setBasic: (fn: (p: BasicForm) => BasicForm) => void; templateId: string }) {
  const set = <K extends keyof BasicForm>(k: K, v: BasicForm[K]) => setBasic((p) => ({ ...p, [k]: v }));
  return (
    <>
      <p className="label-caps" style={{ color: "var(--gold)" }}>Каталог карточкасы</p>
      <Field label="Emoji"><input className={inputClass} style={inputStyle} value={basic.emoji} onChange={(e) => set("emoji", e.target.value)} /></Field>
      <Field label="1-есім"><input className={inputClass} style={inputStyle} value={basic.demoName1} onChange={(e) => set("demoName1", e.target.value)} /></Field>
      <Field label="2-есім"><input className={inputClass} style={inputStyle} value={basic.demoName2} onChange={(e) => set("demoName2", e.target.value)} /></Field>
      <CardImageField label="Preview сурет" templateId={templateId} field="previewImage" value={basic.previewImage} onChange={(v) => set("previewImage", v)} />
      <CardImageField label="Demo сурет" templateId={templateId} field="demoImage" value={basic.demoImage} onChange={(v) => set("demoImage", v)} />
      <label className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--charcoal)" }}>
        <input type="checkbox" checked={basic.isActive} onChange={(e) => set("isActive", e.target.checked)} />
        Белсенді (каталогта көрінеді)
      </label>
    </>
  );
}

function CardImageField({
  label, templateId, field, value, onChange,
}: {
  label: string;
  templateId: string;
  field: "previewImage" | "demoImage";
  value: string;
  onChange: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.append("templateId", templateId);
    fd.append("field", field);
    fd.append("file", file);
    const result = await uploadTemplateImageAction(fd);
    if (result.error) setErr(result.error);
    else if (result.key) onChange(result.key);
    setBusy(false);
  };

  const handleRemove = async () => {
    setBusy(true);
    setErr(null);
    const result = await removeTemplateImageAction(templateId, field);
    if (result.error) setErr(result.error);
    else onChange("");
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "var(--cream)", border: "1px solid var(--border)" }}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveImageSrc(value) ?? ""} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl" style={{ opacity: 0.3 }}>🖼️</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium cursor-pointer" style={{ color: "var(--gold-dark)" }}>
            {busy ? "Жүктелуде..." : value ? "Ауыстыру" : "Жүктеу"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFile(f); }} />
          </label>
          {value && <button type="button" onClick={handleRemove} disabled={busy} className="text-xs text-left" style={{ color: "var(--muted)" }}>Өшіру</button>}
        </div>
      </div>
      {err && <p className="text-[11px] text-red-500">{err}</p>}
    </div>
  );
}
