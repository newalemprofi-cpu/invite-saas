"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { updateFeaturePricing, type FeaturePricingConfig } from "@/lib/feature-pricing";
import { FEATURE_KEYS } from "@/lib/features";

export async function updateFeaturePricingAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const patch: Partial<FeaturePricingConfig> = {};

  for (const key of FEATURE_KEYS) {
    const price = parseInt(String(formData.get(`${key}_price`)), 10);
    if (isNaN(price) || price < 0) return { error: `${key}: жарамды баға енгізіңіз` };
    const titleKk = (formData.get(`${key}_titleKk`) as string)?.trim() || "";
    const titleRu = (formData.get(`${key}_titleRu`) as string)?.trim() || "";
    const descKk = (formData.get(`${key}_descKk`) as string)?.trim() || "";
    const descRu = (formData.get(`${key}_descRu`) as string)?.trim() || "";
    if (!titleKk || !titleRu) return { error: `${key}: KK/RU атауын енгізіңіз` };
    patch[key] = {
      enabled: formData.get(`${key}_enabled`) === "on",
      price,
      titleKk,
      titleRu,
      descKk,
      descRu,
    };
  }

  const qrTitleKk = (formData.get("qr_titleKk") as string)?.trim() || "";
  const qrTitleRu = (formData.get("qr_titleRu") as string)?.trim() || "";
  const qrDescKk = (formData.get("qr_descKk") as string)?.trim() || "";
  const qrDescRu = (formData.get("qr_descRu") as string)?.trim() || "";
  if (!qrTitleKk || !qrTitleRu) return { error: "QR: KK/RU атауын енгізіңіз" };
  patch.qr = {
    enabled: formData.get("qr_enabled") === "on",
    titleKk: qrTitleKk,
    titleRu: qrTitleRu,
    descKk: qrDescKk,
    descRu: qrDescRu,
  };

  await updateFeaturePricing(patch);

  revalidatePath("/admin/settings/features");
  return {};
}
