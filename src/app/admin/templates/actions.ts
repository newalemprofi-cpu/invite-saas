"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/storage";
import { validateUpload } from "@/lib/media-validation";
import { parseTemplateDemoContent, DEMO_GALLERY_MAX, type TemplateDemoContent } from "@/lib/template-demo";

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

/* ── Template Full-Demo content (§ "Толық демо") ──────────────────────────
 * Separate action surface from the card/catalog image fields above — these
 * write into InviteTemplate.demoContent (a JSON blob) instead of a plain
 * column, but follow the exact same "upload -> store key -> resolve on
 * read" lifecycle as previewImage/demoImage, and the exact same
 * immediate-persist-on-upload UX (text fields instead stay client-state-only
 * until the panel's own "Сақтау" button, same as every other text field in
 * this form). */

async function getDemoContent(templateId: string): Promise<TemplateDemoContent> {
  const row = await db.inviteTemplate.findUnique({ where: { id: templateId }, select: { demoContent: true } });
  return parseTemplateDemoContent(row?.demoContent);
}

async function saveDemoContent(templateId: string, next: TemplateDemoContent): Promise<void> {
  await db.inviteTemplate.update({
    where: { id: templateId },
    data: { demoContent: next as unknown as Prisma.InputJsonValue },
  });
}

export async function uploadTemplateDemoPhotoAction(formData: FormData): Promise<{ error?: string; key?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const templateId = String(formData.get("templateId") ?? "");
  const file = formData.get("file");
  if (!templateId) return { error: "Алдымен шаблонды сақтаңыз" };
  if (!(file instanceof File) || file.size === 0) return { error: "Сурет таңдаңыз" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const validated = validateUpload("image", file.type, buffer.byteLength, buffer);
  if (!validated) return { error: "Қолдамайтын сурет форматы немесе өлшемі (JPG/PNG/WEBP/GIF, 8МБ дейін)" };

  const key = `templates/demo-photo/${templateId}-${randomUUID()}.${validated.ext}`;
  try {
    await uploadFile({ key, contentType: validated.mime, body: buffer });
  } catch (err) {
    console.error("[admin-templates] demo photo upload failed", err);
    return { error: "Жүктеу сәтсіз аяқталды" };
  }

  const current = await getDemoContent(templateId);
  const oldKey = current.mainPhoto;
  await saveDemoContent(templateId, { ...current, mainPhoto: key });
  if (oldKey) await deleteFile(oldKey).catch(() => {});

  revalidatePath("/admin/templates");
  revalidatePath("/templates");
  revalidatePath("/");
  return { key };
}

export async function removeTemplateDemoPhotoAction(templateId: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const current = await getDemoContent(templateId);
  const oldKey = current.mainPhoto;
  if (!oldKey) return {};

  const { mainPhoto: _removed, ...rest } = current;
  void _removed;
  await saveDemoContent(templateId, rest);
  await deleteFile(oldKey).catch(() => {});

  revalidatePath("/admin/templates");
  revalidatePath("/templates");
  revalidatePath("/");
  return {};
}

export async function uploadTemplateDemoGalleryImagesAction(formData: FormData): Promise<{ error?: string; gallery?: string[] }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const templateId = String(formData.get("templateId") ?? "");
  if (!templateId) return { error: "Алдымен шаблонды сақтаңыз" };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Сурет таңдаңыз" };

  const current = await getDemoContent(templateId);
  const existing = current.gallery ?? [];
  const remaining = DEMO_GALLERY_MAX - existing.length;
  if (remaining <= 0) return { error: "Ең көбі 10 фото жүктеуге болады" };

  const newKeys: string[] = [];
  for (const file of files.slice(0, remaining)) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const validated = validateUpload("image", file.type, buffer.byteLength, buffer);
    if (!validated) continue; // skip an invalid file rather than failing the whole batch
    const key = `templates/demo-gallery/${templateId}-${randomUUID()}.${validated.ext}`;
    try {
      await uploadFile({ key, contentType: validated.mime, body: buffer });
      newKeys.push(key);
    } catch (err) {
      console.error("[admin-templates] demo gallery upload failed", err);
    }
  }
  if (newKeys.length === 0) return { error: "Қолдамайтын сурет форматы немесе өлшемі (JPG/PNG/WEBP/GIF, 8МБ дейін)" };

  const gallery = [...existing, ...newKeys];
  await saveDemoContent(templateId, { ...current, gallery });

  revalidatePath("/admin/templates");
  revalidatePath("/templates");
  return { gallery };
}

export async function removeTemplateDemoGalleryImageAction(templateId: string, key: string): Promise<{ error?: string; gallery?: string[] }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const current = await getDemoContent(templateId);
  const gallery = (current.gallery ?? []).filter((k) => k !== key);
  await saveDemoContent(templateId, { ...current, gallery });
  await deleteFile(key).catch(() => {});

  revalidatePath("/admin/templates");
  revalidatePath("/templates");
  return { gallery };
}

/**
 * §22 — "Duplicate template", the highest-value single feature for fast
 * template production. Copies visualConfig, every scalar theme token,
 * catalog metadata, and demoContent's TEXT fields; deliberately does NOT
 * copy previewImage/demoImage/demoContent.mainPhoto/demoContent.gallery
 * (image storage KEYS). Those keys are shared-mutable: a later replace
 * upload on either the source or the copy calls deleteFile() on the OLD
 * key (see uploadTemplateImageAction/uploadTemplateDemoPhotoAction
 * above) — if both rows pointed at the same key, replacing the image on
 * ONE template would silently break the OTHER's still-referenced photo.
 * The duplicate is always created inactive (a draft) regardless of the
 * source's isActive state, per §21/§22's explicit requirement, with a
 * new slug the admin is expected to customize before activating.
 */
export async function duplicateTemplateAction(templateId: string): Promise<{ error?: string; id?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const source = await db.inviteTemplate.findUnique({ where: { id: templateId } });
  if (!source) return { error: "Шаблон табылмады" };

  const demoContent = parseTemplateDemoContent(source.demoContent);
  const { mainPhoto: _mainPhoto, gallery: _gallery, ...demoContentWithoutImages } = demoContent;
  void _mainPhoto;
  void _gallery;

  const baseSlug = `${source.slug}-copy`;
  let slug = `${baseSlug}-${randomUUID().slice(0, 6)}`;
  // Vanishingly unlikely to collide (random suffix), but guard anyway
  // rather than let a unique-constraint error surface as a raw 500.
  for (let attempt = 0; attempt < 3; attempt++) {
    const clash = await db.inviteTemplate.findUnique({ where: { slug }, select: { id: true } });
    if (!clash) break;
    slug = `${baseSlug}-${randomUUID().slice(0, 6)}`;
  }

  try {
    const copy = await db.inviteTemplate.create({
      data: {
        title: `${source.title} (көшірме)`,
        slug,
        nameKk: source.nameKk ? `${source.nameKk} (көшірме)` : null,
        nameRu: source.nameRu ? `${source.nameRu} (копия)` : null,
        category: source.category,
        language: source.language,
        style: source.style,
        description: source.description,
        descriptionRu: source.descriptionRu,
        isActive: false,
        sortOrder: source.sortOrder,
        isPremium: source.isPremium,
        bg: source.bg,
        gradient: source.gradient,
        accent: source.accent,
        textDark: source.textDark,
        textMuted: source.textMuted,
        dark: source.dark,
        emoji: source.emoji,
        demoName1: source.demoName1,
        demoName2: source.demoName2,
        tags: source.tags,
        tagsKk: source.tagsKk,
        tagsRu: source.tagsRu,
        demoContent: demoContentWithoutImages as unknown as Prisma.InputJsonValue,
        visualConfig: source.visualConfig === null ? undefined : (source.visualConfig as Prisma.InputJsonValue),
      },
    });
    revalidatePath("/admin/templates");
    return { id: copy.id };
  } catch (err) {
    console.error("[admin-templates] duplicate failed", err);
    return { error: "Көшіру сәтсіз аяқталды" };
  }
}

export async function reorderTemplateDemoGalleryAction(templateId: string, orderedKeys: string[]): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const current = await getDemoContent(templateId);
  const existingSet = new Set(current.gallery ?? []);
  // Defense in depth: only ever reorder keys that are genuinely already part
  // of this template's gallery — never let a client-supplied list smuggle in
  // an arbitrary storage key.
  const next = orderedKeys.filter((k) => existingSet.has(k));
  if (next.length !== existingSet.size) return { error: "Қате сұрау" };

  await saveDemoContent(templateId, { ...current, gallery: next });
  revalidatePath("/admin/templates");
  return {};
}
