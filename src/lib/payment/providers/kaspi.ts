import type { PaymentProvider } from "@prisma/client";

export const kaspiProvider = {
  id: "MANUAL_KASPI" as PaymentProvider,

  getInstructions(amount: number, paymentId: string) {
    const kaspiLink = process.env.KASPI_PAYMENT_LINK ?? "";
    const phone = process.env.KASPI_PHONE_NUMBER ?? "";
    const ref = paymentId.slice(-8).toUpperCase();

    return {
      kaspiLink,
      phone,
      amount,
      currency: "KZT",
      reference: ref,
      steps: [
        "Kaspi Go немесе kaspi.kz ашыңыз",
        `"Аударым" бөліміне өтіңіз`,
        `Телефон нөміріне жіберіңіз: ${phone || "admin байланысыңыз"}`,
        `Себеп/хабарлама: INV-${ref}`,
        "Аударым скриншотын admin@invitesaas.kz-ке жіберіңіз",
      ],
    };
  },
};
