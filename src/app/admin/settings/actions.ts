"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateAdminConfig } from "@/lib/admin-config";

const URL_RE = /^https?:\/\/[^\s]+$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateSettingsAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const price = parseInt(String(formData.get("price")), 10);
  const activeDays = parseInt(String(formData.get("activeDays")), 10);
  const kaspiLink = (formData.get("kaspiPaymentLink") as string)?.trim() || "";
  const orderWhatsapp = (formData.get("orderWhatsapp") as string)?.trim() || "";
  const receiptWhatsapp = (formData.get("receiptWhatsapp") as string)?.trim() || "";
  const companyPhone = (formData.get("companyPhone") as string)?.trim() || "";
  const companyEmail = (formData.get("companyEmail") as string)?.trim() || "";
  const instagramUrl = (formData.get("instagramUrl") as string)?.trim() || "";
  const tiktokUrl = (formData.get("tiktokUrl") as string)?.trim() || "";
  const promoCodesEnabled = formData.get("promoCodesEnabled") === "on";

  if (isNaN(price) || price < 0) return { error: "Жарамды баға енгізіңіз" };
  if (isNaN(activeDays) || activeDays < 1) return { error: "Жарамды күн санын енгізіңіз" };
  if (!orderWhatsapp) return { error: "Тапсырыс WhatsApp нөмірін енгізіңіз" };
  if (!receiptWhatsapp) return { error: "Чек WhatsApp нөмірін енгізіңіз" };
  if (companyEmail && !EMAIL_RE.test(companyEmail)) return { error: "Email форматы қате" };
  if (instagramUrl && !URL_RE.test(instagramUrl)) return { error: "Instagram сілтемесі қате (https:// арқылы басталуы керек)" };
  if (tiktokUrl && !URL_RE.test(tiktokUrl)) return { error: "TikTok сілтемесі қате (https:// арқылы басталуы керек)" };

  // Save to ProductSettings (backward compat with invite creation flow)
  await db.productSettings.upsert({
    where: { productKey: "INVITE" },
    update: { price, activeDays, kaspiPaymentLink: kaspiLink || null },
    create: { productKey: "INVITE", price, activeDays, kaspiPaymentLink: kaspiLink || null },
  });

  // Save to admin_config (authoritative source for public pages)
  await updateAdminConfig({
    price,
    kaspiLink,
    orderWhatsapp,
    receiptWhatsapp,
    companyPhone,
    companyEmail,
    instagramUrl,
    tiktokUrl,
    promoCodesEnabled,
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/payments/promocodes");
  revalidatePath("/templates");
  revalidatePath("/");
  return {};
}

// Keep old name as alias for any existing imports
export const updateProductSettingsAction = updateSettingsAction;
