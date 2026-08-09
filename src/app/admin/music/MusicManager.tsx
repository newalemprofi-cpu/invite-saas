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

export function MusicManager({ tracks }: { tracks: Track[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
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

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const result = await uploadRecommendedTrackAction(fd);
      if (result.error) setError(result.error);
      else {
        form.reset();
        router.refresh();
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
      <form onSubmit={handleUpload} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-base font-bold text-zinc-900">Жаңа ән қосу</h2>
        <Input label="Атауы" name="title" required placeholder="Мысалы: Ақ дауа" />
        <Input label="Орындаушы (міндетті емес)" name="artist" placeholder="Орындаушы аты" />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>Аудио файл</label>
          <input
            type="file"
            name="file"
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,audio/x-wav,audio/aac"
            required
            className="text-sm"
          />
          <p className="text-xs text-zinc-400">MP3, M4A, OGG, WAV · 20МБ дейін. Тек лицензиясы бар аудио жүктеңіз.</p>
        </div>
        {error && (
          <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">{error}</p>
        )}
        <Button type="submit" loading={isPending}>Жүктеу</Button>
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
