import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

function adminOnly() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return adminOnly();

  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title);
  if (body.slug !== undefined) data.slug = String(body.slug).toLowerCase().trim();
  if (body.nameKk !== undefined) data.nameKk = body.nameKk ? String(body.nameKk) : null;
  if (body.nameRu !== undefined) data.nameRu = body.nameRu ? String(body.nameRu) : null;
  if (body.category !== undefined) data.category = String(body.category);
  if (body.language !== undefined) data.language = String(body.language);
  if (body.style !== undefined) data.style = String(body.style);
  if (body.description !== undefined) data.description = body.description ? String(body.description) : null;
  if (body.descriptionRu !== undefined) data.descriptionRu = body.descriptionRu ? String(body.descriptionRu) : null;
  if (body.previewImage !== undefined) data.previewImage = body.previewImage ? String(body.previewImage) : null;
  if (body.demoImage !== undefined) data.demoImage = body.demoImage ? String(body.demoImage) : null;
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.sortOrder !== undefined) data.sortOrder = parseInt(String(body.sortOrder), 10);
  if (body.isPremium !== undefined) data.isPremium = Boolean(body.isPremium);
  if (body.bg !== undefined) data.bg = String(body.bg);
  if (body.gradient !== undefined) data.gradient = String(body.gradient);
  if (body.accent !== undefined) data.accent = String(body.accent);
  if (body.textDark !== undefined) data.textDark = String(body.textDark);
  if (body.textMuted !== undefined) data.textMuted = String(body.textMuted);
  if (body.dark !== undefined) data.dark = Boolean(body.dark);
  if (body.emoji !== undefined) data.emoji = String(body.emoji);
  if (body.demoName1 !== undefined) data.demoName1 = String(body.demoName1);
  if (body.demoName2 !== undefined) data.demoName2 = body.demoName2 ? String(body.demoName2) : null;
  if (body.tags !== undefined) data.tags = Array.isArray(body.tags) ? body.tags : [];
  if (body.tagsKk !== undefined) data.tagsKk = Array.isArray(body.tagsKk) ? body.tagsKk : [];
  if (body.tagsRu !== undefined) data.tagsRu = Array.isArray(body.tagsRu) ? body.tagsRu : [];

  try {
    const tmpl = await db.inviteTemplate.update({ where: { id }, data });
    return NextResponse.json(tmpl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Record to update not found")) {
      return NextResponse.json({ error: "Табылмады" }, { status: 404 });
    }
    console.error("PATCH_TEMPLATE_ERR", err);
    return NextResponse.json({ error: "Сервер қатесі" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return adminOnly();

  const { id } = await ctx.params;
  try {
    await db.inviteTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "Табылмады" }, { status: 404 });
    }
    console.error("DELETE_TEMPLATE_ERR", err);
    return NextResponse.json({ error: "Сервер қатесі" }, { status: 500 });
  }
}
