import type { Metadata } from "next";
import { TemplatesManager } from "./TemplatesManager";
import { getAllRecommendedTracks } from "@/lib/recommended-tracks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Шаблондар — Admin" };

export default async function AdminTemplatesPage() {
  const rows = await getAllRecommendedTracks();
  const tracks = rows.map((r) => ({ id: r.id, title: r.title, artist: r.artist, enabled: r.enabled }));
  return <TemplatesManager tracks={tracks} />;
}
