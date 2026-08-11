import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAllDbTemplates } from "@/lib/db-templates";

function adminOnly() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return adminOnly();
  const templates = await getAllDbTemplates();
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return adminOnly();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title || !body.slug || !body.category) {
    return NextResponse.json({ error: "title, slug, category — міндетті" }, { status: 400 });
  }

  try {
    const tmpl = await db.inviteTemplate.create({
      data: {
        title: String(body.title),
        slug: String(body.slug).toLowerCase().trim(),
        nameKk: body.nameKk ? String(body.nameKk) : null,
        nameRu: body.nameRu ? String(body.nameRu) : null,
        category: String(body.category),
        language: body.language ? String(body.language) : "both",
        style: body.style ? String(body.style) : "elegant",
        description: body.description ? String(body.description) : null,
        descriptionRu: body.descriptionRu ? String(body.descriptionRu) : null,
        previewImage: body.previewImage ? String(body.previewImage) : null,
        demoImage: body.demoImage ? String(body.demoImage) : null,
        isActive: body.isActive !== false,
        sortOrder: body.sortOrder ? parseInt(String(body.sortOrder), 10) : 0,
        isPremium: body.isPremium === true,
        bg: body.bg ? String(body.bg) : "#FAF8F3",
        gradient: body.gradient ? String(body.gradient) : "from-stone-50 to-amber-50",
        accent: body.accent ? String(body.accent) : "#C4963E",
        textDark: body.textDark ? String(body.textDark) : "#1C1917",
        textMuted: body.textMuted ? String(body.textMuted) : "#78716C",
        dark: body.dark === true,
        emoji: body.emoji ? String(body.emoji) : "✨",
        demoName1: body.demoName1 ? String(body.demoName1) : "Атыңыз",
        demoName2: body.demoName2 ? String(body.demoName2) : null,
        tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
        tagsKk: Array.isArray(body.tagsKk) ? (body.tagsKk as string[]) : [],
        tagsRu: Array.isArray(body.tagsRu) ? (body.tagsRu as string[]) : [],
      },
    });
    return NextResponse.json(tmpl, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Бұл slug бұрын алынған" }, { status: 409 });
    }
    console.error("CREATE_TEMPLATE_ERR", err);
    return NextResponse.json({ error: "Сервер қатесі" }, { status: 500 });
  }
}
