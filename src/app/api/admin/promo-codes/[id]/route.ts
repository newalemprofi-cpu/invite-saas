import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseAndValidatePromoInput, isValidationFailure } from "@/lib/promo-codes-validation";

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
  const existing = await db.promoCode.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Табылмады" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Merge onto the existing row so a partial patch (e.g. just `{ enabled }`
  // from the list's toggle switch) still re-validates the full, resulting
  // promo — never persists a partially-invalid record.
  const merged = {
    code: body.code ?? existing.code,
    type: body.type ?? existing.type,
    value: body.value ?? Number(existing.value),
    minAmount: body.minAmount !== undefined ? body.minAmount : existing.minAmount != null ? Number(existing.minAmount) : null,
    maxDiscount: body.maxDiscount !== undefined ? body.maxDiscount : existing.maxDiscount != null ? Number(existing.maxDiscount) : null,
    usageLimit: body.usageLimit !== undefined ? body.usageLimit : existing.usageLimit,
    usagePerUser: body.usagePerUser !== undefined ? body.usagePerUser : existing.usagePerUser,
    startsAt: body.startsAt !== undefined ? body.startsAt : existing.startsAt?.toISOString() ?? null,
    expiresAt: body.expiresAt !== undefined ? body.expiresAt : existing.expiresAt?.toISOString() ?? null,
    enabled: body.enabled !== undefined ? body.enabled : existing.enabled,
  };

  const parsed = parseAndValidatePromoInput(merged);
  if (isValidationFailure(parsed)) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const promo = await db.promoCode.update({ where: { id }, data: parsed });
    return NextResponse.json(promo);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Бұл код бұрын тіркелген" }, { status: 409 });
    }
    console.error("PATCH_PROMO_ERR", err);
    return NextResponse.json({ error: "Сервер қатесі" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return adminOnly();

  const { id } = await ctx.params;
  const existing = await db.promoCode.findUnique({ where: { id }, select: { id: true, usedCount: true } });
  if (!existing) return NextResponse.json({ error: "Табылмады" }, { status: 404 });

  // A promo that has ever been used must never be hard-deleted — historical
  // Payment rows reference it (Payment.promoCodeId is onDelete: Restrict)
  // and their snapshot fields must remain valid/displayable. Disabling
  // achieves the same practical effect (no new usage) without touching
  // payment history.
  if (existing.usedCount > 0) {
    return NextResponse.json(
      { error: "Бұл промокод бұрын қолданылған, сондықтан өшіру мүмкін емес. Оның орнына сөндіріңіз." },
      { status: 409 }
    );
  }

  try {
    await db.promoCode.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("DELETE_PROMO_ERR", err);
    return NextResponse.json({ error: "Сервер қатесі" }, { status: 500 });
  }
}
