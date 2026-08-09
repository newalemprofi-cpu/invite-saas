/**
 * Server-authoritative promo code validation, discount calculation, and
 * concurrency-safe usage tracking for the single existing invitation
 * product (see src/lib/product.ts — there is only one priced product
 * today, so this deliberately has no per-plan "scope" concept).
 *
 * The browser only ever sends a promo CODE. Every other number
 * (originalAmount, discountAmount, finalAmount) is computed here from the
 * authoritative price and persisted as an immutable snapshot on Payment —
 * never trust a client-calculated amount.
 *
 * Usage lifecycle (see PromoUsageStatus in schema.prisma):
 *   RESERVED  — created atomically alongside the Payment at checkout. The
 *               atomic guarded UPDATE in reservePromoUsage is what makes
 *               the global usageLimit race-free (see reservePromoUsage).
 *   CONFIRMED — set once that Payment reaches PAID (confirmPromoUsage).
 *   RELEASED  — set if the Payment instead fails/is rejected
 *               (releasePromoUsage), which also decrements usedCount so an
 *               abandoned attempt never permanently consumes a slot.
 */
import type { Prisma, PromoCode } from "@prisma/client";
import { db } from "@/lib/db";
import type { Lang } from "@/lib/i18n";

export type PromoErrorCode =
  | "NOT_FOUND"
  | "EXPIRED"
  | "USAGE_LIMIT_REACHED"
  | "USER_LIMIT_REACHED"
  | "MIN_AMOUNT_NOT_MET";

// Exact strings required by the spec for NOT_FOUND/EXPIRED/USAGE_LIMIT/
// USER_LIMIT. DISABLED and NOT_STARTED intentionally reuse the NOT_FOUND
// copy — from the customer's point of view an inactive/not-yet-live code
// is indistinguishable from one that doesn't exist, and no distinct string
// was specified for those. MIN_AMOUNT_NOT_MET has no specified string
// either; it's given a plain, same-style message since it's a real,
// distinct reason (not "not found").
const MESSAGES: Record<Lang, Record<PromoErrorCode | "APPLIED", string>> = {
  kk: {
    APPLIED: "Промокод қолданылды",
    NOT_FOUND: "Промокод табылмады",
    EXPIRED: "Промокодтың мерзімі аяқталған",
    USAGE_LIMIT_REACHED: "Промокодты қолдану лимиті аяқталған",
    USER_LIMIT_REACHED: "Бұл промокодты қайта пайдалана алмайсыз",
    MIN_AMOUNT_NOT_MET: "Бұл сомаға промокод қолданылмайды",
  },
  ru: {
    APPLIED: "Промокод применён",
    NOT_FOUND: "Промокод не найден",
    EXPIRED: "Срок действия промокода истёк",
    USAGE_LIMIT_REACHED: "Лимит использования промокода исчерпан",
    USER_LIMIT_REACHED: "Вы больше не можете использовать этот промокод",
    MIN_AMOUNT_NOT_MET: "Промокод неприменим к этой сумме",
  },
};

export function getPromoErrorMessage(code: PromoErrorCode, lang: Lang): string {
  return MESSAGES[lang][code];
}

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** `null` or `<= 0` means unlimited, per the spec's "nullable/0=unlimited". */
function isUnlimited(limit: number | null): boolean {
  return limit == null || limit <= 0;
}

export interface PromoCalculation {
  discountAmount: number;
  finalAmount: number;
}

/** Pure calculation, reused by both validation (preview) and checkout. */
export function calculateDiscount(promo: Pick<PromoCode, "type" | "value" | "maxDiscount">, amount: number): PromoCalculation {
  const value = Number(promo.value);
  let discount = promo.type === "PERCENT" ? Math.round((amount * value) / 100) : Math.round(value);

  if (promo.maxDiscount != null) {
    discount = Math.min(discount, Math.round(Number(promo.maxDiscount)));
  }
  // Never let a discount exceed the price — finalAmount must never go negative.
  discount = Math.min(Math.max(discount, 0), amount);

  return { discountAmount: discount, finalAmount: amount - discount };
}

export interface PromoValidationOk {
  ok: true;
  promo: PromoCode;
  discountAmount: number;
  finalAmount: number;
  message: string;
}

export interface PromoValidationError {
  ok: false;
  code: PromoErrorCode;
  message: string;
}

export type PromoValidationResult = PromoValidationOk | PromoValidationError;

/**
 * Full server-side validation + calculation for a promo code attempt.
 * `amount` must already be the authoritative price (see getProductSettings)
 * — never a value received from the client.
 */
export async function validateAndCalculatePromo(params: {
  code: string;
  amount: number;
  userId: string;
  lang: Lang;
}): Promise<PromoValidationResult> {
  const { amount, userId, lang } = params;
  const t = MESSAGES[lang];
  const normalized = normalizePromoCode(params.code);

  const promo = await db.promoCode.findUnique({ where: { code: normalized } });
  if (!promo) return { ok: false, code: "NOT_FOUND", message: t.NOT_FOUND };

  const now = new Date();
  if (!promo.enabled) return { ok: false, code: "NOT_FOUND", message: t.NOT_FOUND };
  if (promo.startsAt && now < promo.startsAt) return { ok: false, code: "NOT_FOUND", message: t.NOT_FOUND };
  if (promo.expiresAt && now > promo.expiresAt) return { ok: false, code: "EXPIRED", message: t.EXPIRED };

  if (!isUnlimited(promo.usageLimit) && promo.usedCount >= (promo.usageLimit as number)) {
    return { ok: false, code: "USAGE_LIMIT_REACHED", message: t.USAGE_LIMIT_REACHED };
  }

  if (!isUnlimited(promo.usagePerUser)) {
    const userUsageCount = await db.promoCodeUsage.count({
      where: { promoCodeId: promo.id, userId, status: { in: ["RESERVED", "CONFIRMED"] } },
    });
    if (userUsageCount >= (promo.usagePerUser as number)) {
      return { ok: false, code: "USER_LIMIT_REACHED", message: t.USER_LIMIT_REACHED };
    }
  }

  if (promo.minAmount != null && amount < Number(promo.minAmount)) {
    return { ok: false, code: "MIN_AMOUNT_NOT_MET", message: t.MIN_AMOUNT_NOT_MET };
  }

  const { discountAmount, finalAmount } = calculateDiscount(promo, amount);

  return { ok: true, promo, discountAmount, finalAmount, message: t.APPLIED };
}

export class PromoReservationFailedError extends Error {
  constructor(public readonly code: PromoErrorCode) {
    super(code);
  }
}

/**
 * Atomically reserves one usage slot and records the attempt. Must be
 * called inside the same transaction that creates the Payment row.
 *
 * Concurrency safety: the single guarded UPDATE below is what prevents the
 * "usageLimit=100, usedCount=99, two concurrent requests" race from ever
 * producing usedCount=101 — the WHERE clause is evaluated atomically by
 * Postgres against the current row, so only one of two concurrent UPDATEs
 * can match once usedCount reaches the limit. This is deliberately NOT a
 * read-count-then-increment pair.
 */
export async function reservePromoUsage(
  tx: Prisma.TransactionClient,
  params: { promoId: string; paymentId: string; userId: string; discountAmount: number }
): Promise<void> {
  const updated = await tx.$executeRaw`
    UPDATE "PromoCode"
    SET "usedCount" = "usedCount" + 1
    WHERE id = ${params.promoId}
      AND enabled = true
      AND ("usageLimit" IS NULL OR "usageLimit" <= 0 OR "usedCount" < "usageLimit")
  `;
  if (updated === 0) {
    throw new PromoReservationFailedError("USAGE_LIMIT_REACHED");
  }

  await tx.promoCodeUsage.create({
    data: {
      promoCodeId: params.promoId,
      userId: params.userId,
      paymentId: params.paymentId,
      status: "RESERVED",
      discountAmount: params.discountAmount,
    },
  });
}

/** Payment reached PAID — the reservation becomes a permanent, counted usage. */
export async function confirmPromoUsage(tx: Prisma.TransactionClient, paymentId: string): Promise<void> {
  await tx.promoCodeUsage.updateMany({
    where: { paymentId, status: "RESERVED" },
    data: { status: "CONFIRMED" },
  });
}

/**
 * Payment failed/rejected/abandoned — releases the reservation and gives
 * the usage slot back. The `updateMany` with `status: "RESERVED"` in its
 * WHERE clause is the atomic guard that makes this safe to call more than
 * once for the same payment (e.g. a duplicate reject request): only the
 * first call actually matches a row and decrements usedCount.
 */
export async function releasePromoUsage(tx: Prisma.TransactionClient, paymentId: string): Promise<void> {
  const usage = await tx.promoCodeUsage.findUnique({ where: { paymentId } });
  if (!usage || usage.status !== "RESERVED") return;

  const result = await tx.promoCodeUsage.updateMany({
    where: { paymentId, status: "RESERVED" },
    data: { status: "RELEASED" },
  });
  if (result.count > 0) {
    await tx.promoCode.update({
      where: { id: usage.promoCodeId },
      data: { usedCount: { decrement: 1 } },
    });
  }
}
