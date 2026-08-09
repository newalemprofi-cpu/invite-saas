"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createRecommendedTrack,
  setRecommendedTrackEnabled,
  updateRecommendedTrackOrder,
  deleteRecommendedTrack,
  InvalidAudioFileError,
} from "@/lib/recommended-tracks";

export async function uploadRecommendedTrackAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const title = String(formData.get("title") ?? "").trim();
  const artist = String(formData.get("artist") ?? "").trim() || null;
  const file = formData.get("file");

  if (!title) return { error: "Атауын енгізіңіз" };
  if (!(file instanceof File) || file.size === 0) return { error: "Аудио файл таңдаңыз" };

  try {
    await createRecommendedTrack({ title, artist, file });
  } catch (err) {
    if (err instanceof InvalidAudioFileError) {
      return { error: "Қолдамайтын аудио форматы немесе өлшемі (MP3/M4A/OGG/WAV, 20МБ дейін)" };
    }
    console.error("[admin-music] upload failed", err);
    return { error: "Жүктеу сәтсіз аяқталды" };
  }

  revalidatePath("/admin/music");
  return {};
}

export async function toggleRecommendedTrackAction(id: string, enabled: boolean): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }
  await setRecommendedTrackEnabled(id, enabled);
  revalidatePath("/admin/music");
  return {};
}

export async function reorderRecommendedTracksAction(orderedIds: string[]): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }
  await updateRecommendedTrackOrder(orderedIds);
  revalidatePath("/admin/music");
  return {};
}

export async function deleteRecommendedTrackAction(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }
  await deleteRecommendedTrack(id);
  revalidatePath("/admin/music");
  return {};
}
