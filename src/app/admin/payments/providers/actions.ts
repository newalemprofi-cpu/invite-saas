"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { updateKaspiLinkConfig } from "@/lib/payment-providers";

export async function updateKaspiLinkAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const enabled = formData.get("enabled") === "on";
  const mode = formData.get("mode") === "TEST" ? "TEST" : "LIVE";
  const paymentUrl = String(formData.get("paymentUrl") ?? "").trim();
  const merchantPhone = String(formData.get("merchantPhone") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim();
  const adminPhone = String(formData.get("adminPhone") ?? "").trim();
  const instructionsKk = String(formData.get("instructionsKk") ?? "").trim();
  const instructionsRu = String(formData.get("instructionsRu") ?? "").trim();
  const timeoutMinutes = parseInt(String(formData.get("timeoutMinutes") ?? "0"), 10);

  if (enabled && !paymentUrl) {
    return { error: "Kaspi қосулы болса, төлем сілтемесін енгізіңіз" };
  }
  if (isNaN(timeoutMinutes) || timeoutMinutes < 0) {
    return { error: "Жарамды уақыт лимитін енгізіңіз" };
  }

  await updateKaspiLinkConfig({
    enabled,
    mode,
    config: {
      paymentUrl,
      merchantPhone,
      adminEmail,
      adminPhone,
      instructionsKk,
      instructionsRu,
      timeoutMinutes,
    },
  });

  // Every consumer (Manage page, /api/payments/create) reads this via
  // getKaspiLinkConfig() on a force-dynamic route, so nothing else needs
  // revalidating — there's no cached render of admin-config-dependent data.
  revalidatePath("/admin/payments/providers");
  return {};
}
