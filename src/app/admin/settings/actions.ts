"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function updateProductSettingsAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const priceRaw = formData.get("price");
  const daysRaw = formData.get("activeDays");
  const kaspiLink = (formData.get("kaspiPaymentLink") as string)?.trim() || null;

  const price = parseInt(String(priceRaw), 10);
  const activeDays = parseInt(String(daysRaw), 10);

  if (isNaN(price) || price < 0) return { error: "Жарамды баға енгізіңіз" };
  if (isNaN(activeDays) || activeDays < 1) return { error: "Жарамды күн санын енгізіңіз" };

  await db.productSettings.upsert({
    where: { productKey: "INVITE" },
    update: { price, activeDays, kaspiPaymentLink: kaspiLink },
    create: { productKey: "INVITE", price, activeDays, kaspiPaymentLink: kaspiLink },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return {};
}
