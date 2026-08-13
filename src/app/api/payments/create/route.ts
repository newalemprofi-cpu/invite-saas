import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getProductSettings } from "@/lib/product";
import { kaspiProvider } from "@/lib/payment/providers/kaspi";
import { getGenericGatewayInstructions } from "@/lib/payment/providers/generic-gateway";
import { isProviderUsable, PROVIDER_TO_PAYMENT_ENUM, ALL_PROVIDER_IDS, type ProviderId } from "@/lib/payment-providers";
import { validateAndCalculatePromo, reservePromoUsage, getPromoErrorMessage, PromoReservationFailedError } from "@/lib/promo-codes";
import { getAdminConfig } from "@/lib/admin-config";
import { markPaymentPaidAndPublish } from "@/lib/payment/lifecycle";
import { getFeaturePricing } from "@/lib/feature-pricing";
import { calculateInvitePrice } from "@/lib/pricing";
import { readFeatureState } from "@/lib/entitlements";

const schema = z.object({
  inviteId: z.string().uuid(),
  provider: z.enum(ALL_PROVIDER_IDS as [ProviderId, ...ProviderId[]]).default("KASPI_LINK"),
  lang: z.enum(["kk", "ru"]).default("kk"),
  promoCode: z.string().trim().min(1).max(64).optional(),
});

const PAYABLE_STATUSES = new Set(["DRAFT", "PENDING_PAYMENT", "EXPIRED"]);

async function buildInstructions(providerId: ProviderId, amount: number, paymentId: string, lang: "kk" | "ru") {
  if (providerId === "KASPI_LINK") return kaspiProvider.getInstructions(amount, paymentId, lang);
  return getGenericGatewayInstructions(providerId, amount, paymentId, lang);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { inviteId, provider: providerId, lang, promoCode } = parsed.data;

  const invite = await db.invite.findUnique({
    where: { id: inviteId },
    select: { id: true, userId: true, status: true, data: true },
  });
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (session.role !== "ADMIN" && invite.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!PAYABLE_STATUSES.has(invite.status)) {
    return NextResponse.json(
      { error: `Cannot pay for invite with status ${invite.status}` },
      { status: 409 }
    );
  }

  // Return existing PENDING payment instead of creating a duplicate. The
  // promo (if any) was already resolved and reserved when that payment was
  // first created — a later, possibly different, promoCode on this retry
  // request is intentionally ignored, exactly like `provider` already is.
  const existing = await db.payment.findFirst({
    where: { inviteId, status: "PENDING" },
    select: { id: true, amount: true, provider: true, originalAmount: true, discountAmount: true, promoCode: true, rawPayload: true },
  });
  if (existing) {
    const instructions = await buildInstructions(providerId, Number(existing.amount), existing.id, lang);
    const rawPayload = (existing.rawPayload ?? {}) as { features?: unknown };
    return NextResponse.json({
      paymentId: existing.id,
      status: "PENDING",
      amount: Number(existing.amount),
      originalAmount: existing.originalAmount != null ? Number(existing.originalAmount) : null,
      discountAmount: Number(existing.discountAmount),
      promoCode: existing.promoCode,
      currency: "KZT",
      provider: existing.provider,
      // Snapshotted at THIS payment's creation time — same value shown when
      // it was first created, regardless of any admin price change since.
      features: Array.isArray(rawPayload.features) ? rawPayload.features : [],
      instructions,
    });
  }

  // Server-authoritative total (§13/§20/§21): base price from admin config
  // + only the invite's OWN already-saved `selectedFeatures` (read from the
  // Invite row itself, never from this request's body — closes any path
  // where a client could claim to be purchasing a different feature set
  // than what's actually persisted/displayed) + only enabled features at
  // their CURRENT admin-configured price. calculateInvitePrice() silently
  // drops unknown/disabled keys, so a disabled feature can never be priced
  // here even if it's still sitting in an old selectedFeatures array.
  const [product, featurePricing, adminConfig] = await Promise.all([getProductSettings(), getFeaturePricing(), getAdminConfig()]);
  const featureState = readFeatureState(invite.data);
  const priceBreakdown = calculateInvitePrice(featureState.selectedFeatures, featurePricing, product.price);
  const originalPrice = priceBreakdown.total;

  // Server-authoritative promo resolution — the browser only ever supplies
  // the code text; every amount below is computed here, never trusted from
  // the client (see src/lib/promo-codes.ts). Discount applies to the FULL
  // total (base + selected add-ons), not just the base price.
  let discountAmount = 0;
  let finalAmount = originalPrice;
  let resolvedPromoId: string | null = null;
  let resolvedPromoCode: string | null = null;

  if (promoCode) {
    // Global admin toggle (§ promoCodesEnabled): while off, a manually
    // submitted promoCode must not grant a discount even though the
    // customer UI never shows the field — same NOT_FOUND response as an
    // unrecognized code, so no separate "feature disabled" string exists.
    if (!adminConfig.promoCodesEnabled) {
      return NextResponse.json(
        { error: getPromoErrorMessage("NOT_FOUND", lang), code: "NOT_FOUND" },
        { status: 400 }
      );
    }
    const result = await validateAndCalculatePromo({
      code: promoCode,
      amount: originalPrice,
      userId: session.userId,
      lang,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.message, code: result.code }, { status: 400 });
    }
    discountAmount = result.discountAmount;
    finalAmount = result.finalAmount;
    resolvedPromoId = result.promo.id;
    resolvedPromoCode = result.promo.code;
  }

  // A fully-discounted (0 ₸) payment never touches an external provider —
  // it's published directly through the same shared successful-payment
  // lifecycle a manually-approved payment uses (see lib/payment/lifecycle).
  // A provider must still be configured/enabled for every OTHER case.
  if (finalAmount > 0 && !(await isProviderUsable(providerId))) {
    return NextResponse.json({ error: "PROVIDER_UNAVAILABLE" }, { status: 409 });
  }

  const provider = PROVIDER_TO_PAYMENT_ENUM[providerId];

  try {
    const payment = await db.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          amount: finalAmount,
          currency: "KZT",
          provider,
          status: "PENDING",
          userId: session.userId,
          inviteId,
          originalAmount: resolvedPromoId ? originalPrice : null,
          discountAmount,
          promoCode: resolvedPromoCode,
          promoCodeId: resolvedPromoId,
          notes: finalAmount === 0 ? `Промокод ${resolvedPromoCode} арқылы толығымен жабылды` : null,
          rawPayload: {
            productKey: product.productKey,
            activeDays: product.activeDays,
            provider,
            createdBy: session.userId,
            // Payment snapshot (§22): exactly what was purchased at what
            // price, immune to a later admin price change. Read back by
            // markPaymentPaidAndPublish (lib/payment/lifecycle.ts) to grant
            // entitlements, and by the "existing PENDING payment" branch
            // above to redisplay the same line items on a retried request.
            basePrice: priceBreakdown.basePrice,
            features: priceBreakdown.lineItems,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      if (resolvedPromoId) {
        await reservePromoUsage(tx, {
          promoId: resolvedPromoId,
          paymentId: p.id,
          userId: session.userId,
          discountAmount,
        });
      }

      if (finalAmount === 0) {
        await markPaymentPaidAndPublish(tx, {
          paymentId: p.id,
          inviteId,
          inviteStatus: invite.status,
          inviteExpiresAt: null,
          plan: "BASIC",
          isExtension: false,
        });
      } else {
        await tx.invite.update({
          where: { id: inviteId },
          data: { status: "PENDING_PAYMENT" },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "PAYMENT_CREATED",
          entity: "Payment",
          entityId: p.id,
          userId: session.userId,
          meta: { amount: finalAmount, provider, promoCode: resolvedPromoCode, discountAmount },
        },
      });

      return p;
    });

    if (finalAmount === 0) {
      return NextResponse.json(
        {
          paymentId: payment.id,
          status: "PAID",
          published: true,
          amount: 0,
          originalAmount: originalPrice,
          discountAmount,
          promoCode: resolvedPromoCode,
          currency: "KZT",
          provider,
          features: priceBreakdown.lineItems,
        },
        { status: 201 }
      );
    }

    const instructions = await buildInstructions(providerId, finalAmount, payment.id, lang);

    return NextResponse.json(
      {
        paymentId: payment.id,
        features: priceBreakdown.lineItems,
        status: "PENDING",
        amount: finalAmount,
        originalAmount: resolvedPromoId ? originalPrice : null,
        discountAmount,
        promoCode: resolvedPromoCode,
        currency: "KZT",
        provider,
        instructions,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof PromoReservationFailedError) {
      return NextResponse.json(
        { error: getPromoErrorMessage(err.code, lang), code: err.code },
        { status: 409 }
      );
    }
    throw err;
  }
}
