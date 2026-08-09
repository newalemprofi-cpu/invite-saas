import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isStorageConfigured, uploadFile } from "@/lib/storage";
import { validateReceiptFile } from "@/lib/receipts/file-validation";
import { extractReceipt } from "@/lib/receipts/extractor";
import { evaluateReceipt } from "@/lib/receipts/verify";
import { getReceiptVerificationSettings } from "@/lib/receipts/settings";
import { markPaymentPaidAndPublish } from "@/lib/payment/lifecycle";

export const runtime = "nodejs";

const T = {
  kk: {
    disabled: "Бұл функция қазір қолжетімсіз",
    notPending: "Бұл төлем үшін чек тексеру мүмкін емес",
    forbidden: "Рұқсат жоқ",
    invalidFile: "Файл форматы қолдамайды немесе өлшемі тым үлкен (JPG/PNG/PDF, 10МБ дейін)",
    autoVerified: "Төлем расталды",
    reviewRequired: "Чек қосымша тексеруге жіберілді",
  },
  ru: {
    disabled: "Эта функция сейчас недоступна",
    notPending: "Проверка чека для этого платежа невозможна",
    forbidden: "Доступ запрещён",
    invalidFile: "Неподдерживаемый формат или слишком большой файл (JPG/PNG/PDF, до 10МБ)",
    autoVerified: "Платёж подтверждён",
    reviewRequired: "Чек отправлен на дополнительную проверку",
  },
} as const;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }

  const paymentId = form.get("paymentId");
  const lang = form.get("lang") === "ru" ? "ru" : "kk";
  const t = T[lang];
  const file = form.get("file");

  if (typeof paymentId !== "string" || !paymentId) {
    return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const settings = await getReceiptVerificationSettings();
  if (!settings.enabled) {
    return NextResponse.json({ error: t.disabled }, { status: 503 });
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, userId: true, status: true, amount: true, inviteId: true, createdAt: true },
  });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (payment.userId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: t.forbidden }, { status: 403 });
  }
  if (payment.status !== "PENDING") {
    if (payment.status === "PAID") {
      return NextResponse.json({ status: "ALREADY_PAID", message: t.autoVerified });
    }
    return NextResponse.json({ error: t.notPending }, { status: 409 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validated = validateReceiptFile(buffer.byteLength, buffer);
  if (!validated) {
    return NextResponse.json({ error: t.invalidFile }, { status: 422 });
  }

  const key = `receipts/${payment.id}/${randomUUID()}.${validated.ext}`;
  try {
    await uploadFile({ key, contentType: validated.mime, body: buffer });
  } catch (err) {
    console.error("[receipt-upload] storage failed", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Persisted before extraction runs — an extractor timeout/crash below must never lose the upload itself (see task's failure-handling requirement).
  const receiptRow = await db.paymentReceipt.create({
    data: { paymentId: payment.id, uploadedByUserId: session.userId, source: "WEBSITE", mediaKey: key, status: "PROCESSING" },
  });

  await db.auditLog.create({
    data: { action: "RECEIPT_UPLOADED", entity: "PaymentReceipt", entityId: receiptRow.id, userId: session.userId, meta: { paymentId: payment.id } },
  });

  const extraction = await extractReceipt(buffer, validated);

  if (!extraction.ok) {
    // FAILED = a technical extraction problem (service down/timeout/unparseable),
    // distinct from REVIEW_REQUIRED (extraction succeeded, rules didn't pass) —
    // both land in the same admin review queue, but this distinction helps
    // admins triage. Never the customer's fault and never loses their
    // payment — it stays PENDING and admin can still manually approve.
    await db.paymentReceipt.update({ where: { id: receiptRow.id }, data: { status: "FAILED", failureReason: extraction.error } });
    await db.auditLog.create({
      data: { action: "RECEIPT_EXTRACTION_FAILED", entity: "PaymentReceipt", entityId: receiptRow.id, meta: { reason: extraction.error } },
    });
    return NextResponse.json({ status: "REVIEW_REQUIRED", message: t.reviewRequired });
  }

  await db.auditLog.create({
    data: { action: "RECEIPT_EXTRACTION_SUCCESS", entity: "PaymentReceipt", entityId: receiptRow.id, meta: { hasReceiptId: !!extraction.receipt.receiptId } },
  });

  // A receiptId's DB-level uniqueness doesn't care which payment "owns" it,
  // so any existing row (this payment's own earlier attempt, or a genuinely
  // different payment) blocks re-storing it here. Only the cross-payment
  // case counts as a fraud signal for the rules engine.
  const existingReceiptRow = extraction.receipt.receiptId
    ? await db.paymentReceipt.findUnique({ where: { receiptId: extraction.receipt.receiptId } })
    : null;
  const isDuplicateElsewhere = !!existingReceiptRow && existingReceiptRow.paymentId !== payment.id;
  const receiptIdToStore = extraction.receipt.receiptId && !existingReceiptRow ? extraction.receipt.receiptId : null;

  const outcome = evaluateReceipt({
    receipt: extraction.receipt,
    payment: { amount: Number(payment.amount), createdAt: payment.createdAt },
    settings,
    isDuplicateElsewhere,
  });

  const canAutoVerify = settings.autoApprove && outcome.wouldAutoVerify;
  const finalStatus = canAutoVerify ? "AUTO_VERIFIED" : settings.mismatchAction;

  try {
    await db.paymentReceipt.update({
      where: { id: receiptRow.id },
      data: {
        receiptId: receiptIdToStore,
        extractedAmount: extraction.receipt.amount,
        extractedCurrency: extraction.receipt.currency,
        extractedRecipient: extraction.receipt.recipient,
        extractedSender: extraction.receipt.sender,
        extractedBank: extraction.receipt.bank,
        extractedPaidAt: extraction.receipt.paidAt,
        confidence: extraction.receipt.confidence,
        rawExtractionJson: extraction.receipt.raw as Prisma.InputJsonValue,
        checksJson: outcome.checks as unknown as Prisma.InputJsonValue,
        status: finalStatus,
        verifiedAt: canAutoVerify ? new Date() : null,
      },
    });
  } catch (err) {
    console.error("[receipt-upload] failed to persist extraction result", err);
    await db.paymentReceipt.update({ where: { id: receiptRow.id }, data: { status: "REVIEW_REQUIRED", failureReason: "PERSIST_RACE" } });
    return NextResponse.json({ status: "REVIEW_REQUIRED", message: t.reviewRequired });
  }

  if (canAutoVerify) {
    try {
      await db.$transaction(async (tx) => {
        // Re-read status inside the transaction: idempotency guard against a
        // retried upload request or a concurrent manual approval racing this
        // one — never publish the same invite/payment twice.
        const fresh = await tx.payment.findUnique({
          where: { id: payment.id },
          select: { status: true, inviteId: true, invite: { select: { status: true, expiresAt: true } } },
        });
        if (!fresh || fresh.status !== "PENDING") return;
        await markPaymentPaidAndPublish(tx, {
          paymentId: payment.id,
          inviteId: fresh.inviteId,
          inviteStatus: fresh.invite.status,
          inviteExpiresAt: fresh.invite.expiresAt,
          plan: "BASIC",
          isExtension: false,
          paymentUpdateExtra: { notes: "Чек арқылы автоматты расталды" },
        });
        await tx.auditLog.create({
          data: { action: "RECEIPT_AUTO_VERIFIED", entity: "PaymentReceipt", entityId: receiptRow.id, userId: session.userId, meta: { paymentId: payment.id } },
        });
      });
    } catch (err) {
      console.error("[receipt-upload] auto-approve lifecycle failed", err);
    }
    return NextResponse.json({ status: "AUTO_VERIFIED", message: t.autoVerified });
  }

  await db.auditLog.create({
    data: {
      action: finalStatus === "REJECTED" ? "RECEIPT_REJECTED" : "RECEIPT_REVIEW_REQUIRED",
      entity: "PaymentReceipt",
      entityId: receiptRow.id,
      meta: { checks: outcome.checks } as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ status: finalStatus, message: t.reviewRequired });
}
