import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getProductSettings } from "@/lib/product";
import { kaspiProvider } from "@/lib/payment/providers/kaspi";
import { getGenericGatewayInstructions } from "@/lib/payment/providers/generic-gateway";
import { isProviderUsable, PROVIDER_TO_PAYMENT_ENUM, ALL_PROVIDER_IDS, type ProviderId } from "@/lib/payment-providers";
import { validateAndCalculatePromo, reservePromoUsage, getPromoErrorMessage, PromoReservationFailedError } from "@/lib/promo-codes";
import { markPaymentPaidAndPublish } from "@/lib/payment/lifecycle";

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
    select: { id: true, userId: true, status: true },
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
    select: { id: true, amount: true, provider: true, originalAmount: true, discountAmount: true, promoCode: true },
  });
  if (existing) {
    const instructions = await buildInstructions(providerId, Number(existing.amount), existing.id, lang);
    return NextResponse.json({
      paymentId: existing.id,
      status: "PENDING",
      amount: Number(existing.amount),
      originalAmount: existing.originalAmount != null ? Number(existing.originalAmount) : null,
      discountAmount: Number(existing.discountAmount),
      promoCode: existing.promoCode,
      currency: "KZT",
      provider: existing.provider,
      instructions,
    });
  }

  const product = await getProductSettings();
  const originalPrice = product.price;

  // Server-authoritative promo resolution — the browser only ever supplies
  // the code text; every amount below is computed here, never trusted from
  // the client (see src/lib/promo-codes.ts).
  let discountAmount = 0;
  let finalAmount = originalPrice;
  let resolvedPromoId: string | null = null;
  let resolvedPromoCode: string | null = null;

  if (promoCode) {
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
          },
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
        },
        { status: 201 }
      );
    }

    const instructions = await buildInstructions(providerId, finalAmount, payment.id, lang);

    return NextResponse.json(
      {
        paymentId: payment.id,
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
