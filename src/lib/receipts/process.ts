/**
 * The one place a PaymentReceipt row goes from "has a PDF to extract" to a
 * final verification outcome — shared by the customer upload route and the
 * admin "Қайта тексеру" (reprocess) action, so there is exactly one
 * extraction+verification pipeline, not two copies that can drift apart.
 */
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getAppOrigin } from "@/lib/site-url";
import { extractReceiptFromUrl, getExtractorUrl } from "@/lib/payment/receipt-extractor";
import { generateReceiptAccessToken } from "@/lib/payment/receipt-access-token";
import { evaluateReceipt, parseReceiptDatetime } from "@/lib/receipts/verify";
import type { ReceiptVerificationSettings } from "@/lib/receipts/settings";
import { markPaymentPaidAndPublish } from "@/lib/payment/lifecycle";

export interface ProcessReceiptParams {
  receiptRowId: string;
  extractionMediaKey: string | null;
  payment: { id: string; amount: number; createdAt: Date; inviteId: string };
  settings: ReceiptVerificationSettings;
  /** Attributed to the audit log for the AUTO_VERIFIED entry — the uploader for a fresh upload, the admin for a reprocess. */
  actorUserId: string;
}

export interface ProcessReceiptOutcome {
  status: "AUTO_VERIFIED" | "REVIEW_REQUIRED";
}

async function checkConfigured(settings: ReceiptVerificationSettings): Promise<string | null> {
  const extractorUrl = await getExtractorUrl();
  if (!extractorUrl) return "EXTRACTOR_URL_NOT_CONFIGURED";
  if (settings.verifyIin && settings.allowedIins.length === 0) return "ALLOWED_IIN_NOT_CONFIGURED";
  return null;
}

export async function processReceiptExtraction(params: ProcessReceiptParams): Promise<ProcessReceiptOutcome> {
  const { receiptRowId, extractionMediaKey, payment, settings, actorUserId } = params;

  if (!extractionMediaKey) {
    await db.paymentReceipt.update({
      where: { id: receiptRowId },
      data: { status: "REVIEW_REQUIRED", verificationResult: "EXTRACTION_FAILED", failureReason: "UNSUPPORTED_FORMAT_FOR_EXTRACTION" },
    });
    await db.auditLog.create({
      data: { action: "RECEIPT_EXTRACTION_FAILED", entity: "PaymentReceipt", entityId: receiptRowId, meta: { reason: "UNSUPPORTED_FORMAT_FOR_EXTRACTION" } },
    });
    return { status: "REVIEW_REQUIRED" };
  }

  const configIssue = await checkConfigured(settings);
  if (configIssue) {
    await db.paymentReceipt.update({
      where: { id: receiptRowId },
      data: { status: "REVIEW_REQUIRED", verificationResult: "NOT_CONFIGURED", failureReason: configIssue },
    });
    await db.auditLog.create({
      data: { action: "RECEIPT_EXTRACTION_FAILED", entity: "PaymentReceipt", entityId: receiptRowId, meta: { reason: configIssue } },
    });
    return { status: "REVIEW_REQUIRED" };
  }

  const origin = await getAppOrigin();
  const { token, expires } = generateReceiptAccessToken(receiptRowId);
  const accessUrl = `${origin}/api/payments/receipts/${receiptRowId}/extractor-access?token=${token}&expires=${expires}`;

  const extraction = await extractReceiptFromUrl(accessUrl);

  if (!extraction.ok) {
    const verificationResult =
      extraction.error === "EXTRACTOR_URL_NOT_CONFIGURED" ? "NOT_CONFIGURED" : extraction.error === "EXTRACTION_FAILED" ? "INVALID_RECEIPT" : "EXTRACTION_FAILED";
    await db.paymentReceipt.update({
      where: { id: receiptRowId },
      data: { status: "REVIEW_REQUIRED", verificationResult, failureReason: `${extraction.error}${extraction.detail ? `: ${extraction.detail}` : ""}`.slice(0, 500) },
    });
    await db.auditLog.create({
      data: { action: "RECEIPT_EXTRACTION_FAILED", entity: "PaymentReceipt", entityId: receiptRowId, meta: { reason: extraction.error } },
    });
    return { status: "REVIEW_REQUIRED" };
  }

  await db.auditLog.create({
    data: { action: "RECEIPT_EXTRACTION_SUCCESS", entity: "PaymentReceipt", entityId: receiptRowId, meta: { hasReceiptId: !!extraction.data.receiptId } },
  });

  const existingReceiptRow = extraction.data.receiptId
    ? await db.paymentReceipt.findUnique({ where: { receiptId: extraction.data.receiptId } })
    : null;
  const isDuplicateElsewhere = !!existingReceiptRow && existingReceiptRow.paymentId !== payment.id;
  const receiptIdToStore = extraction.data.receiptId && !existingReceiptRow ? extraction.data.receiptId : null;

  const outcome = evaluateReceipt({
    data: extraction.data,
    payment: { amount: payment.amount, createdAt: payment.createdAt },
    settings,
    isDuplicateElsewhere,
  });

  const isVerified = outcome.result === "VERIFIED";
  const canAutoVerify = isVerified && settings.autoApproveVerifiedReceipts;
  const storedResult = isVerified && !canAutoVerify ? "MANUAL_REVIEW_REQUIRED" : outcome.result;
  const finalStatus = canAutoVerify ? "AUTO_VERIFIED" : "REVIEW_REQUIRED";
  const parsedDatetime = parseReceiptDatetime(extraction.data.datetimeOfReceipt);

  try {
    await db.paymentReceipt.update({
      where: { id: receiptRowId },
      data: {
        receiptId: receiptIdToStore,
        extractedAmount: extraction.data.amount,
        extractedBank: extraction.data.bank,
        extractedIin: extraction.data.iin,
        extractedMethodOfPayment: extraction.data.methodOfPayment,
        extractedDatetimeRaw: extraction.data.datetimeOfReceipt,
        extractedPaidAt: parsedDatetime,
        rawExtractionJson: extraction.data.raw as Prisma.InputJsonValue,
        checksJson: outcome.checks as unknown as Prisma.InputJsonValue,
        status: finalStatus,
        verificationResult: storedResult,
        verifiedAt: canAutoVerify ? new Date() : null,
      },
    });
  } catch (err) {
    console.error("[receipt-process] failed to persist extraction result", err);
    await db.paymentReceipt.update({ where: { id: receiptRowId }, data: { status: "REVIEW_REQUIRED", verificationResult: "DUPLICATE_RECEIPT", failureReason: "PERSIST_RACE" } });
    return { status: "REVIEW_REQUIRED" };
  }

  if (canAutoVerify) {
    try {
      await db.$transaction(async (tx) => {
        // Idempotency guard — re-read status inside the transaction so a
        // retried request or a concurrent manual approval never publishes twice.
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
          data: { action: "RECEIPT_AUTO_VERIFIED", entity: "PaymentReceipt", entityId: receiptRowId, userId: actorUserId, meta: { paymentId: payment.id } },
        });
      });
    } catch (err) {
      console.error("[receipt-process] auto-approve lifecycle failed", err);
    }
    return { status: "AUTO_VERIFIED" };
  }

  await db.auditLog.create({
    data: {
      action: "RECEIPT_REVIEW_REQUIRED",
      entity: "PaymentReceipt",
      entityId: receiptRowId,
      meta: { result: storedResult, checks: outcome.checks } as unknown as Prisma.InputJsonValue,
    },
  });

  return { status: "REVIEW_REQUIRED" };
}
