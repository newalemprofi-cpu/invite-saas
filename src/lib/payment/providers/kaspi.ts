import type { PaymentProvider } from "@prisma/client";
import { getKaspiLinkConfig } from "@/lib/payment-providers";
import type { Lang } from "@/lib/i18n";

// Fixed customer-facing steps for the current flow: a real Kaspi payment
// link the "Kaspi арқылы ашу" button opens (which already carries the
// amount/recipient), followed by returning to Shaqyru for receipt
// submission — no more manual reference-typing or screenshot-to-admin
// steps, since receipt upload/WhatsApp now handle confirmation.
const STEPS_KK = [
  "«Kaspi арқылы ашу» батырмасын басыңыз",
  "Kaspi.kz қосымшасынан көрсетілген соманы аударыңыз",
  "Төлемнен кейін Shaqyru-ға қайта оралыңыз",
];
const STEPS_RU = [
  "Нажмите кнопку «Открыть через Kaspi»",
  "Переведите указанную сумму в приложении Kaspi.kz",
  "После оплаты вернитесь в Shaqyru",
];

export const kaspiProvider = {
  id: "MANUAL_KASPI" as PaymentProvider,

  /**
   * Builds the customer-facing payment instructions. `steps` is the fixed
   * 3-step "click button / pay the shown amount / come back" flow (see
   * STEPS_KK/STEPS_RU above); `kaspiLink`/`amount`/`reference` still come
   * fresh from the admin-configured Kaspi Link settings (see
   * src/lib/payment-providers.ts) and the actual Payment, never hardcoded.
   */
  async getInstructions(amount: number, paymentId: string, lang: Lang = "kk") {
    const { enabled, mode, config } = await getKaspiLinkConfig();
    const { paymentUrl, merchantPhone, adminEmail, adminPhone, timeoutMinutes } = config;
    const ref = paymentId.slice(-8).toUpperCase();

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
      steps: lang === "ru" ? STEPS_RU : STEPS_KK,
    };
  },
};
