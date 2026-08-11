"use client";

import { useRef, useState } from "react";
import { useUpload, type UploadErrorCode, type UploadTarget } from "@/lib/useUpload";
import type { Lang } from "@/lib/i18n";

export const ERROR_MESSAGES: Record<Lang, Record<UploadErrorCode, string>> = {
  kk: {
    UNAUTHORIZED: "Жүйеге қайта кіріңіз",
    FORBIDDEN: "Бұл әрекетке рұқсатыңыз жоқ",
    INVITE_NOT_FOUND: "Шақыру табылмады",
    INVALID_KIND: "Қате сұрау",
    MISSING_FILE: "Файл таңдалмады",
    INVALID_FILE: "Файл форматы немесе өлшемі қолдамайды",
    INVALID_DRAFT_TOKEN: "Қате сұрау. Бетті жаңартып көріңіз.",
    STORAGE_NOT_CONFIGURED: "Файл сақтау қызметі әлі қосылмаған",
    RATE_LIMITED: "Тым көп жүктеу жасалды. Сәл кейін қайталаңыз.",
    RATE_LIMITER_UNAVAILABLE: "Қызмет уақытша қолжетімсіз. Сәл кейін қайталаңыз.",
    UPLOAD_FAILED: "Жүктеу сәтсіз аяқталды. Қайталаңыз.",
    NETWORK_ERROR: "Желі қатесі. Қайталаңыз.",
    INVALID_FORM: "Қате сұрау",
    MISSING_INVITE_ID: "Қате сұрау",
  },
  ru: {
    UNAUTHORIZED: "Войдите в аккаунт заново",
    FORBIDDEN: "Нет доступа к этому действию",
    INVITE_NOT_FOUND: "Приглашение не найдено",
    INVALID_KIND: "Некорректный запрос",
    MISSING_FILE: "Файл не выбран",
    INVALID_FILE: "Неподдерживаемый формат или размер файла",
    INVALID_DRAFT_TOKEN: "Некорректный запрос. Обновите страницу.",
    STORAGE_NOT_CONFIGURED: "Хранилище файлов ещё не подключено",
    RATE_LIMITED: "Слишком много загрузок. Попробуйте немного позже.",
    RATE_LIMITER_UNAVAILABLE: "Сервис временно недоступен. Попробуйте немного позже.",
    UPLOAD_FAILED: "Не удалось загрузить файл. Попробуйте снова.",
    NETWORK_ERROR: "Ошибка сети. Попробуйте снова.",
    INVALID_FORM: "Некорректный запрос",
    MISSING_INVITE_ID: "Некорректный запрос",
  },
};

const IMAGE_LABELS = {
  kk: { upload: "🖼️ Сурет жүктеу", replace: "Ауыстыру", remove: "Өшіру", uploading: "Жүктелуде...", hint: "JPG, PNG, WEBP · 8МБ дейін" },
  ru: { upload: "🖼️ Загрузить изображение", replace: "Заменить", remove: "Удалить", uploading: "Загрузка...", hint: "JPG, PNG, WEBP · до 8 МБ" },
} as const;

interface ImageUploadFieldProps {
  target: UploadTarget;
  lang: Lang;
  value: string;
  onChange: (url: string) => void;
}

export function ImageUploadField({ target, lang, value, onChange }: ImageUploadFieldProps) {
  const { upload, uploading, error, clearError } = useUpload(target);
  const inputRef = useRef<HTMLInputElement>(null);
  const L = IMAGE_LABELS[lang];
  const err = error ? ERROR_MESSAGES[lang][error] : null;

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const result = await upload(file, "image");
    if (result) onChange(result.url);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {value ? (
        <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-32 object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex gap-2 p-2" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.55))" }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              {uploading ? L.uploading : L.replace}
            </button>
            <button
              type="button"
              onClick={() => { onChange(""); clearError(); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: "rgba(220,38,38,0.75)" }}
            >
              {L.remove}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-1 py-6 rounded-xl text-sm font-medium transition-all"
          style={{ background: "var(--cream)", border: "1px dashed var(--border)", color: "var(--charcoal)", opacity: uploading ? 0.6 : 1 }}
        >
          <span>{uploading ? L.uploading : L.upload}</span>
          <span className="text-[10px] font-normal" style={{ color: "var(--muted)" }}>{L.hint}</span>
        </button>
      )}
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  );
}

const GALLERY_MAX = 10;

const GALLERY_LABELS = {
  kk: {
    upload: "🖼️ Суреттерді жүктеу",
    hint: "Бірнеше суретті бірден таңдай аласыз",
    reorderHint: "Ретін өзгерту үшін сүйреңіз",
    max: (n: number) => `${n}/${GALLERY_MAX} сурет`,
    limitReached: "Ең көбі 10 фото жүктеуге болады",
  },
  ru: {
    upload: "🖼️ Загрузить изображения",
    hint: "Можно выбрать сразу несколько файлов",
    reorderHint: "Перетащите, чтобы изменить порядок",
    max: (n: number) => `${n}/${GALLERY_MAX} фото`,
    limitReached: "Можно загрузить не более 10 фотографий",
  },
} as const;

interface GalleryUploaderProps {
  target: UploadTarget;
  lang: Lang;
  urls: string[];
  onChange: (urls: string[]) => void;
}

export function GalleryUploader({ target, lang, urls, onChange }: GalleryUploaderProps) {
  const { upload, uploading, error } = useUpload(target);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragSrc = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const L = GALLERY_LABELS[lang];
  const err = error ? ERROR_MESSAGES[lang][error] : null;
  const remaining = GALLERY_MAX - urls.length;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || remaining <= 0) return;
    const selected = Array.from(files).slice(0, remaining);
    const results = await Promise.all(selected.map((f) => upload(f, "image")));
    const newUrls = results.filter((r): r is NonNullable<typeof r> => r !== null).map((r) => r.url);
    if (newUrls.length > 0) onChange([...urls, ...newUrls]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(i: number) {
    onChange(urls.filter((_, idx) => idx !== i));
  }

  function onDrop() {
    dragSrc.current = null;
    setDragOverIdx(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((url, i) => (
            <div
              key={url + i}
              draggable
              onDragStart={() => { dragSrc.current = i; }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
              onDrop={() => {
                if (dragSrc.current !== null && dragSrc.current !== i) {
                  const arr = [...urls];
                  const [moved] = arr.splice(dragSrc.current, 1);
                  arr.splice(i, 0, moved);
                  onChange(arr);
                }
                onDrop();
              }}
              onDragEnd={onDrop}
              className="relative aspect-square rounded-xl overflow-hidden group cursor-grab active:cursor-grabbing"
              style={{ outline: dragOverIdx === i ? "2px solid var(--gold)" : "none" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-1 py-5 rounded-xl text-sm font-medium transition-all"
          style={{ background: "var(--cream)", border: "1px dashed var(--border)", color: "var(--charcoal)", opacity: uploading ? 0.6 : 1 }}
        >
          <span>{uploading ? "…" : L.upload}</span>
          <span className="text-[10px] font-normal" style={{ color: "var(--muted)" }}>{L.hint}</span>
        </button>
      ) : (
        <p className="text-xs text-center py-2" style={{ color: "var(--muted)" }}>{L.limitReached}</p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--muted)" }}>{L.max(urls.length)}</p>
        {urls.length > 1 && <p className="text-[10px]" style={{ color: "var(--muted)" }}>{L.reorderHint}</p>}
      </div>

      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  );
}

const MUSIC_LABELS = {
  kk: { upload: "🎵 Музыка жүктеу", uploading: "Жүктелуде...", uploaded: "Жүктелген файл", remove: "Өшіру", hint: "MP3, M4A, OGG, WAV · 20МБ дейін" },
  ru: { upload: "🎵 Загрузить музыку", uploading: "Загрузка...", uploaded: "Загруженный файл", remove: "Удалить", hint: "MP3, M4A, OGG, WAV · до 20 МБ" },
} as const;

interface MusicUploaderProps {
  target: UploadTarget;
  lang: Lang;
  musicUrl: string;
  onUploaded: (url: string, fileLabel: string) => void;
  onRemove: () => void;
}

export function MusicUploader({ target, lang, musicUrl, onUploaded, onRemove }: MusicUploaderProps) {
  const { upload, uploading, error, clearError } = useUpload(target);
  const inputRef = useRef<HTMLInputElement>(null);
  const L = MUSIC_LABELS[lang];
  const err = error ? ERROR_MESSAGES[lang][error] : null;

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const result = await upload(file, "audio");
    if (result) onUploaded(result.url, file.name.replace(/\.[a-zA-Z0-9]+$/, ""));
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,audio/x-wav,audio/aac"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {musicUrl ? (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl" style={{ background: "rgba(196,150,62,0.08)", border: "1px solid rgba(196,150,62,0.25)" }}>
          <p className="text-xs font-medium truncate" style={{ color: "var(--charcoal)" }}>🎵 {L.uploaded}</p>
          <button type="button" onClick={() => { onRemove(); clearError(); }} className="text-xs font-semibold shrink-0" style={{ color: "#dc2626" }}>
            {L.remove}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-1 py-4 rounded-xl text-sm font-medium transition-all"
          style={{ background: "var(--cream)", border: "1px dashed var(--border)", color: "var(--charcoal)", opacity: uploading ? 0.6 : 1 }}
        >
          <span>{uploading ? L.uploading : L.upload}</span>
          <span className="text-[10px] font-normal" style={{ color: "var(--muted)" }}>{L.hint}</span>
        </button>
      )}
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  );
}
