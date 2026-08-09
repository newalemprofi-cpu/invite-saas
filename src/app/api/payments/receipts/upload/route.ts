import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isStorageConfigured, uploadFile } from "@/lib/storage";
import { validateReceiptFile } from "@/lib/receipts/file-validation";
import { isConvertibleImage, wrapImageAsPdf } from "@/lib/payment/receipt-pdf";
import { getReceiptVerificationSettings } from "@/lib/receipts/settings";
import { processReceiptExtraction } from "@/lib/receipts/process";

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

  const mediaKey = `receipts/${payment.id}/${randomUUID()}.${validated.ext}`;
  try {
    await uploadFile({ key: mediaKey, contentType: validated.mime, body: buffer });
  } catch (err) {
    console.error("[receipt-upload] storage failed", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // The real extractor only parses PDF (confirmed by live testing against
  // it — see lib/payment/receipt-extractor.ts). A directly-uploaded PDF is
  // used as-is; a JPG/PNG is wrapped into a minimal one-page PDF purely for
  // extraction — the customer/admin preview still shows their original
  // file via `mediaKey`. WEBP has no cheap conversion path here, so it's
  // accepted for upload (kept for admin manual review) but not auto-extracted.
  let extractionMediaKey: string | null = null;
  if (validated.kind === "pdf") {
    extractionMediaKey = mediaKey;
  } else if (isConvertibleImage(validated.mime)) {
    try {
      const pdfBytes = await wrapImageAsPdf(buffer, validated.mime);
      extractionMediaKey = `receipts/${payment.id}/${randomUUID()}.extract.pdf`;
      await uploadFile({ key: extractionMediaKey, contentType: "application/pdf", body: pdfBytes });
    } catch (err) {
      console.error("[receipt-upload] image->PDF conversion failed", err);
      extractionMediaKey = null;
    }
  }

  // Persisted before extraction runs — an extractor timeout/crash below must never lose the upload itself.
  const receiptRow = await db.paymentReceipt.create({
    data: { paymentId: payment.id, uploadedByUserId: session.userId, source: "WEBSITE", mediaKey, extractionMediaKey, status: "PROCESSING" },
  });

  await db.auditLog.create({
    data: { action: "RECEIPT_UPLOADED", entity: "PaymentReceipt", entityId: receiptRow.id, userId: session.userId, meta: { paymentId: payment.id } },
  });

  const outcome = await processReceiptExtraction({
    receiptRowId: receiptRow.id,
    extractionMediaKey,
    payment: { id: payment.id, amount: Number(payment.amount), createdAt: payment.createdAt, inviteId: payment.inviteId },
    settings,
    actorUserId: session.userId,
  });

  return NextResponse.json({
    status: outcome.status,
    message: outcome.status === "AUTO_VERIFIED" ? t.autoVerified : t.reviewRequired,
  });
}
