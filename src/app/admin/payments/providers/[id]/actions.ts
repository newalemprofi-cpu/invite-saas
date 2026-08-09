"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  updateProviderConfig,
  getProviderEntry,
  getMissingRequiredFields,
  resolveSecretField,
  ProviderNotConfiguredError,
  type ProviderId,
  type KaspiLinkConfig,
  type ApiGatewayConfig,
} from "@/lib/payment-providers";

const ENABLE_BLOCKED_ERROR = "Провайдерді қосу үшін міндетті баптауларды толтырыңыз.";

export async function saveKaspiProviderAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const enabled = formData.get("enabled") === "on";
  const mode = formData.get("mode") === "TEST" ? "TEST" : "LIVE";
  const timeoutMinutes = parseInt(String(formData.get("timeoutMinutes") ?? "0"), 10);
  if (isNaN(timeoutMinutes) || timeoutMinutes < 0) {
    return { error: "Жарамды уақыт лимитін енгізіңіз" };
  }

  const config: KaspiLinkConfig = {
    paymentUrl: String(formData.get("paymentUrl") ?? "").trim(),
    merchantPhone: String(formData.get("merchantPhone") ?? "").trim(),
    adminEmail: String(formData.get("adminEmail") ?? "").trim(),
    adminPhone: String(formData.get("adminPhone") ?? "").trim(),
    instructionsKk: String(formData.get("instructionsKk") ?? "").trim(),
    instructionsRu: String(formData.get("instructionsRu") ?? "").trim(),
    timeoutMinutes,
  };

  try {
    await updateProviderConfig("KASPI_LINK", { enabled, mode, config });
  } catch (err) {
    if (err instanceof ProviderNotConfiguredError) return { error: ENABLE_BLOCKED_ERROR };
    console.error("[admin-providers] save failed", err);
    return { error: "Сақтау сәтсіз аяқталды" };
  }

  revalidatePath("/admin/payments/providers");
  revalidatePath("/admin/payments/providers/KASPI_LINK");
  return {};
}

export async function saveApiGatewayProviderAction(
  id: Exclude<ProviderId, "KASPI_LINK">,
  formData: FormData
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Рұқсат жоқ" };
  }

  const current = await getProviderEntry(id);
  const enabled = formData.get("enabled") === "on";
  const mode = formData.get("mode") === "LIVE" ? "LIVE" : "TEST";

  const submittedSecretKey = String(formData.get("secretKey") ?? "");
  const submittedWebhookSecret = String(formData.get("webhookSecret") ?? "");

  const config: ApiGatewayConfig = {
    merchantId: String(formData.get("merchantId") ?? "").trim(),
    // A masked placeholder means the admin didn't touch the field — keep
    // whatever secret is already stored instead of overwriting it with the
    // literal mask string.
    secretKey: resolveSecretField(submittedSecretKey.trim(), current.config.secretKey),
    webhookSecret: resolveSecretField(submittedWebhookSecret.trim(), current.config.webhookSecret),
    instructionsKk: String(formData.get("instructionsKk") ?? "").trim(),
    instructionsRu: String(formData.get("instructionsRu") ?? "").trim(),
  };

  try {
    await updateProviderConfig(id, { enabled, mode, config });
  } catch (err) {
    if (err instanceof ProviderNotConfiguredError) return { error: ENABLE_BLOCKED_ERROR };
    console.error("[admin-providers] save failed", err);
    return { error: "Сақтау сәтсіз аяқталды" };
  }

  revalidatePath("/admin/payments/providers");
  revalidatePath(`/admin/payments/providers/${id}`);
  return {};
}

const FIELD_LABELS_KK: Record<string, string> = {
  paymentUrl: "Kaspi төлем сілтемесі",
  merchantId: "Merchant ID",
  secretKey: "Secret Key",
  webhookSecret: "Webhook Secret",
};

/**
 * "Баптауды тексеру" — a completeness/format check, not a live call to any
 * external gateway. No sandbox credentials exist for any of these
 * providers in this project, so pretending to ping a real endpoint would
 * fabricate a result; this only confirms the required fields the enable
 * gate itself checks are present and well-formed.
 */
export async function testProviderConfigAction(id: ProviderId): Promise<{ ok: boolean; message: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: "Рұқсат жоқ" };
  }

  const entry = await getProviderEntry(id);
  const missing = getMissingRequiredFields(id, entry.config);
  if (missing.length > 0) {
    const names = missing.map((f) => FIELD_LABELS_KK[f] ?? f).join(", ");
    return { ok: false, message: `Толтырылмаған өрістер: ${names}` };
  }

  if (id === "KASPI_LINK") {
    const url = (entry.config as KaspiLinkConfig).paymentUrl;
    try {
      new URL(url);
    } catch {
      return { ok: false, message: "Kaspi төлем сілтемесі жарамды URL емес" };
    }
  }

  return { ok: true, message: "Баптау дұрыс толтырылған" };
}
