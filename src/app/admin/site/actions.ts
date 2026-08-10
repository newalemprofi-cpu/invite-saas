"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { uploadFile, deleteFile } from "@/lib/storage";
import { validateUpload } from "@/lib/media-validation";
import { getSiteContent, updateSiteContent } from "@/lib/site-content";
import { EVENT_CATEGORIES } from "@/lib/event-categories";

/**
 * Admin uploads a cover photo for one homepage event category. Follows the
 * same shape as recommended-tracks.ts's audio upload: validate -> store
 * under its own key prefix -> save only the storage key (never a raw URL)
 * in the JSON blob, deriving the public URL on read via getPublicUrl().
 */
export async function uploadCategoryCoverAction(formData: FormData): Promise<{ error?: string; key?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const category = String(formData.get("category") ?? "");
  const file = formData.get("file");

  if (!EVENT_CATEGORIES.some((c) => c.id === category)) return { error: "Белгісіз категория" };
  if (!(file instanceof File) || file.size === 0) return { error: "Сурет таңдаңыз" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const validated = validateUpload("image", file.type, buffer.byteLength, buffer);
  if (!validated) return { error: "Қолдамайтын сурет форматы немесе өлшемі (JPG/PNG/WEBP/GIF, 8МБ дейін)" };

  const key = `site/category-covers/${category}-${randomUUID()}.${validated.ext}`;
  try {
    await uploadFile({ key, contentType: validated.mime, body: buffer });
  } catch (err) {
    console.error("[admin-site] category cover upload failed", err);
    return { error: "Жүктеу сәтсіз аяқталды" };
  }

  const current = await getSiteContent();
  const oldKey = current.categoryCovers[category];
  await updateSiteContent({ categoryCovers: { ...current.categoryCovers, [category]: key } });
  if (oldKey) await deleteFile(oldKey).catch(() => {});

  revalidatePath("/admin/site");
  revalidatePath("/");
  return { key };
}

export async function removeCategoryCoverAction(category: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const current = await getSiteContent();
  const oldKey = current.categoryCovers[category];
  if (!oldKey) return {};

  const { [category]: _removed, ...rest } = current.categoryCovers;
  void _removed;
  await updateSiteContent({ categoryCovers: rest });
  await deleteFile(oldKey).catch(() => {});

  revalidatePath("/admin/site");
  revalidatePath("/");
  return {};
}

/**
 * Admin uploads a custom marketing screenshot for the homepage hero's phone
 * mockup. When set, this overrides the template-based preview entirely (see
 * getHeroPreview() in src/app/page.tsx). Same shape as the category-cover
 * upload above: validate -> store under its own key prefix -> save only the
 * storage key.
 */
export async function uploadHeroPreviewImageAction(formData: FormData): Promise<{ error?: string; key?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Сурет таңдаңыз" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const validated = validateUpload("image", file.type, buffer.byteLength, buffer);
  if (!validated) return { error: "Қолдамайтын сурет форматы немесе өлшемі (JPG/PNG/WEBP/GIF, 8МБ дейін)" };

  const key = `site/hero-preview/${randomUUID()}.${validated.ext}`;
  try {
    await uploadFile({ key, contentType: validated.mime, body: buffer });
  } catch (err) {
    console.error("[admin-site] hero preview image upload failed", err);
    return { error: "Жүктеу сәтсіз аяқталды" };
  }

  const current = await getSiteContent();
  const oldKey = current.heroPreviewImage;
  await updateSiteContent({ heroPreviewImage: key });
  if (oldKey) await deleteFile(oldKey).catch(() => {});

  revalidatePath("/admin/site");
  revalidatePath("/");
  return { key };
}

export async function removeHeroPreviewImageAction(): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const current = await getSiteContent();
  const oldKey = current.heroPreviewImage;
  if (!oldKey) return {};

  await updateSiteContent({ heroPreviewImage: "" });
  await deleteFile(oldKey).catch(() => {});

  revalidatePath("/admin/site");
  revalidatePath("/");
  return {};
}
