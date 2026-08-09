"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getReceiptVerificationSettings } from "@/lib/receipts/settings";
import { processReceiptExtraction } from "@/lib/receipts/process";

/**
 * "Қайта тексеру" — reprocesses an existing receipt (e.g. one stuck showing
 * a stale NOT_CONFIGURED from before the extractor migration) through the
 * CURRENT extractor/rules, without requiring the customer to re-upload.
 * Reuses `extractionMediaKey` if this row already has one (a converted PDF
 * from an image upload); older rows from before that column existed fall
 * back to `mediaKey` — that only succeeds if the original upload was
 * itself already a PDF, which is a safe, honest limitation to accept
 * rather than re-deriving a PDF from data we no longer have decoded.
 */
export async function reprocessReceiptAction(receiptId: string): Promise<{ error?: string; status?: string }> {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const receipt = await db.paymentReceipt.findUnique({
    where: { id: receiptId },
    select: {
      id: true,
      mediaKey: true,
      extractionMediaKey: true,
      payment: { select: { id: true, amount: true, createdAt: true, inviteId: true, status: true } },
    },
  });
  if (!receipt) return { error: "Табылмады" };
  if (receipt.payment.status !== "PENDING") {
    return { error: "Бұл төлем үшін қайта тексеру мүмкін емес (төлем PENDING емес)" };
  }

  const settings = await getReceiptVerificationSettings();
  const outcome = await processReceiptExtraction({
    receiptRowId: receipt.id,
    extractionMediaKey: receipt.extractionMediaKey ?? receipt.mediaKey,
    payment: {
      id: receipt.payment.id,
      amount: Number(receipt.payment.amount),
      createdAt: receipt.payment.createdAt,
      inviteId: receipt.payment.inviteId,
    },
    settings,
    actorUserId: session.userId,
  });

  revalidatePath("/admin/payments/receipts");
  revalidatePath("/admin/payments/manual");
  return { status: outcome.status };
}
