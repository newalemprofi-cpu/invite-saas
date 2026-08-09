import type { Metadata } from "next";
import { getAllRecommendedTracks } from "@/lib/recommended-tracks";
import { MusicManager } from "./MusicManager";

export const metadata: Metadata = { title: "Музыка — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminMusicPage() {
  const tracks = await getAllRecommendedTracks();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Ұсынылған музыка</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Конструктордағы &ldquo;Ұсынылған әндер&rdquo; тізімі осы жерден басқарылады. Тек нақты
          жүктелген аудио ғана қосыла алады — атауы ғана бар жалған жазба болмайды.
        </p>
      </div>

      <MusicManager
        tracks={tracks.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          url: t.url,
          enabled: t.enabled,
          sortOrder: t.sortOrder,
          size: t.size,
        }))}
      />
    </div>
  );
}
