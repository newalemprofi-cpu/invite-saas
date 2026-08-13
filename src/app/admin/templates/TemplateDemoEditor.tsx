"use client";

import { useRef, useState, useTransition } from "react";
import type { TemplateDemoContent } from "@/lib/template-demo";
import { DEMO_GALLERY_MAX } from "@/lib/template-demo";
import {
  uploadTemplateDemoPhotoAction,
  removeTemplateDemoPhotoAction,
  uploadTemplateDemoGalleryImagesAction,
  removeTemplateDemoGalleryImageAction,
  reorderTemplateDemoGalleryAction,
} from "./actions";

export interface DemoTrackOption {
  id: string;
  title: string;
  artist: string | null;
  enabled: boolean;
}

interface Props {
  templateId: string | null;
  slug: string;
  value: TemplateDemoContent;
  onChange: (patch: Partial<TemplateDemoContent>) => void;
  tracks: DemoTrackOption[];
}

/** Mirrors lib/storage.ts's resolveStoredImage()/getPublicUrl() — kept local since storage.ts pulls in the AWS SDK, which must never reach a client bundle. */
function resolveImageSrc(value: string): string {
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  return `/api/media/${value.split("/").map(encodeURIComponent).join("/")}`;
}

export function TemplateDemoEditor({ templateId, slug, value, onChange, tracks }: Props) {
  if (!templateId) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: "var(--cream)", border: "1px dashed var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Толық демо мазмұнын қосу үшін алдымен шаблонды жасап, сақтаңыз.
        </p>
      </div>
    );
  }

  const set = <K extends keyof TemplateDemoContent>(k: K, v: TemplateDemoContent[K]) => onChange({ [k]: v } as Partial<TemplateDemoContent>);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
        Бұл мазмұн тек «Толық көру» демо бетінде көрсетіледі (/templates/{slug}). Нақты клиент шақыруларына әсер етпейді.
      </p>

      <DemoSection label="Негізгі ақпарат">
        <div className="grid grid-cols-2 gap-3">
          <DF label="Жігіттің аты" value={value.groomName ?? ""} onChange={(v) => set("groomName", v)} placeholder="Ерлан" />
          <DF label="Қыздың аты" value={value.brideName ?? ""} onChange={(v) => set("brideName", v)} placeholder="Аружан" />
        </div>
        <DF label="Той иелері" value={value.hosts ?? ""} onChange={(v) => set("hosts", v)} placeholder="Асан мен Гүлнара Сериковтар" />
        <div className="grid grid-cols-2 gap-3">
          <DF label="Күні" type="date" value={value.date ?? ""} onChange={(v) => set("date", v)} />
          <DF label="Уақыты" type="time" value={value.time ?? ""} onChange={(v) => set("time", v)} />
        </div>
        <DF label="Той/жиын орны" value={value.location ?? ""} onChange={(v) => set("location", v)} placeholder="Grand Hall" />
        <DF label="Мекенжай" value={value.address ?? ""} onChange={(v) => set("address", v)} placeholder="Алматы, әл-Фараби даңғылы 77" />
      </DemoSection>

      <DemoSection label="Мәтін">
        <div className="grid grid-cols-2 gap-3">
          <DF label="Шақыру мәтіні (қазақша)" value={value.invitationTextKk ?? ""} onChange={(v) => set("invitationTextKk", v)} multiline />
          <DF label="Текст приглашения (русский)" value={value.invitationTextRu ?? ""} onChange={(v) => set("invitationTextRu", v)} multiline />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DF label="Бағдарлама (қазақша)" value={value.programTextKk ?? ""} onChange={(v) => set("programTextKk", v)} multiline />
          <DF label="Программа (русский)" value={value.programTextRu ?? ""} onChange={(v) => set("programTextRu", v)} multiline />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DF label="Қосымша ескерту (қазақша)" value={value.noteKk ?? ""} onChange={(v) => set("noteKk", v)} multiline />
          <DF label="Доп. примечание (русский)" value={value.noteRu ?? ""} onChange={(v) => set("noteRu", v)} multiline />
        </div>
      </DemoSection>

      <DemoSection label="Медиа">
        <DemoPhotoField templateId={templateId} value={value.mainPhoto ?? ""} onChange={(v) => set("mainPhoto", v || undefined)} />
        <DemoGalleryField templateId={templateId} value={value.gallery ?? []} onChange={(v) => set("gallery", v)} />
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Музыка</label>
          <select
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ border: "1.5px solid var(--border)", color: "var(--charcoal)" }}
            value={value.musicTrackId ?? ""}
            onChange={(e) => set("musicTrackId", e.target.value || undefined)}
          >
            <option value="">— Музыкасыз —</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}{t.artist ? ` — ${t.artist}` : ""}{!t.enabled ? " (өшірулі)" : ""}
              </option>
            ))}
          </select>
        </div>
      </DemoSection>

      <DemoSection label="Карта">
        <DF label="Карта сілтемесі" value={value.mapLink ?? ""} onChange={(v) => set("mapLink", v)} placeholder="https://2gis.kz/..." />
      </DemoSection>
    </div>
  );
}

function DemoSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="label-caps" style={{ color: "var(--gold)" }}>{label}</p>
      {children}
    </div>
  );
}

function DF({
  label, value, onChange, type = "text", multiline, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; multiline?: boolean; placeholder?: string;
}) {
  const base = "w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors focus:ring-1";
  const style = { border: "1.5px solid var(--border)", color: "var(--charcoal)" };
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} className={`${base} resize-none`} style={style} rows={3} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={base} style={style} placeholder={placeholder} />
      )}
    </div>
  );
}

function DemoPhotoField({ templateId, value, onChange }: { templateId: string; value: string; onChange: (v: string) => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    const form = new FormData();
    form.append("templateId", templateId);
    form.append("file", file);
    startTransition(async () => {
      const result = await uploadTemplateDemoPhotoAction(form);
      if (result.error) setError(result.error);
      else if (result.key) onChange(result.key);
    });
  };

  const handleRemove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeTemplateDemoPhotoAction(templateId);
      if (result.error) setError(result.error);
      else onChange("");
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Негізгі демо фото</label>
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
      {value ? (
        <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolveImageSrc(value)} alt="" className="w-full h-40 object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex gap-2 p-2" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.55))" }}>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isPending} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "rgba(0,0,0,0.5)" }}>
              {isPending ? "Жүктелуде..." : "Ауыстыру"}
            </button>
            <button type="button" onClick={handleRemove} disabled={isPending} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "rgba(220,38,38,0.75)" }}>
              Өшіру
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className="flex flex-col items-center justify-center gap-1 py-6 rounded-xl text-sm font-medium transition-all"
          style={{ background: "var(--cream)", border: "1px dashed var(--border)", color: "var(--charcoal)", opacity: isPending ? 0.6 : 1 }}
        >
          <span>{isPending ? "Жүктелуде..." : "🖼️ Суретті жүктеу"}</span>
          <span className="text-[10px] font-normal" style={{ color: "var(--muted)" }}>JPG, PNG, WEBP, GIF · 8МБ дейін</span>
        </button>
      )}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

function DemoGalleryField({ templateId, value, onChange }: { templateId: string; value: string[]; onChange: (v: string[]) => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragSrc = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const remaining = DEMO_GALLERY_MAX - value.length;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const form = new FormData();
    form.append("templateId", templateId);
    Array.from(files).forEach((f) => form.append("files", f));
    startTransition(async () => {
      const result = await uploadTemplateDemoGalleryImagesAction(form);
      if (result.error) setError(result.error);
      else if (result.gallery) onChange(result.gallery);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const removeAt = (key: string) => {
    setError(null);
    startTransition(async () => {
      const result = await removeTemplateDemoGalleryImageAction(templateId, key);
      if (result.error) setError(result.error);
      else if (result.gallery) onChange(result.gallery);
    });
  };

  const persistOrder = (next: string[]) => {
    onChange(next);
    startTransition(async () => {
      await reorderTemplateDemoGalleryAction(templateId, next);
    });
  };

  function onDrop() {
    dragSrc.current = null;
    setDragOverIdx(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Демо галерея</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {value.map((key, i) => (
            <div
              key={key}
              draggable
              onDragStart={() => { dragSrc.current = i; }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
              onDrop={() => {
                if (dragSrc.current !== null && dragSrc.current !== i) {
                  const arr = [...value];
                  const [moved] = arr.splice(dragSrc.current, 1);
                  arr.splice(i, 0, moved);
                  persistOrder(arr);
                }
                onDrop();
              }}
              onDragEnd={onDrop}
              className="relative aspect-square rounded-lg overflow-hidden group cursor-grab active:cursor-grabbing"
              style={{ outline: dragOverIdx === i ? "2px solid var(--gold)" : "none" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveImageSrc(key)} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(key)}
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
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className="flex flex-col items-center justify-center gap-1 py-4 rounded-xl text-sm font-medium transition-all"
          style={{ background: "var(--cream)", border: "1px dashed var(--border)", color: "var(--charcoal)", opacity: isPending ? 0.6 : 1 }}
        >
          <span>{isPending ? "…" : "🖼️ Суреттерді жүктеу"}</span>
          <span className="text-[10px] font-normal" style={{ color: "var(--muted)" }}>JPG, PNG, WEBP, GIF · 8МБ дейін</span>
        </button>
      ) : (
        <p className="text-xs text-center py-2" style={{ color: "var(--muted)" }}>Ең көбі {DEMO_GALLERY_MAX} фото жүктеуге болады</p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--muted)" }}>{value.length}/{DEMO_GALLERY_MAX} сурет</p>
        {value.length > 1 && <p className="text-[10px]" style={{ color: "var(--muted)" }}>Ретін өзгерту үшін сүйреңіз</p>}
      </div>

      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
