"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { updateReceiptVerificationSettings } from "@/lib/receipts/settings";
import { testExtractorConnection } from "@/lib/payment/receipt-extractor";

export async function saveReceiptVerificationSettingsAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const enabled = formData.get("enabled") === "on";
  const autoApproveVerifiedReceipts = formData.get("autoApproveVerifiedReceipts") === "on";
  const extractorUrl = String(formData.get("extractorUrl") ?? "").trim();
  const amountCheck = formData.get("amountCheck") === "on";
  const verifyPaymentMethod = formData.get("verifyPaymentMethod") === "on";
  const expectedPaymentMethod = String(formData.get("expectedPaymentMethod") ?? "").trim();
  const verifyIin = formData.get("verifyIin") === "on";
  const allowedIins = String(formData.get("allowedIins") ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const verifyReceiptAge = formData.get("verifyReceiptAge") === "on";
  const verifyDuplicateReceipt = formData.get("verifyDuplicateReceipt") === "on";

  const amountTolerance = Number(formData.get("amountTolerance"));
  if (!Number.isFinite(amountTolerance) || amountTolerance < 0) {
    return { error: "Рұқсат етілген сома айырмасы теріс болмауы керек" };
  }

  const receiptMaxAgeHours = Number(formData.get("receiptMaxAgeHours"));
  if (!Number.isFinite(receiptMaxAgeHours) || receiptMaxAgeHours < 0) {
    return { error: "Максималды жас теріс болмауы керек" };
  }

  if (autoApproveVerifiedReceipts && !enabled) {
    return { error: "Автоматты растауды қосу үшін алдымен чекті тексеруді қосыңыз" };
  }
  if (verifyPaymentMethod && !expectedPaymentMethod) {
    return { error: "Күтілетін төлем әдісін енгізіңіз" };
  }
  if (verifyIin && allowedIins.length === 0) {
    return { error: "Кем дегенде бір рұқсат етілген ЖСН/БСН енгізіңіз" };
  }

  await updateReceiptVerificationSettings({
    enabled,
    autoApproveVerifiedReceipts,
    extractorUrl,
    amountCheck,
    amountTolerance,
    verifyPaymentMethod,
    expectedPaymentMethod,
    verifyIin,
    allowedIins,
    verifyReceiptAge,
    receiptMaxAgeHours,
    verifyDuplicateReceipt,
  });

  revalidatePath("/admin/payments/settings");
  revalidatePath("/dashboard/invites");
  return {};
}

export async function testExtractorConnectionAction(): Promise<{ ok: boolean; message: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: "Рұқсат жоқ" };
  }
  return testExtractorConnection();
}
