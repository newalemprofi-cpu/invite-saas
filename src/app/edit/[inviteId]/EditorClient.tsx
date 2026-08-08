"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { getTemplate, localizeTemplate, type Template } from "@/lib/templates";
import {
  DEFAULT_SECTIONS,
  editorDataToSaveBody,
  type EditorData,
  type Section,
} from "@/lib/invite-editor-data";
import { loadAnonymousDraft, saveAnonymousDraft, createDraftToken } from "@/lib/anonymousDraft";
import type { UploadTarget } from "@/lib/useUpload";
import { InvitePreview } from "./InvitePreview";
import { ImageUploadField, GalleryUploader, MusicUploader } from "./uploads";
import type { Lang } from "@/lib/i18n";

export type { EditorData, Section };

interface Props {
  /** null = anonymous/pre-account draft (no Invite row yet); string = editing a real invite. */
  inviteId: string | null;
  initialData: EditorData;
  template: Template | null;
  inviteStatus?: string;
  lang: Lang;
}

const BLOCK_META: { id: string; icon: string; kk: string; ru: string }[] = [
  { id: "hero", icon: "🎉", kk: "Басты бөлім", ru: "Главный блок" },
  { id: "countdown", icon: "⏱", kk: "Кері санақ", ru: "Обратный отсчёт" },
  { id: "invitation_text", icon: "✉️", kk: "Шақыру хаты", ru: "Текст приглашения" },
  { id: "love_story", icon: "💑", kk: "Сүйіспеншілік тарихы", ru: "История любви" },
  { id: "gallery", icon: "🖼️", kk: "Галерея", ru: "Галерея" },
  { id: "video_section", icon: "🎬", kk: "Бейне", ru: "Видео" },
  { id: "program", icon: "📋", kk: "Бағдарлама", ru: "Программа" },
  { id: "map", icon: "📍", kk: "Карта", ru: "Карта" },
  { id: "dress_code", icon: "👗", kk: "Киім үлгісі", ru: "Дресс-код" },
  { id: "wishes", icon: "💌", kk: "Тілектер", ru: "Пожелания" },
  { id: "rsvp", icon: "✅", kk: "Қатысуды растау", ru: "Подтверждение участия" },
  { id: "contacts", icon: "📞", kk: "Байланыс", ru: "Контакты" },
  { id: "gift_info", icon: "🎁", kk: "Сыйлық ақпараты", ru: "Информация о подарках" },
  { id: "whatsapp", icon: "💬", kk: "WhatsApp", ru: "WhatsApp" },
  { id: "music", icon: "🎵", kk: "Музыка", ru: "Музыка" },
];

const ROMANTIC_PLAYLIST = [
  { title: "A Thousand Years — Christina Perri" },
  { title: "Perfect — Ed Sheeran" },
  { title: "Can't Help Falling in Love — Elvis Presley" },
  { title: "Thinking Out Loud — Ed Sheeran" },
  { title: "All of Me — John Legend" },
  { title: "Қалам — Imanbek" },
  { title: "Менің жарым — Кайрат Нуртас" },
  { title: "Жаным — Dos Mukasan" },
];

const FONTS = [
  { id: "serif", kk: "Cormorant (сериф)", ru: "Cormorant (с засечками)" },
  { id: "sans", kk: "DM Sans (қазіргі)", ru: "DM Sans (современный)" },
  { id: "display", kk: "Playfair (сән)", ru: "Playfair (стильный)" },
];

const ANIMATIONS = [
  { id: "fade", kk: "Fade", ru: "Fade" },
  { id: "slide", kk: "Slide Up", ru: "Slide Up" },
  { id: "float", kk: "Float", ru: "Float" },
];

type Tab = "fields" | "design" | "blocks" | "media";

const T = {
  kk: {
    tabs: { fields: "Мәлімет", design: "Дизайн", blocks: "Блоктар", media: "Медиа" },
    back: "← Менің шақыруларым",
    backToTemplates: "← Шаблондар",
    saving: "Сақталуда...",
    saved: "✓ Сақталды",
    saveError: "Қате",
    view: "Қарау ↗",
    publish: "Жариялау →",
    publishCta: "Шақыруды жариялау",
    toMyInvitations: "Менің шақыруларым",
    changeTemplate: "Ауыстыру",
    namesSection: "Аттар",
    mainName: "Негізгі ат *",
    partnerName: "Серіктес аты",
    eventSection: "Іс-шара",
    dateLabel: "Күні",
    timeLabel: "Уақыты",
    locationSection: "Орын",
    address: "Мекенжай",
    mapLink: "Карта сілтемесі (2GIS / Google)",
    contactSection: "Байланыс",
    whatsappNum: "WhatsApp нөмірі",
    organizerPhone: "Ұйымдастырушы телефоны",
    invitationTextSection: "Шақыру хаты",
    personalMessage: "Жеке хабарлама",
    personalMessagePlaceholder: "Сізді той кешімізге шақырамыз...",
    bgTypeSection: "Фон түрі",
    bgTypes: { color: "Түс", gradient: "Градиент", image: "Сурет", video: "Бейне" },
    colorsSection: "Түстер",
    bgColor: "Фон түсі",
    accentColor: "Акцент түсі",
    gradientSection: "Градиент",
    imageBgSection: "Сурет фоны",
    blur: (n: number) => `Бұлдырлық: ${n}px`,
    opacity: (n: number) => `Мөлдірлік: ${n}%`,
    overlay: "Overlay түсі",
    videoBgSection: "Бейне фоны",
    videoBgLink: "Бейне сілтемесі",
    fontSection: "Қаріп",
    animationSection: "Анимация стилі",
    blocksHint: "Блоктарды қосыңыз, өшіріңіз немесе бүйірге сүйреп орналастырыңыз",
    loveStorySection: "Сүйіспеншілік мәтіні",
    loveStoryPlaceholder: "Біздің сүйіспеншілік тарихымыз...",
    dressCodeSection: "Киім үлгісі",
    dressCodePlaceholder: "Ақ-алтын түстер ұсынылады...",
    wishesSection: "Тілектер мәтіні",
    wishesPlaceholder: "Бізге тілектеріңізді қалдырыңыз...",
    contactsSection: "Байланыс мәтіні",
    contactsPlaceholder: "+7 700 000 0000 — Айдар",
    giftInfoSection: "Сыйлық ақпараты",
    giftInfoPlaceholder: "Kaspi: 4400 1234 5678 9012",
    videoSection: "Бейне қосу",
    videoLink: "Сілтеме (YouTube)",
    rsvpButtonText: "Растау батырмасының мәтіні",
    rsvpButtonPlaceholder: "Қатысуымды растаймын ✓",
    gallerySection: "Галерея (макс. 8 сурет)",
    musicSection: "Музыка",
    musicToggle: "Музыканы қосу",
    musicSelected: (title: string) => `Таңдалды: ${title}`,
    musicTitleLabel: "Атауы",
    musicTitlePlaceholder: "Ән атауы — Орындаушы",
    predefinedSongs: "Ұсынылған әндер",
    uploadOwnMusic: "Өз әніңізді жүктеу",
    musicSettings: "Параметрлер",
    repeat: "🔁 Қайталау",
    autoplay: "▶ Авто-ойнату",
    previewLabel: "Алдын ала қарау",
    previewHint: "Нақты уақытта жаңарады",
  },
  ru: {
    tabs: { fields: "Информация", design: "Дизайн", blocks: "Блоки", media: "Медиа" },
    back: "← Мои приглашения",
    backToTemplates: "← Шаблоны",
    saving: "Сохраняется...",
    saved: "✓ Сохранено",
    saveError: "Ошибка",
    view: "Просмотр ↗",
    publish: "Опубликовать →",
    publishCta: "Опубликовать приглашение",
    toMyInvitations: "Мои приглашения",
    changeTemplate: "Сменить",
    namesSection: "Имена",
    mainName: "Основное имя *",
    partnerName: "Имя партнёра",
    eventSection: "Мероприятие",
    dateLabel: "Дата",
    timeLabel: "Время",
    locationSection: "Место",
    address: "Адрес",
    mapLink: "Ссылка на карту (2GIS / Google)",
    contactSection: "Контакты",
    whatsappNum: "Номер WhatsApp",
    organizerPhone: "Телефон организатора",
    invitationTextSection: "Текст приглашения",
    personalMessage: "Личное сообщение",
    personalMessagePlaceholder: "Приглашаем вас на наш праздник...",
    bgTypeSection: "Тип фона",
    bgTypes: { color: "Цвет", gradient: "Градиент", image: "Изображение", video: "Видео" },
    colorsSection: "Цвета",
    bgColor: "Цвет фона",
    accentColor: "Акцентный цвет",
    gradientSection: "Градиент",
    imageBgSection: "Фон-изображение",
    blur: (n: number) => `Размытие: ${n}px`,
    opacity: (n: number) => `Прозрачность: ${n}%`,
    overlay: "Цвет наложения",
    videoBgSection: "Фон-видео",
    videoBgLink: "Ссылка на видео",
    fontSection: "Шрифт",
    animationSection: "Стиль анимации",
    blocksHint: "Добавляйте, отключайте или перетаскивайте блоки для изменения порядка",
    loveStorySection: "Текст истории любви",
    loveStoryPlaceholder: "Наша история любви...",
    dressCodeSection: "Дресс-код",
    dressCodePlaceholder: "Рекомендуем бело-золотые тона...",
    wishesSection: "Текст пожеланий",
    wishesPlaceholder: "Оставьте нам свои пожелания...",
    contactsSection: "Контактный текст",
    contactsPlaceholder: "+7 700 000 0000 — Айдар",
    giftInfoSection: "Информация о подарке",
    giftInfoPlaceholder: "Kaspi: 4400 1234 5678 9012",
    videoSection: "Добавить видео",
    videoLink: "Ссылка (YouTube)",
    rsvpButtonText: "Текст кнопки подтверждения",
    rsvpButtonPlaceholder: "Я приду ✓",
    gallerySection: "Галерея (макс. 8 фото)",
    musicSection: "Музыка",
    musicToggle: "Добавить музыку",
    musicSelected: (title: string) => `Выбрано: ${title}`,
    musicTitleLabel: "Название",
    musicTitlePlaceholder: "Название — Исполнитель",
    predefinedSongs: "Готовые песни",
    uploadOwnMusic: "Загрузить свою музыку",
    musicSettings: "Настройки",
    repeat: "🔁 Повтор",
    autoplay: "▶ Автовоспроизведение",
    previewLabel: "Предпросмотр",
    previewHint: "Обновляется в реальном времени",
  },
} as const;

function migrateSections(legacy: string[], existing: Section[]): Section[] {
  if (existing && existing.length > 0) return existing;
  if (legacy && legacy.length > 0) {
    const ids = new Set(legacy);
    return DEFAULT_SECTIONS.map((s) => ({ ...s, enabled: ids.has(s.id) }));
  }
  return DEFAULT_SECTIONS;
}

export function EditorClient({ inviteId, initialData, template, inviteStatus, lang: initialLang }: Props) {
  const isDraftMode = inviteId === null;
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = T[lang];
  const [data, setData] = useState<EditorData>(() => ({
    ...initialData,
    bgType: initialData.bgType || "color",
    bgBlur: initialData.bgBlur ?? 0,
    bgOpacity: initialData.bgOpacity ?? 0.4,
    bgOverlay: initialData.bgOverlay || "rgba(0,0,0,0)",
    musicLoop: initialData.musicLoop ?? false,
    musicAutoplay: initialData.musicAutoplay ?? false,
    programItems: initialData.programItems ?? [],
    sections: migrateSections(initialData.enabledBlocks, initialData.sections),
  }));
  // Anonymous-mode identity for temp uploads + claim idempotency. Never
  // rendered, so resolving it eagerly (client-only) can't cause a hydration
  // mismatch — only `data`/`lang` (which affect markup) wait for the effect below.
  const [draftToken, setDraftToken] = useState<string>(() =>
    isDraftMode && typeof window !== "undefined" ? createDraftToken() : ""
  );
  const [tab, setTab] = useState<Tab>("fields");
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragSrc = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  // On first client paint, resume a matching localStorage draft (same
  // template) if one exists, or persist the fresh one so its token/template
  // stay stable across reloads. Skipped entirely outside draft mode.
  useEffect(() => {
    if (!isDraftMode || hydratedRef.current) return;
    hydratedRef.current = true;
    const existing = loadAnonymousDraft();
    if (existing && existing.templateSlug === initialData.templateSlug) {
      // Reading localStorage must happen post-mount (unavailable during SSR),
      // so correcting state here — once, guarded by hydratedRef — is the
      // standard pattern for restoring client-only persisted state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(existing.data);
      setLang(existing.lang);
      setDraftToken(existing.token);
    } else {
      saveAnonymousDraft({
        token: draftToken,
        templateSlug: initialData.templateSlug,
        lang: initialLang,
        data: initialData,
        updatedAt: Date.now(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((patch: Partial<EditorData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleSection = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s),
    }));
  }, []);

  // DnD handlers (block ordering)
  const onDragStart = (i: number) => { dragSrc.current = i; };
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragSrc.current === null || dragSrc.current === i) return;
    setData((prev) => {
      const arr = [...prev.sections];
      const [moved] = arr.splice(dragSrc.current!, 1);
      arr.splice(i, 0, moved);
      dragSrc.current = i;
      return { ...prev, sections: arr };
    });
  };
  const onDrop = () => { dragSrc.current = null; };

  // Auto-save: PATCH the real invite when editing one, otherwise persist to
  // the local anonymous draft (no network round-trip needed).
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("idle");
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        if (isDraftMode) {
          saveAnonymousDraft({ token: draftToken, templateSlug: data.templateSlug, lang, data, updatedAt: Date.now() });
          setSaveState("saved");
        } else {
          const res = await fetch(`/api/invites/${inviteId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editorDataToSaveBody(data)),
          });
          setSaveState(res.ok ? "saved" : "error");
        }
      } catch {
        setSaveState("error");
      } finally {
        setSaving(false);
      }
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [data, inviteId, isDraftMode, draftToken, lang]);

  const currentTemplate: Template | null = getTemplate(data.templateSlug) ?? template;
  const accent = data.accentColor || currentTemplate?.accent || "#C4963E";
  const currentTemplateName = currentTemplate ? localizeTemplate(currentTemplate, lang).name : "";
  const uploadTarget: UploadTarget = inviteId
    ? { mode: "invite", inviteId }
    : { mode: "draft", draftToken };

  const backHref = isDraftMode ? `/templates?lang=${lang}` : `/dashboard?lang=${lang}`;
  const backLabel = isDraftMode ? t.backToTemplates : t.back;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ivory)" }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 h-14 shrink-0"
        style={{ background: "var(--charcoal)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link href={backHref} className="text-sm font-medium flex items-center gap-1.5" style={{ color: "#9A8F8A" }}>
          {backLabel}
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs" style={{
            color: saving ? "#C4963E" : saveState === "saved" ? "#4ade80" : saveState === "error" ? "#f87171" : "transparent"
          }}>
            {saving ? t.saving : saveState === "saved" ? t.saved : saveState === "error" ? t.saveError : "."}
          </span>

          {!isDraftMode && inviteStatus === "PUBLISHED" && (
            <Link
              href={`/i/${inviteId}`}
              target="_blank"
              className="text-sm font-medium px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.08)", color: "#FAF8F3" }}
            >
              {t.view}
            </Link>
          )}

          {isDraftMode ? (
            <Link href={`/invitations/publish?lang=${lang}`} className="btn-gold text-sm px-4 py-2">
              {t.publishCta}
            </Link>
          ) : (
            <Link
              href={inviteStatus === "DRAFT" || inviteStatus === "PENDING_PAYMENT" ? `/dashboard/invites/${inviteId}` : `/dashboard?lang=${lang}`}
              className="btn-gold text-sm px-4 py-2"
            >
              {inviteStatus === "DRAFT" || inviteStatus === "PENDING_PAYMENT" ? t.publish : t.toMyInvitations}
            </Link>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside
          className="editor-sidebar w-full sm:w-80 lg:w-96 shrink-0 flex flex-col"
          style={{ background: "white", borderRight: "1px solid var(--border)" }}
        >
          {/* Tabs */}
          <div className="flex border-b shrink-0 overflow-x-auto" style={{ borderColor: "var(--border)" }}>
            {(["fields", "design", "blocks", "media"] as Tab[]).map((tb) => (
              <button
                key={tb}
                onClick={() => setTab(tb)}
                className="flex-1 py-3 text-xs font-medium transition-colors whitespace-nowrap px-2"
                style={{
                  color: tab === tb ? "var(--charcoal)" : "var(--muted)",
                  borderBottom: tab === tb ? `2px solid ${accent}` : "2px solid transparent",
                }}
              >
                {t.tabs[tb]}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

            {/* ── FIELDS TAB ── */}
            {tab === "fields" && (
              <>
                {currentTemplate && (
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: currentTemplate.bg }}>
                    <span className="text-2xl">{currentTemplate.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: currentTemplate.textDark }}>{currentTemplateName}</p>
                      <Link href={`/templates?lang=${lang}`} className="text-xs underline" style={{ color: currentTemplate.textMuted }}>{t.changeTemplate}</Link>
                    </div>
                  </div>
                )}

                <Section label={t.namesSection}>
                  <Field label={t.mainName} placeholder="Айдар" value={data.groomName} onChange={(v) => update({ groomName: v })} />
                  <Field label={t.partnerName} placeholder="Айгерім" value={data.brideName} onChange={(v) => update({ brideName: v })} />
                </Section>

                <Section label={t.eventSection}>
                  <Field label={t.dateLabel} type="date" value={data.date} onChange={(v) => update({ date: v })} />
                  <Field label={t.timeLabel} type="time" value={data.time} onChange={(v) => update({ time: v })} />
                </Section>

                <Section label={t.locationSection}>
                  <Field label={t.address} placeholder="Алматы, Grand Hall" value={data.location} onChange={(v) => update({ location: v })} />
                  <Field label={t.mapLink} placeholder="https://2gis.kz/..." value={data.mapLink} onChange={(v) => update({ mapLink: v })} />
                </Section>

                <Section label={t.contactSection}>
                  <Field label={t.whatsappNum} placeholder="+7 700 000 0000" value={data.whatsapp} onChange={(v) => update({ whatsapp: v })} />
                  <Field label={t.organizerPhone} placeholder="+7 701 000 0000" value={data.organizerPhone} onChange={(v) => update({ organizerPhone: v })} />
                </Section>

                <Section label={t.invitationTextSection}>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                      {t.personalMessage}
                    </label>
                    <textarea
                      className="input-premium resize-none"
                      rows={5}
                      placeholder={t.personalMessagePlaceholder}
                      value={data.invitationText}
                      onChange={(e) => update({ invitationText: e.target.value })}
                    />
                  </div>
                </Section>
              </>
            )}

            {/* ── DESIGN TAB ── */}
            {tab === "design" && (
              <>
                {/* Background type */}
                <Section label={t.bgTypeSection}>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { id: "color", label: t.bgTypes.color, icon: "🎨" },
                      { id: "gradient", label: t.bgTypes.gradient, icon: "🌈" },
                      { id: "image", label: t.bgTypes.image, icon: "🖼️" },
                      { id: "video", label: t.bgTypes.video, icon: "🎬" },
                    ] as { id: EditorData["bgType"]; label: string; icon: string }[]).map((bt) => (
                      <button
                        key={bt.id}
                        onClick={() => update({ bgType: bt.id })}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all"
                        style={{
                          background: data.bgType === bt.id ? "rgba(196,150,62,0.08)" : "var(--cream)",
                          border: `1px solid ${data.bgType === bt.id ? "rgba(196,150,62,0.3)" : "var(--border)"}`,
                          color: data.bgType === bt.id ? "var(--charcoal)" : "var(--muted)",
                        }}
                      >
                        <span>{bt.icon}</span>
                        {bt.label}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* Color bg */}
                {data.bgType === "color" && (
                  <Section label={t.colorsSection}>
                    <ColorField label={t.bgColor} value={data.bgColor || (currentTemplate?.bg ?? "#FAF8F3")} onChange={(v) => update({ bgColor: v })} />
                    <ColorField label={t.accentColor} value={data.accentColor || (currentTemplate?.accent ?? "#C4963E")} onChange={(v) => update({ accentColor: v })} />
                  </Section>
                )}

                {/* Gradient bg */}
                {data.bgType === "gradient" && (
                  <Section label={t.gradientSection}>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Rose Gold", val: "linear-gradient(135deg,#fce4ec,#ffd1dc,#fff0f3)" },
                        { label: "Midnight", val: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)" },
                        { label: "Ivory", val: "linear-gradient(135deg,#faf8f3,#f5efe0,#ede4cc)" },
                        { label: "Kazakh", val: "linear-gradient(135deg,#8b0000,#c49a2e,#8b0000)" },
                        { label: "Emerald", val: "linear-gradient(135deg,#e8f5e9,#a5d6a7,#66bb6a)" },
                        { label: "Ocean", val: "linear-gradient(135deg,#e3f2fd,#90caf9,#42a5f5)" },
                      ].map((g) => (
                        <button
                          key={g.val}
                          onClick={() => update({ bgGradient: g.val })}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
                          style={{
                            border: `2px solid ${data.bgGradient === g.val ? accent : "var(--border)"}`,
                            color: "var(--charcoal)",
                          }}
                        >
                          <span
                            className="w-6 h-6 rounded-full shrink-0"
                            style={{ background: g.val }}
                          />
                          {g.label}
                        </button>
                      ))}
                    </div>
                    <ColorField label={t.accentColor} value={data.accentColor || "#C4963E"} onChange={(v) => update({ accentColor: v })} />
                  </Section>
                )}

                {/* Image bg */}
                {data.bgType === "image" && (
                  <Section label={t.imageBgSection}>
                    <ImageUploadField target={uploadTarget} lang={lang} value={data.bgImageUrl} onChange={(url) => update({ bgImageUrl: url })} />
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>
                        {t.blur(data.bgBlur)}
                      </label>
                      <input
                        type="range" min={0} max={20} step={1}
                        value={data.bgBlur}
                        onChange={(e) => update({ bgBlur: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>
                        {t.opacity(Math.round(data.bgOpacity * 100))}
                      </label>
                      <input
                        type="range" min={0} max={1} step={0.05}
                        value={data.bgOpacity}
                        onChange={(e) => update({ bgOpacity: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <ColorField label={t.overlay} value={data.bgOverlay || "rgba(0,0,0,0)"} onChange={(v) => update({ bgOverlay: v })} />
                    <ColorField label={t.accentColor} value={data.accentColor || "#C4963E"} onChange={(v) => update({ accentColor: v })} />
                  </Section>
                )}

                {/* Video bg */}
                {data.bgType === "video" && (
                  <Section label={t.videoBgSection}>
                    <Field
                      label={t.videoBgLink}
                      placeholder="https://example.com/bg.mp4"
                      value={data.bgVideoUrl}
                      onChange={(v) => update({ bgVideoUrl: v })}
                    />
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>
                        {t.opacity(Math.round(data.bgOpacity * 100))}
                      </label>
                      <input
                        type="range" min={0} max={1} step={0.05}
                        value={data.bgOpacity}
                        onChange={(e) => update({ bgOpacity: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <ColorField label={t.overlay} value={data.bgOverlay || "rgba(0,0,0,0)"} onChange={(v) => update({ bgOverlay: v })} />
                    <ColorField label={t.accentColor} value={data.accentColor || "#C4963E"} onChange={(v) => update({ accentColor: v })} />
                  </Section>
                )}

                <Section label={t.fontSection}>
                  <div className="grid grid-cols-1 gap-2">
                    {FONTS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => update({ fontFamily: f.id })}
                        className="text-left px-4 py-3 rounded-xl text-sm transition-all"
                        style={{
                          background: data.fontFamily === f.id ? "rgba(196,150,62,0.08)" : "var(--cream)",
                          border: `1px solid ${data.fontFamily === f.id ? "rgba(196,150,62,0.3)" : "var(--border)"}`,
                          color: "var(--charcoal)",
                        }}
                      >
                        {lang === "ru" ? f.ru : f.kk}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section label={t.animationSection}>
                  <div className="grid grid-cols-3 gap-2">
                    {ANIMATIONS.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => update({ animationStyle: a.id })}
                        className="py-2.5 rounded-xl text-xs font-medium transition-all"
                        style={{
                          background: data.animationStyle === a.id ? "rgba(196,150,62,0.08)" : "var(--cream)",
                          border: `1px solid ${data.animationStyle === a.id ? "rgba(196,150,62,0.3)" : "var(--border)"}`,
                          color: data.animationStyle === a.id ? "var(--charcoal)" : "var(--muted)",
                        }}
                      >
                        {lang === "ru" ? a.ru : a.kk}
                      </button>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* ── BLOCKS TAB (DnD) ── */}
            {tab === "blocks" && (
              <>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {t.blocksHint}
                </p>
                {data.sections.map((section, i) => {
                  const block = BLOCK_META.find((b) => b.id === section.id);
                  if (!block) return null;
                  return (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={() => onDragStart(i)}
                      onDragOver={(e) => onDragOver(e, i)}
                      onDrop={onDrop}
                      className="flex items-center gap-3 p-4 rounded-xl cursor-grab active:cursor-grabbing transition-all"
                      style={{
                        background: section.enabled ? "rgba(196,150,62,0.05)" : "var(--cream)",
                        border: `1px solid ${section.enabled ? "rgba(196,150,62,0.25)" : "var(--border)"}`,
                      }}
                    >
                      <span className="text-sm select-none" style={{ color: "var(--muted)" }}>⠿</span>
                      <span>{block.icon}</span>
                      <p className="text-sm font-medium flex-1" style={{ color: "var(--charcoal)" }}>{lang === "ru" ? block.ru : block.kk}</p>
                      <div
                        className={`toggle-track ${section.enabled ? "active" : ""}`}
                        style={section.enabled ? { background: accent } : {}}
                        onClick={() => toggleSection(section.id)}
                      >
                        <div className="toggle-thumb" />
                      </div>
                    </div>
                  );
                })}

                {/* Block content editors */}
                {data.sections.find((s) => s.id === "love_story" && s.enabled) && (
                  <Section label={t.loveStorySection}>
                    <textarea
                      className="input-premium resize-none"
                      rows={4}
                      placeholder={t.loveStoryPlaceholder}
                      value={data.loveStory}
                      onChange={(e) => update({ loveStory: e.target.value })}
                    />
                  </Section>
                )}
                {data.sections.find((s) => s.id === "dress_code" && s.enabled) && (
                  <Section label={t.dressCodeSection}>
                    <textarea
                      className="input-premium resize-none"
                      rows={2}
                      placeholder={t.dressCodePlaceholder}
                      value={data.dressCode}
                      onChange={(e) => update({ dressCode: e.target.value })}
                    />
                  </Section>
                )}
                {data.sections.find((s) => s.id === "wishes" && s.enabled) && (
                  <Section label={t.wishesSection}>
                    <textarea
                      className="input-premium resize-none"
                      rows={3}
                      placeholder={t.wishesPlaceholder}
                      value={data.wishesText}
                      onChange={(e) => update({ wishesText: e.target.value })}
                    />
                  </Section>
                )}
                {data.sections.find((s) => s.id === "contacts" && s.enabled) && (
                  <Section label={t.contactsSection}>
                    <textarea
                      className="input-premium resize-none"
                      rows={2}
                      placeholder={t.contactsPlaceholder}
                      value={data.contactsText}
                      onChange={(e) => update({ contactsText: e.target.value })}
                    />
                  </Section>
                )}
                {data.sections.find((s) => s.id === "gift_info" && s.enabled) && (
                  <Section label={t.giftInfoSection}>
                    <textarea
                      className="input-premium resize-none"
                      rows={2}
                      placeholder={t.giftInfoPlaceholder}
                      value={data.giftInfo}
                      onChange={(e) => update({ giftInfo: e.target.value })}
                    />
                  </Section>
                )}
                {data.sections.find((s) => s.id === "video_section" && s.enabled) && (
                  <Section label={t.videoSection}>
                    <Field
                      label={t.videoLink}
                      placeholder="https://youtube.com/..."
                      value={data.videoUrl}
                      onChange={(v) => update({ videoUrl: v })}
                    />
                  </Section>
                )}
                {data.sections.find((s) => s.id === "rsvp" && s.enabled) && (
                  <Section label={BLOCK_META.find((b) => b.id === "rsvp")![lang === "ru" ? "ru" : "kk"]}>
                    <Field
                      label={t.rsvpButtonText}
                      placeholder={t.rsvpButtonPlaceholder}
                      value={data.rsvpText}
                      onChange={(v) => update({ rsvpText: v })}
                    />
                  </Section>
                )}
              </>
            )}

            {/* ── MEDIA TAB ── */}
            {tab === "media" && (
              <>
                <Section label={t.gallerySection}>
                  <GalleryUploader
                    target={uploadTarget}
                    lang={lang}
                    urls={data.galleryUrls}
                    onChange={(urls) => update({ galleryUrls: urls })}
                  />
                </Section>

                <Section label={t.musicSection}>
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--cream)", border: "1px solid var(--border)" }}>
                    <p className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>{t.musicToggle}</p>
                    <div
                      className={`toggle-track ${data.musicEnabled ? "active" : ""}`}
                      style={data.musicEnabled ? { background: accent } : {}}
                      onClick={() => update({ musicEnabled: !data.musicEnabled })}
                    >
                      <div className="toggle-thumb" />
                    </div>
                  </div>

                  {data.musicEnabled && (
                    <>
                      {data.musicTitle && (
                        <p className="text-xs font-medium" style={{ color: "var(--gold-dark)" }}>
                          {t.musicSelected(data.musicTitle)}
                        </p>
                      )}

                      {/* Predefined playlist */}
                      <div>
                        <p className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>{t.predefinedSongs}</p>
                        <div className="flex flex-col gap-1">
                          {ROMANTIC_PLAYLIST.map((song) => (
                            <button
                              key={song.title}
                              onClick={() => update({ musicTitle: song.title, musicUrl: "" })}
                              className="text-left px-3 py-2 rounded-lg text-xs transition-all"
                              style={{
                                background: !data.musicUrl && data.musicTitle === song.title ? "rgba(196,150,62,0.1)" : "var(--cream)",
                                border: `1px solid ${!data.musicUrl && data.musicTitle === song.title ? "rgba(196,150,62,0.3)" : "var(--border)"}`,
                                color: "var(--charcoal)",
                              }}
                            >
                              🎵 {song.title}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Own upload */}
                      <div>
                        <p className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>{t.uploadOwnMusic}</p>
                        <MusicUploader
                          target={uploadTarget}
                          lang={lang}
                          musicUrl={data.musicUrl}
                          onUploaded={(url, fileLabel) => update({ musicUrl: url, musicTitle: fileLabel })}
                          onRemove={() => update({ musicUrl: "" })}
                        />
                      </div>

                      <Field
                        label={t.musicTitleLabel}
                        placeholder={t.musicTitlePlaceholder}
                        value={data.musicTitle}
                        onChange={(v) => update({ musicTitle: v })}
                      />

                      {/* Controls */}
                      <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: "var(--cream)", border: "1px solid var(--border)" }}>
                        <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>{t.musicSettings}</p>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-sm" style={{ color: "var(--charcoal)" }}>{t.repeat}</span>
                          <div
                            className={`toggle-track ${data.musicLoop ? "active" : ""}`}
                            style={data.musicLoop ? { background: accent } : {}}
                            onClick={() => update({ musicLoop: !data.musicLoop })}
                          >
                            <div className="toggle-thumb" />
                          </div>
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-sm" style={{ color: "var(--charcoal)" }}>{t.autoplay}</span>
                          <div
                            className={`toggle-track ${data.musicAutoplay ? "active" : ""}`}
                            style={data.musicAutoplay ? { background: accent } : {}}
                            onClick={() => update({ musicAutoplay: !data.musicAutoplay })}
                          >
                            <div className="toggle-thumb" />
                          </div>
                        </label>
                      </div>
                    </>
                  )}
                </Section>
              </>
            )}
          </div>
        </aside>

        {/* Live preview */}
        <main className="hidden sm:flex flex-1 items-center justify-center p-8" style={{ background: "var(--cream)" }}>
          <div className="flex flex-col items-center gap-4">
            <p className="label-caps" style={{ color: "var(--gold)" }}>{t.previewLabel}</p>
            <div className="phone-frame w-[260px]">
              <div className="phone-screen" style={{ height: 520 }}>
                <InvitePreview data={data} template={currentTemplate} />
              </div>
            </div>
            <p className="text-xs text-center max-w-xs" style={{ color: "var(--muted)" }}>
              {t.previewHint}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-caps mb-3" style={{ color: "var(--gold)" }}>{label}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>{label}</label>
      <input type={type} className="input-premium" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const safeValue = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#FAF8F3";
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5"
          style={{ background: "var(--cream)" }}
        />
        <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{value}</span>
      </div>
    </div>
  );
}
