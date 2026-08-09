"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { updateReceiptVerificationSettings, type MismatchAction } from "@/lib/receipts/settings";

export async function saveReceiptVerificationSettingsAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const enabled = formData.get("enabled") === "on";
  const autoApprove = formData.get("autoApprove") === "on";
  const amountCheck = formData.get("amountCheck") === "on";
  const recipientCheck = formData.get("recipientCheck") === "on";
  const dateTimeCheck = formData.get("dateTimeCheck") === "on";
  const receiptIdUniquenessCheck = formData.get("receiptIdUniquenessCheck") === "on";
  const mismatchAction = formData.get("mismatchAction") === "REJECTED" ? "REJECTED" : ("REVIEW_REQUIRED" as MismatchAction);
  const expectedRecipient = String(formData.get("expectedRecipient") ?? "").trim();

  const allowedAmountDifference = Number(formData.get("allowedAmountDifference"));
  if (!Number.isFinite(allowedAmountDifference) || allowedAmountDifference < 0) {
    return { error: "Рұқсат етілген сома айырмасы теріс болмауы керек" };
  }

  const allowedTimeWindowHours = Number(formData.get("allowedTimeWindowHours"));
  if (!Number.isFinite(allowedTimeWindowHours) || allowedTimeWindowHours < 0) {
    return { error: "Уақыт терезесі теріс болмауы керек" };
  }

  const minConfidenceRaw = String(formData.get("minConfidence") ?? "").trim();
  let minConfidence: number | null = null;
  if (minConfidenceRaw) {
    const parsed = Number(minConfidenceRaw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
      return { error: "Минималды сенімділік 0 мен 1 аралығында болуы керек" };
    }
    minConfidence = parsed;
  }

  if (autoApprove && !enabled) {
    return { error: "Автоматты растауды қосу үшін алдымен чекті тексеруді қосыңыз" };
  }

  await updateReceiptVerificationSettings({
    enabled,
    autoApprove,
    amountCheck,
    allowedAmountDifference,
    recipientCheck,
    expectedRecipient,
    dateTimeCheck,
    allowedTimeWindowHours,
    receiptIdUniquenessCheck,
    minConfidence,
    mismatchAction,
  });

  revalidatePath("/admin/payments/settings");
  revalidatePath("/dashboard/invites");
  return {};
}
