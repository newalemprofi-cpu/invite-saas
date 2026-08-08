"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateAdminConfig } from "@/lib/admin-config";

export async function updateSettingsAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const price = parseInt(String(formData.get("price")), 10);
  const activeDays = parseInt(String(formData.get("activeDays")), 10);
  const whatsapp = (formData.get("whatsapp") as string)?.trim() || "";
  const kaspiLink = (formData.get("kaspiPaymentLink") as string)?.trim() || "";

  if (isNaN(price) || price < 0) return { error: "Жарамды баға енгізіңіз" };
  if (isNaN(activeDays) || activeDays < 1) return { error: "Жарамды күн санын енгізіңіз" };
  if (!whatsapp) return { error: "WhatsApp нөмірін енгізіңіз" };

  // Save to ProductSettings (backward compat with invite creation flow)
  await db.productSettings.upsert({
    where: { productKey: "INVITE" },
    update: { price, activeDays, kaspiPaymentLink: kaspiLink || null },
    create: { productKey: "INVITE", price, activeDays, kaspiPaymentLink: kaspiLink || null },
  });

  // Save to admin_config (authoritative source for public pages)
  await updateAdminConfig({ price, whatsapp, kaspiLink });

  revalidatePath("/admin/settings");
  revalidatePath("/templates");
  revalidatePath("/");
  return {};
}

// Keep old name as alias for any existing imports
export const updateProductSettingsAction = updateSettingsAction;
