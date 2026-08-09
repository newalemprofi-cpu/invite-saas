/**
 * Shared server-side validation for admin promo code create/edit — used by
 * both POST (create) and PATCH (update) so the two can never drift apart.
 * All checks required by the spec: PERCENT in (0,100], FIXED > 0, no
 * negative limits, expiresAt after startsAt.
 */
import { normalizePromoCode } from "@/lib/promo-codes";

export interface PromoInput {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usagePerUser: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  enabled: boolean;
}

export interface PromoValidationFailure {
  error: string;
}

function toNullableNumber(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function toNullableDate(v: unknown): Date | null {
  if (v === undefined || v === null || v === "") return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

export function parseAndValidatePromoInput(body: Record<string, unknown>): PromoInput | PromoValidationFailure {
  const codeRaw = typeof body.code === "string" ? body.code : "";
  const code = normalizePromoCode(codeRaw);
  if (!code) return { error: "Промокод міндетті" };

  const type = body.type === "FIXED" ? "FIXED" : body.type === "PERCENT" ? "PERCENT" : null;
  if (!type) return { error: "Жеңілдік түрін таңдаңыз" };

  const value = Number(body.value);
  if (!Number.isFinite(value) || value <= 0) return { error: "Жеңілдік мәні 0-ден үлкен болуы керек" };
  if (type === "PERCENT" && value > 100) return { error: "Пайыздық жеңілдік 100-ден аспауы керек" };

  const minAmount = toNullableNumber(body.minAmount);
  if (minAmount !== null && (Number.isNaN(minAmount) || minAmount < 0)) {
    return { error: "Минималды сома теріс болмауы керек" };
  }

  const maxDiscount = toNullableNumber(body.maxDiscount);
  if (maxDiscount !== null && (Number.isNaN(maxDiscount) || maxDiscount < 0)) {
    return { error: "Максималды жеңілдік теріс болмауы керек" };
  }

  const usageLimitRaw = toNullableNumber(body.usageLimit);
  if (usageLimitRaw !== null && (Number.isNaN(usageLimitRaw) || usageLimitRaw < 0)) {
    return { error: "Жалпы қолдану лимиті теріс болмауы керек" };
  }
  const usageLimit = usageLimitRaw !== null ? Math.trunc(usageLimitRaw) : null;

  const usagePerUserRaw = toNullableNumber(body.usagePerUser);
  if (usagePerUserRaw !== null && (Number.isNaN(usagePerUserRaw) || usagePerUserRaw < 0)) {
    return { error: "Бір пайдаланушыға арналған лимит теріс болмауы керек" };
  }
  const usagePerUser = usagePerUserRaw !== null ? Math.trunc(usagePerUserRaw) : null;

  const startsAt = toNullableDate(body.startsAt);
  const expiresAt = toNullableDate(body.expiresAt);
  if (startsAt && expiresAt && expiresAt <= startsAt) {
    return { error: "Аяқталу күні басталу күнінен кейін болуы керек" };
  }

  const enabled = body.enabled !== false;

  return { code, type, value, minAmount, maxDiscount, usageLimit, usagePerUser, startsAt, expiresAt, enabled };
}

export function isValidationFailure(v: PromoInput | PromoValidationFailure): v is PromoValidationFailure {
  return "error" in v;
}
