import type { PaymentProvider } from "@prisma/client";
import { getKaspiLinkConfig } from "@/lib/payment-providers";
import type { Lang } from "@/lib/i18n";

function contactStep(lang: Lang, adminEmail: string, adminPhone: string): string {
  if (lang === "ru") {
    if (adminEmail) return `Отправьте скриншот перевода на ${adminEmail}`;
    if (adminPhone) return `Отправьте скриншот перевода в WhatsApp на ${adminPhone}`;
    return "Отправьте скриншот перевода администратору";
  }
  if (adminEmail) return `Аударым скриншотын ${adminEmail}-ке жіберіңіз`;
  if (adminPhone) return `Аударым скриншотын ${adminPhone} нөміріне WhatsApp арқылы жіберіңіз`;
  return "Аударым скриншотын администраторға жіберіңіз";
}

export const kaspiProvider = {
  id: "MANUAL_KASPI" as PaymentProvider,

  /**
   * Builds the customer-facing payment instructions from the admin-
   * configured Kaspi Link settings (see src/lib/payment-providers.ts) —
   * never from hardcoded frontend strings or a placeholder contact
   * address. `lang` picks which of the admin's two instruction blocks
   * (kk/ru) to use; the phone/reference/contact lines are always
   * generated fresh so they can't go stale relative to what's configured.
   */
  async getInstructions(amount: number, paymentId: string, lang: Lang = "kk") {
    const { enabled, mode, config } = await getKaspiLinkConfig();
    const { paymentUrl, merchantPhone, adminEmail, adminPhone, timeoutMinutes } = config;
    const ref = paymentId.slice(-8).toUpperCase();

    const intro = (lang === "ru" ? config.instructionsRu : config.instructionsKk)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const transferStep =
      lang === "ru"
        ? merchantPhone
          ? `Переведите сумму на номер: ${merchantPhone}`
          : "Переведите сумму указанному администратору"
        : merchantPhone
          ? `Аударым сомасын мына нөмірге жіберіңіз: ${merchantPhone}`
          : "Аударым сомасын admin-ге жіберіңіз";

    const referenceStep =
      lang === "ru"
        ? `В поле «Назначение платежа» укажите: INV-${ref}`
        : `Себеп/хабарлама өрісіне жазыңыз: INV-${ref}`;

    return {
      enabled,
      mode,
      kaspiLink: paymentUrl,
      phone: merchantPhone,
      amount,
      currency: "KZT",
      reference: ref,
      adminEmail,
      adminPhone,
      timeoutMinutes,
      steps: [...intro, transferStep, referenceStep, contactStep(lang, adminEmail, adminPhone)],
    };
  },
};
