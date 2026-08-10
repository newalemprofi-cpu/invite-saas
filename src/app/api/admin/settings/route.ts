import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAdminConfig, updateAdminConfig } from "@/lib/admin-config";

function adminOnly() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return adminOnly();
  const config = await getAdminConfig();
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return adminOnly();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Parameters<typeof updateAdminConfig>[0] = {};
  if (body.price !== undefined) {
    const p = parseInt(String(body.price), 10);
    if (isNaN(p) || p < 0) return NextResponse.json({ error: "Жарамды баға" }, { status: 400 });
    patch.price = p;
  }
  if (body.orderWhatsapp !== undefined) patch.orderWhatsapp = String(body.orderWhatsapp).trim();
  if (body.receiptWhatsapp !== undefined) patch.receiptWhatsapp = String(body.receiptWhatsapp).trim();
  if (body.kaspiLink !== undefined) patch.kaspiLink = String(body.kaspiLink).trim();
  if (body.companyPhone !== undefined) patch.companyPhone = String(body.companyPhone).trim();
  if (body.companyEmail !== undefined) patch.companyEmail = String(body.companyEmail).trim();
  if (body.instagramUrl !== undefined) patch.instagramUrl = String(body.instagramUrl).trim();
  if (body.tiktokUrl !== undefined) patch.tiktokUrl = String(body.tiktokUrl).trim();

  const updated = await updateAdminConfig(patch);
  return NextResponse.json(updated);
}
