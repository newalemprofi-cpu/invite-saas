"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import type { Template } from "@/lib/templates";
import type { EventFormSchema, EventFormField } from "@/lib/event-schema";
import type { FeaturePricingConfig } from "@/lib/feature-pricing";
import type { PlayableTrack } from "@/lib/recommended-tracks";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/features";
import { calculateInvitePrice, lineItemTitle } from "@/lib/pricing";
import { buildFreshEditorData, type EditorData } from "@/lib/invite-editor-data";
import { loadAnonymousDraft, saveAnonymousDraft, createDraftToken } from "@/lib/anonymousDraft";
import { InvitePreview } from "@/app/edit/[inviteId]/InvitePreview";
import { ImageUploadField, GalleryUploader, MusicUploader } from "@/app/edit/[inviteId]/uploads";
import { useSingleAudioPreview } from "@/app/edit/[inviteId]/useSingleAudioPreview";

interface Props {
  template: Template;
  templates: Template[];
  schema: EventFormSchema;
  eventCategoryId: string;
  lang: Lang;
  featurePricing: FeaturePricingConfig;
  basePrice: number;
  recommendedTracks: PlayableTrack[];
}

// Feature keys that map onto a real Section id in EditorData.sections (the
// SAME mechanism InvitePreview.tsx / the public page already gate section
// visibility on — see the sync in toggleFeature below). "music" is
// deliberately absent: it was never a section id in this codebase (see
// EditorClient.tsx's own comment on that), gated instead by musicEnabled.
const FEATURE_SECTION_ID: Partial<Record<FeatureKey, string>> = {
  gallery: "gallery",
  map: "map",
  rsvp: "rsvp",
  wishes: "wishes",
};

const T = {
  kk: {
    basicInfo: "Негізгі ақпарат",
    mainPhoto: "Негізгі фото",
    features: "Қосымша мүмкіндіктер",
    preview: "Алдын ала қарау",
    hidePreview: "Алдын ала қарауды жасыру",
    priceSummary: "Сіздің шақыруыңыз",
    base: "Базалық шақыру",
    total: "Барлығы",
    continue: "жалғастыру",
    required: "міндетті",
    add: "+ Қосу",
    added: "✓ Қосылды",
    remove: "Алып тастау",
    free: "Тегін",
    qrTitle: "QR-код",
    qrDesc: "Шақыруыңызға QR-код автоматты түрде жасалады. Оны қағаз шақыруға немесе басқа материалдарға қолдана аласыз.",
    advancedEditor: "Қосымша баптау",
    validationError: "Міндетті өрістерді толтырыңыз",
    templateTitle: "Үлгі",
    predefinedSongs: "Ұсынылған әндер",
    noRecommendedTracks: "Ұсынылған ән жоқ",
    uploadOwnMusic: "Өз музыкаңызды жүктеу",
    musicSelected: (title: string) => `Таңдалды: ${title}`,
    mapLinkLabel: "Карта сілтемесі",
    mapLinkPlaceholder: "https://2gis.kz/...",
    rsvpCollectsTitle: "Қонақтардан жиналатын ақпарат:",
    rsvpFieldName: "Аты-жөні",
    rsvpFieldPhone: "Телефон (міндетті емес)",
    rsvpFieldStatus: "Қатысу түрі (Барады / Белгісіз / Бармайды)",
    rsvpFieldCount: "Қатысушылар саны",
    rsvpFieldComment: "Пікір (міндетті емес)",
    wishesInfo: "Қонақтар шақыру бетінде сізге жылы лебізін қалдыра алады.",
    analyticsInfo: "Шақыру жарияланғаннан кейін қаралымдар мен қонақтардың жауаптарын бақылаңыз.",
  },
  ru: {
    basicInfo: "Основная информация",
    mainPhoto: "Главное фото",
    features: "Дополнительные возможности",
    preview: "Предпросмотр",
    hidePreview: "Скрыть предпросмотр",
    priceSummary: "Ваше приглашение",
    base: "Базовое приглашение",
    total: "Итого",
    continue: "продолжить",
    required: "обязательно",
    add: "+ Добавить",
    added: "✓ Добавлено",
    remove: "Убрать",
    free: "Бесплатно",
    qrTitle: "QR-код",
    qrDesc: "Для вашего приглашения автоматически создаётся QR-код. Его можно использовать на бумажном приглашении или других материалах.",
    advancedEditor: "Расширенная настройка",
    validationError: "Заполните обязательные поля",
    templateTitle: "Шаблон",
    predefinedSongs: "Рекомендованные песни",
    noRecommendedTracks: "Нет рекомендованных песен",
    uploadOwnMusic: "Загрузить свою музыку",
    musicSelected: (title: string) => `Выбрано: ${title}`,
    mapLinkLabel: "Ссылка на карту",
    mapLinkPlaceholder: "https://2gis.kz/...",
    rsvpCollectsTitle: "Информация, которую соберём у гостей:",
    rsvpFieldName: "Имя и фамилия",
    rsvpFieldPhone: "Телефон (необязательно)",
    rsvpFieldStatus: "Статус участия (Приду / Не определился / Не приду)",
    rsvpFieldCount: "Количество гостей",
    rsvpFieldComment: "Комментарий (необязательно)",
    wishesInfo: "Гости смогут оставить вам тёплое пожелание прямо на странице приглашения.",
    analyticsInfo: "После публикации отслеживайте просмотры приглашения и ответы гостей.",
  },
} as const;

interface ConstructorCopy {
  basicInfo: string;
  mainPhoto: string;
  features: string;
  preview: string;
  hidePreview: string;
  priceSummary: string;
  base: string;
  total: string;
  continue: string;
  required: string;
  add: string;
  added: string;
  remove: string;
  free: string;
  qrTitle: string;
  qrDesc: string;
  advancedEditor: string;
  validationError: string;
  templateTitle: string;
  predefinedSongs: string;
  noRecommendedTracks: string;
  uploadOwnMusic: string;
  musicSelected: (title: string) => string;
  mapLinkLabel: string;
  mapLinkPlaceholder: string;
  rsvpCollectsTitle: string;
  rsvpFieldName: string;
  rsvpFieldPhone: string;
  rsvpFieldStatus: string;
  rsvpFieldCount: string;
  rsvpFieldComment: string;
  wishesInfo: string;
  analyticsInfo: string;
}

function fieldLabel(f: EventFormField, lang: Lang) {
  return lang === "ru" ? f.labelRu : f.labelKk;
}
function fieldPlaceholder(f: EventFormField, lang: Lang) {
  return (lang === "ru" ? f.placeholderRu : f.placeholderKk) ?? "";
}

/** Mirrors lib/storage.ts's getPublicUrl() — kept tiny and local since that module isn't safe to import client-side (same pattern as admin/site/page.tsx). */
function mediaSrc(key: string): string {
  if (!key) return "";
  if (/^https?:\/\//i.test(key) || key.startsWith("/")) return key;
  return `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function SimpleConstructor({
  template, templates, schema, eventCategoryId, lang, featurePricing, basePrice, recommendedTracks,
}: Props) {
  const router = useRouter();
  const t = T[lang];
  const preview = useSingleAudioPreview();

  // Lazy-initialized ONCE (pure, no render-time side effects). The
  // RESUME condition is keyed on eventCategoryId, NOT templateSlug — this
  // is the actual fix for gap §1: a draft in progress for this SAME event
  // category is always continued (content, features, everything) no
  // matter which template URL the customer arrives through next; only a
  // genuinely different event category starts fresh (§5).
  const [draftToken] = useState<string>(() => {
    const existing = loadAnonymousDraft();
    return existing && existing.data.eventCategoryId === eventCategoryId ? existing.token : createDraftToken();
  });
  const [data, setData] = useState<EditorData>(() => {
    const existing = loadAnonymousDraft();
    if (existing && existing.data.eventCategoryId === eventCategoryId) {
      // Resume in-progress draft — adopt whichever template the customer
      // is currently viewing without touching anything else they entered.
      return { ...existing.data, templateSlug: template.slug };
    }
    const fresh = buildFreshEditorData(template);
    fresh.eventCategoryId = eventCategoryId;
    // Paid-feature sections start OFF (nothing selected yet) regardless of
    // DEFAULT_SECTIONS' own defaults, which serve the unrelated advanced
    // editor where these aren't monetization-gated.
    fresh.sections = fresh.sections.map((s) =>
      Object.values(FEATURE_SECTION_ID).includes(s.id) ? { ...s, enabled: false } : s
    );
    return fresh;
  });
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState(template.slug);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const [validationError, setValidationError] = useState(false);

  const currentTemplate = templates.find((tm) => tm.slug === selectedTemplateSlug) ?? template;

  // Debounced localStorage save — same mechanism the advanced editor's
  // anonymous-draft path already uses, so /invitations/publish's existing
  // ClaimDraftClient claims this identically without any changes there.
  // templateSlug is read from `data` (not the fixed `template` prop) so a
  // template switch is correctly reflected in the saved draft (§6).
  useEffect(() => {
    const timer = setTimeout(() => {
      saveAnonymousDraft({ token: draftToken, templateSlug: data.templateSlug || template.slug, lang, data, updatedAt: Date.now() });
    }, 400);
    return () => clearTimeout(timer);
  }, [data, template.slug, lang, draftToken]);

  const set = <K extends keyof EditorData>(key: K, value: EditorData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const switchTemplate = (slug: string) => {
    setSelectedTemplateSlug(slug);
    // Content, selectedFeatures, feature configuration, qrEnabled — every
    // other field — is untouched (§2/§3/§4). Only presentation changes.
    set("templateSlug", slug);
  };

  const priceBreakdown = useMemo(
    () => calculateInvitePrice(data.selectedFeatures, featurePricing, basePrice),
    [data.selectedFeatures, featurePricing, basePrice]
  );

  const toggleFeature = (key: FeatureKey) => {
    setData((prev) => {
      const nowSelected = !prev.selectedFeatures.includes(key);
      const selectedFeatures = nowSelected
        ? [...prev.selectedFeatures, key]
        : prev.selectedFeatures.filter((k) => k !== key);
      // Keep the corresponding Section's enabled flag in sync with
      // selection — this is the SAME `has(id)` mechanism InvitePreview.tsx
      // (and the public page) already gate on, so Live Preview updates
      // for free with zero changes to that shared renderer (§7/§17).
      const sectionId = FEATURE_SECTION_ID[key];
      const sections = sectionId
        ? prev.sections.map((s) => (s.id === sectionId ? { ...s, enabled: nowSelected } : s))
        : prev.sections;
      // §20: deselecting NEVER clears prev configuration (galleryUrls,
      // musicUrl, mapLink, ...) — only selectedFeatures/sections change,
      // so re-selecting brings everything straight back.
      return { ...prev, selectedFeatures, sections };
    });
  };

  // What Live Preview should actually show reflects CURRENT selection,
  // not just whatever was ever configured — deselecting MUSIC hides it in
  // preview immediately even though the underlying musicUrl/musicEnabled
  // are preserved in `data` for a possible re-add (§17/§20). Sections
  // already stay in sync via toggleFeature above, so only `musicEnabled`
  // (not a section) needs this derived override.
  const previewData = useMemo<EditorData>(
    () => ({ ...data, musicEnabled: data.musicEnabled && data.selectedFeatures.includes("music") }),
    [data]
  );

  const missingRequired = schema.fields.filter((f) => f.required && !String(data[f.key as keyof EditorData] ?? "").trim());

  const handleContinue = () => {
    if (missingRequired.length > 0) {
      setValidationError(true);
      return;
    }
    setValidationError(false);
    // Force-flush the draft before navigating (the debounce above may not
    // have fired yet for the very last keystroke).
    saveAnonymousDraft({ token: draftToken, templateSlug: data.templateSlug || template.slug, lang, data, updatedAt: Date.now() });
    router.push(`/invitations/publish?lang=${lang}`);
  };

  // mapLink is part of the base EventFormSchema (so it's still validated/
  // labeled centrally) but rendered inside the MAP feature card instead of
  // the generic base-info list — showing a "map link" field the customer
  // hasn't paid for would be misleading (§13).
  const baseFields = schema.fields.filter((f) => f.type !== "image" && f.key !== "mapLink").sort((a, b) => a.order - b.order);
  const mapLinkField = schema.fields.find((f) => f.key === "mapLink");

  return (
    <div className="min-h-screen" style={{ background: "var(--ivory)" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[1fr_320px] gap-8">
        {/* LEFT: form + features */}
        <div className="flex flex-col gap-8 min-w-0">
          <div>
            <h1 className="heading-display text-2xl sm:text-3xl" style={{ color: "var(--charcoal)" }}>
              {lang === "ru" ? currentTemplate.nameRu : currentTemplate.nameKk}
            </h1>
          </div>

          {/* Template switcher — compact horizontal thumbnail row, works
              at 360px via horizontal scroll (§21). Switching NEVER
              navigates/reloads — pure client state (§3). */}
          {templates.length > 1 && (
            <Section title={t.templateTitle}>
              <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
                {templates.map((tm) => {
                  const active = tm.slug === selectedTemplateSlug;
                  return (
                    <button
                      key={tm.slug}
                      type="button"
                      onClick={() => switchTemplate(tm.slug)}
                      className="shrink-0 flex flex-col items-center gap-1.5 w-16"
                    >
                      <span
                        className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center text-lg"
                        style={{
                          border: active ? "2px solid var(--gold)" : "1px solid var(--border)",
                          background: tm.previewImage ? undefined : tm.bg,
                          boxShadow: active ? "0 0 0 2px rgba(196,150,62,0.2)" : undefined,
                        }}
                      >
                        {tm.previewImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaSrc(tm.previewImage)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{tm.emoji}</span>
                        )}
                      </span>
                      <span
                        className="text-[10px] leading-tight text-center truncate w-full"
                        style={{ color: active ? "var(--gold-dark)" : "var(--muted)", fontWeight: active ? 600 : 400 }}
                      >
                        {lang === "ru" ? tm.nameRu : tm.nameKk}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Mobile: collapsible preview toggle right under the title */}
          <button
            type="button"
            onClick={() => setShowPreviewMobile((v) => !v)}
            className="lg:hidden btn-outline text-sm justify-center"
          >
            {showPreviewMobile ? t.hidePreview : `👁 ${t.preview}`}
          </button>
          {showPreviewMobile && (
            <div className="lg:hidden flex justify-center">
              <div className="phone-frame w-[240px]">
                <div className="phone-screen" style={{ height: 480 }}>
                  <InvitePreview data={previewData} template={currentTemplate} />
                </div>
              </div>
            </div>
          )}

          <Section title={t.basicInfo}>
            {baseFields.map((f) => (
              <DynamicField key={f.key} field={f} lang={lang} value={String(data[f.key as keyof EditorData] ?? "")} onChange={(v) => set(f.key as keyof EditorData, v as never)} />
            ))}
          </Section>

          {schema.fields.some((f) => f.type === "image") && (
            <Section title={t.mainPhoto}>
              <ImageUploadField
                target={{ mode: "draft", draftToken }}
                lang={lang}
                value={data.bgImageUrl}
                onChange={(url) => setData((prev) => ({ ...prev, bgImageUrl: url, bgType: url ? "image" : "color" }))}
              />
            </Section>
          )}

          <Section title={t.features}>
            <div className="flex flex-col gap-3">
              {FEATURE_KEYS.map((key) => {
                const selected = data.selectedFeatures.includes(key);
                return (
                  <FeatureCard
                    key={key}
                    config={featurePricing[key]}
                    lang={lang}
                    selected={selected}
                    onToggle={() => toggleFeature(key)}
                    t={t}
                  >
                    {selected && (
                      <FeatureConfig
                        featureKey={key}
                        data={data}
                        set={set}
                        lang={lang}
                        t={t}
                        draftToken={draftToken}
                        recommendedTracks={recommendedTracks}
                        preview={preview}
                        mapLinkField={mapLinkField}
                      />
                    )}
                  </FeatureCard>
                );
              })}
            </div>

            {/* Free QR toggle — never affects price (§16/§19) */}
            {featurePricing.qr.enabled && (
              <div className="flex items-start justify-between gap-3 p-4 rounded-2xl mt-1" style={{ border: "1px solid var(--border)", background: "white" }}>
                <div className="min-w-0">
                  <p className="font-semibold text-sm" style={{ color: "var(--charcoal)" }}>
                    {lang === "ru" ? featurePricing.qr.titleRu : featurePricing.qr.titleKk}
                    <span className="ml-2 text-xs font-normal" style={{ color: "var(--gold-dark)" }}>{t.free}</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                    {lang === "ru" ? featurePricing.qr.descRu : featurePricing.qr.descKk}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={data.qrEnabled}
                    onChange={(e) => set("qrEnabled", e.target.checked)}
                  />
                  <div className="w-10 h-6 rounded-full peer-checked:bg-[var(--gold)] bg-zinc-200 transition-colors" />
                  <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
                </label>
              </div>
            )}
          </Section>

          {validationError && (
            <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
              {t.validationError}
            </p>
          )}
        </div>

        {/* RIGHT: sticky live preview (desktop) + price summary */}
        <div className="hidden lg:flex flex-col gap-6 self-start sticky top-6">
          <div className="flex justify-center">
            <div className="phone-frame w-[260px]">
              <div className="phone-screen" style={{ height: 520 }}>
                <InvitePreview data={previewData} template={currentTemplate} />
              </div>
            </div>
          </div>
          <PriceSummary t={t} lang={lang} breakdown={priceBreakdown} onContinue={handleContinue} />
        </div>

        {/* Mobile: price summary + continue, always visible below the form */}
        <div className="lg:hidden">
          <PriceSummary t={t} lang={lang} breakdown={priceBreakdown} onContinue={handleContinue} sticky />
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="label-caps" style={{ color: "var(--gold)" }}>{title}</p>
      {children}
    </div>
  );
}

function DynamicField({
  field, lang, value, onChange,
}: {
  field: EventFormField;
  lang: Lang;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = fieldLabel(field, lang) + (field.required ? " *" : "");
  const placeholder = fieldPlaceholder(field, lang);

  if (field.type === "textarea") {
    return (
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>{label}</label>
        <textarea
          className="input-premium resize-none"
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  const inputType = field.type === "date" ? "date" : field.type === "time" ? "time" : field.type === "url" ? "url" : field.type === "number" ? "number" : "text";

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>{label}</label>
      <input
        type={inputType}
        className="input-premium"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function FeatureCard({
  config, lang, selected, onToggle, t, children,
}: {
  config: FeaturePricingConfig[FeatureKey];
  lang: Lang;
  selected: boolean;
  onToggle: () => void;
  t: ConstructorCopy;
  children?: React.ReactNode;
}) {
  if (!config.enabled) return null;
  const title = lang === "ru" ? config.titleRu : config.titleKk;
  const desc = lang === "ru" ? config.descRu : config.descKk;

  return (
    <div
      className="flex flex-col gap-2 p-4 rounded-2xl"
      style={{
        border: selected ? "1.5px solid var(--gold)" : "1px solid var(--border)",
        background: selected ? "rgba(196,150,62,0.06)" : "white",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm" style={{ color: "var(--charcoal)" }}>
          {!selected && <span className="mr-1 opacity-50">🔒</span>}
          {title}
        </p>
      </div>
      <p className="text-xs leading-relaxed flex-1" style={{ color: "var(--muted)" }}>{desc}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-sm font-semibold" style={{ color: "var(--gold-dark)" }}>+{config.price.toLocaleString("kk-KZ")} ₸</span>
        <button
          type="button"
          onClick={onToggle}
          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
          style={selected ? { background: "var(--gold)", color: "#1C1917" } : { background: "var(--charcoal)", color: "white" }}
        >
          {selected ? t.added : t.add}
        </button>
      </div>
      {children && (
        <div className="pt-3 mt-1 flex flex-col gap-3" style={{ borderTop: "1px solid rgba(196,150,62,0.2)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Inline per-feature configuration (§8-§15) — this is the whole point of
 * gap #2: preparing the invitation must be possible BEFORE payment, not
 * deferred to the dashboard/advanced editor. Every field here writes into
 * the SAME Invite.data keys the advanced editor already uses
 * (musicUrl/galleryUrls/mapLink/...), so nothing new needed to be added to
 * the PATCH/claim schemas, and the exact same public-page rendering picks
 * these values up unchanged once entitled.
 */
function FeatureConfig({
  featureKey, data, set, lang, t, draftToken, recommendedTracks, preview, mapLinkField,
}: {
  featureKey: FeatureKey;
  data: EditorData;
  set: <K extends keyof EditorData>(key: K, value: EditorData[K]) => void;
  lang: Lang;
  t: ConstructorCopy;
  draftToken: string;
  recommendedTracks: PlayableTrack[];
  preview: ReturnType<typeof useSingleAudioPreview>;
  mapLinkField: EventFormField | undefined;
}) {
  if (featureKey === "music") {
    return (
      <>
        {data.musicTitle && (
          <p className="text-xs font-medium" style={{ color: "var(--gold-dark)" }}>{t.musicSelected(data.musicTitle)}</p>
        )}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>{t.predefinedSongs}</p>
          {recommendedTracks.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--muted)" }}>{t.noRecommendedTracks}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {recommendedTracks.map((track) => {
                const label = track.artist ? `${track.title} — ${track.artist}` : track.title;
                const isSelected = !!data.musicUrl && data.musicUrl === track.url;
                const isPlaying = preview.playingUrl === track.url;
                return (
                  <div
                    key={track.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all"
                    style={{
                      background: isSelected ? "rgba(196,150,62,0.1)" : "var(--cream)",
                      border: `1px solid ${isSelected ? "rgba(196,150,62,0.3)" : "var(--border)"}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => preview.toggle(track.url)}
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs text-white"
                      style={{ background: "var(--gold)" }}
                    >
                      {isPlaying ? "⏸" : "▶"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        set("musicTitle", label);
                        set("musicUrl", track.url);
                        set("musicEnabled", true);
                      }}
                      className="flex-1 min-w-0 text-left text-xs truncate"
                      style={{ color: "var(--charcoal)" }}
                    >
                      {label}
                    </button>
                    {isSelected && <span className="text-xs shrink-0" style={{ color: "var(--gold-dark)" }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>{t.uploadOwnMusic}</p>
          <MusicUploader
            target={{ mode: "draft", draftToken }}
            lang={lang}
            musicUrl={data.musicUrl}
            onUploaded={(url, fileLabel) => {
              set("musicUrl", url);
              set("musicTitle", fileLabel);
              set("musicEnabled", true);
            }}
            onRemove={() => set("musicUrl", "")}
          />
        </div>
      </>
    );
  }

  if (featureKey === "gallery") {
    return (
      <GalleryUploader
        target={{ mode: "draft", draftToken }}
        lang={lang}
        urls={data.galleryUrls}
        onChange={(urls) => set("galleryUrls", urls)}
      />
    );
  }

  if (featureKey === "map") {
    return (
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
          {mapLinkField ? fieldLabel(mapLinkField, lang) : t.mapLinkLabel}
        </label>
        <input
          type="url"
          className="input-premium"
          value={data.mapLink}
          placeholder={t.mapLinkPlaceholder}
          onChange={(e) => set("mapLink", e.target.value)}
        />
      </div>
    );
  }

  if (featureKey === "rsvp") {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>{t.rsvpCollectsTitle}</p>
        {[t.rsvpFieldName, t.rsvpFieldPhone, t.rsvpFieldStatus, t.rsvpFieldCount, t.rsvpFieldComment].map((label) => (
          <p key={label} className="text-xs flex items-center gap-1.5" style={{ color: "var(--charcoal)" }}>
            <span style={{ color: "var(--gold)" }}>✓</span> {label}
          </p>
        ))}
      </div>
    );
  }

  if (featureKey === "wishes") {
    return <p className="text-xs leading-relaxed" style={{ color: "var(--charcoal)" }}>{t.wishesInfo}</p>;
  }

  if (featureKey === "analytics") {
    return <p className="text-xs leading-relaxed" style={{ color: "var(--charcoal)" }}>{t.analyticsInfo}</p>;
  }

  return null;
}

function PriceSummary({
  t, lang, breakdown, onContinue, sticky,
}: {
  t: ConstructorCopy;
  lang: Lang;
  breakdown: ReturnType<typeof calculateInvitePrice>;
  onContinue: () => void;
  sticky?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-3 p-5 rounded-2xl ${sticky ? "sticky bottom-4 mt-6 shadow-xl" : ""}`}
      style={{ background: "var(--charcoal)" }}
    >
      <p className="label-caps" style={{ color: "var(--gold)" }}>{t.priceSummary}</p>
      <div className="flex items-center justify-between text-sm" style={{ color: "#FAF8F3" }}>
        <span>{t.base}</span>
        <span>{breakdown.basePrice.toLocaleString("kk-KZ")} ₸</span>
      </div>
      {breakdown.lineItems.map((item) => (
        <div key={item.key} className="flex items-center justify-between text-sm" style={{ color: "#D6D0C4" }}>
          <span>{lineItemTitle(item, lang)}</span>
          <span>{item.price.toLocaleString("kk-KZ")} ₸</span>
        </div>
      ))}
      <div className="h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
      <div className="flex items-center justify-between font-semibold" style={{ color: "#FAF8F3" }}>
        <span>{t.total}</span>
        <span>{breakdown.total.toLocaleString("kk-KZ")} ₸</span>
      </div>
      <button type="button" onClick={onContinue} className="btn-gold w-full justify-center mt-1">
        {breakdown.total.toLocaleString("kk-KZ")} ₸ — {t.continue}
      </button>
    </div>
  );
}
