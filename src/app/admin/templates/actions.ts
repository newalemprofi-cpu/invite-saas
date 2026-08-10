"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/storage";
import { validateUpload } from "@/lib/media-validation";

type ImageField = "previewImage" | "demoImage";

function isImageField(value: unknown): value is ImageField {
  return value === "previewImage" || value === "demoImage";
}

/** A stored value only names an object we can safely delete if it's actually a key we generated — never delete an admin-pasted external URL (legacy data). */
function isOwnedStorageKey(value: string | null): value is string {
  return !!value && !/^https?:\/\//i.test(value) && !value.startsWith("/");
}

export async function uploadTemplateImageAction(formData: FormData): Promise<{ error?: string; key?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const templateId = String(formData.get("templateId") ?? "");
  const field = formData.get("field");
  const file = formData.get("file");

  if (!templateId) return { error: "Алдымен шаблонды сақтаңыз" };
  if (!isImageField(field)) return { error: "Белгісіз өріс" };
  if (!(file instanceof File) || file.size === 0) return { error: "Сурет таңдаңыз" };

  const existing = await db.inviteTemplate.findUnique({ where: { id: templateId }, select: { [field]: true } });
  if (!existing) return { error: "Шаблон табылмады" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const validated = validateUpload("image", file.type, buffer.byteLength, buffer);
  if (!validated) return { error: "Қолдамайтын сурет форматы немесе өлшемі (JPG/PNG/WEBP/GIF, 8МБ дейін)" };

  const key = `templates/${field}/${templateId}-${randomUUID()}.${validated.ext}`;
  try {
    await uploadFile({ key, contentType: validated.mime, body: buffer });
  } catch (err) {
    console.error("[admin-templates] image upload failed", err);
    return { error: "Жүктеу сәтсіз аяқталды" };
  }

  await db.inviteTemplate.update({ where: { id: templateId }, data: { [field]: key } });

  const oldValue = existing[field] as string | null;
  if (isOwnedStorageKey(oldValue)) await deleteFile(oldValue).catch(() => {});

  revalidatePath("/admin/templates");
  revalidatePath("/templates");
  revalidatePath("/");
  return { key };
}

export async function removeTemplateImageAction(templateId: string, field: ImageField): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const existing = await db.inviteTemplate.findUnique({ where: { id: templateId }, select: { [field]: true } });
  if (!existing) return { error: "Шаблон табылмады" };

  await db.inviteTemplate.update({ where: { id: templateId }, data: { [field]: null } });

  const oldValue = existing[field] as string | null;
  if (isOwnedStorageKey(oldValue)) await deleteFile(oldValue).catch(() => {});

  revalidatePath("/admin/templates");
  revalidatePath("/templates");
  revalidatePath("/");
  return {};
}
