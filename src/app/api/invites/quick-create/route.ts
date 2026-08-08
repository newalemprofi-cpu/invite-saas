import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createInviteFromTemplate, TemplateNotFoundError } from "@/lib/data/invites";

const schema = z.object({
  templateSlug: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Жүйеге кіруіңіз қажет" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "templateSlug is required" }, { status: 400 });
  }

  try {
    const invite = await createInviteFromTemplate(session.userId, parsed.data.templateSlug);
    return NextResponse.json(invite, { status: 201 });
  } catch (err) {
    if (err instanceof TemplateNotFoundError) {
      return NextResponse.json({ error: "Шаблон табылмады" }, { status: 404 });
    }
    console.error("QUICK_CREATE_ERROR", err);
    return NextResponse.json({ error: "Шақыру сақталмады" }, { status: 500 });
  }
}
