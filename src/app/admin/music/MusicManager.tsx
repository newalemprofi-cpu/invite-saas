"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  uploadRecommendedTrackAction,
  toggleRecommendedTrackAction,
  reorderRecommendedTracksAction,
  deleteRecommendedTrackAction,
} from "./actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Track {
  id: string;
  title: string;
  artist: string | null;
  url: string;
  enabled: boolean;
  sortOrder: number;
  size: number;
}

const ACCEPTED_MIMES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
];
const MAX_BYTES = 20 * 1024 * 1024;
const GENERIC_ERROR = "Жүктеу сәтсіз аяқталды. Қайталап көріңіз.";

export function MusicManager({ tracks }: { tracks: Track[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function togglePreview(track: Track) {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.src = track.url;
    audio.play().then(() => setPlayingId(track.id)).catch(() => setError("Аудионы ойнату мүмкін болмады"));
    audio.onended = () => setPlayingId(null);
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    setSuccess(false);
    if (file && (!ACCEPTED_MIMES.includes(file.type) || file.size > MAX_BYTES || file.size === 0)) {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setError("Қолдамайтын аудио форматы немесе өлшемі (MP3/M4A/OGG/WAV, 20МБ дейін)");
      return;
    }
    setSelectedFile(file);
  }

  const canSubmit = title.trim().length > 0 && selectedFile !== null && !isPending;

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await uploadRecommendedTrackAction(fd);
        if (result.error) {
          setError(result.error);
          return;
        }
        formRef.current?.reset();
        setTitle("");
        setSelectedFile(null);
        setSuccess(true);
        router.refresh();
      } catch {
        // A Server Action can reject at the transport level (network blip,
        // request too large, dev-server reload mid-request) before our own
        // try/catch inside the action ever runs. Catching it here is what
        // keeps that from surfacing as Next's built-in error screen instead
        // of a normal, dismissable message in this form.
        setError(GENERIC_ERROR);
      }
    });
  }

  function toggle(id: string, enabled: boolean) {
    startTransition(async () => {
      await toggleRecommendedTrackAction(id, enabled);
      router.refresh();
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= tracks.length) return;
    const reordered = [...tracks];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    startTransition(async () => {
      await reorderRecommendedTracksAction(reordered.map((t) => t.id));
      router.refresh();
    });
  }

  function remove(id: string) {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
    startTransition(async () => {
      await deleteRecommendedTrackAction(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={handleUpload} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-base font-bold text-zinc-900">Жаңа ән қосу</h2>
        <Input
          label="Атауы"
          name="title"
          required
          placeholder="Мысалы: Ақ дауа"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input label="Орындаушы (міндетті емес)" name="artist" placeholder="Орындаушы аты" />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>Аудио файл</label>
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept={ACCEPTED_MIMES.join(",")}
            className="sr-only"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={pickFile}
            className="self-start inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            🎵 Аудио файлды таңдау
          </button>
          <p className="text-xs" style={{ color: selectedFile ? "var(--gold-dark)" : "var(--muted)" }}>
            {selectedFile ? `Таңдалды: ${selectedFile.name}` : "Файл таңдалмаған"}
          </p>
          <p className="text-xs text-zinc-400">MP3, M4A, OGG, WAV · 20МБ дейін. Тек лицензиясы бар аудио жүктеңіз.</p>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">{error}</p>
        )}
        {success && !error && (
          <p className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-sm text-emerald-700">
            ✓ Ән сәтті қосылды
          </p>
        )}

        <Button type="submit" loading={isPending} disabled={!canSubmit}>
          {isPending ? "Жүктелуде..." : "Жүктеу"}
        </Button>
      </form>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        {tracks.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-10">Әлі ешбір ән қосылмаған</p>
        ) : (
          <div className="divide-y divide-zinc-50">
            {tracks.map((track, i) => (
              <div key={track.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => togglePreview(track)}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white"
                  style={{ background: "var(--charcoal, #1C1917)" }}
                  type="button"
                  aria-label={playingId === track.id ? "Тоқтату" : "Ойнату"}
                >
                  {playingId === track.id ? "⏸" : "▶"}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{track.title}</p>
                  <p className="text-xs text-zinc-400 truncate">
                    {track.artist ?? "—"} · {(track.size / 1024 / 1024).toFixed(1)} МБ
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={i === 0 || isPending}
                    onClick={() => move(i, -1)}
                    className="w-7 h-7 rounded-lg text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={i === tracks.length - 1 || isPending}
                    onClick={() => move(i, 1)}
                    className="w-7 h-7 rounded-lg text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => toggle(track.id, !track.enabled)}
                  disabled={isPending}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    track.enabled ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {track.enabled ? "Қосулы" : "Өшірулі"}
                </button>

                <button
                  type="button"
                  onClick={() => remove(track.id)}
                  disabled={isPending}
                  className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-600 px-2"
                >
                  Жою
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
