import { getProviderEntry, PROVIDER_LABELS, type ProviderId, type ApiGatewayConfig } from "@/lib/payment-providers";
import type { Lang } from "@/lib/i18n";

/**
 * Shared instructions builder for the 5 API-gateway-style providers
 * (ApiPay, CloudPayments, Freedom Pay, Halyk ePay, Wooppay). None of them
 * has a real "redirect the customer into a live checkout" implementation
 * today (see src/lib/payment-providers.ts's module doc comment) — this
 * builds the same manual-payment-intent instructions shape Kaspi already
 * uses (amount/reference/steps), rendered by the same
 * <KaspiInstructions> component, just sourced from that provider's own
 * admin-authored instructions text instead of a live gateway response.
 */
export async function getGenericGatewayInstructions(
  id: Exclude<ProviderId, "KASPI_LINK">,
  amount: number,
  paymentId: string,
  lang: Lang = "kk"
) {
  const { enabled, mode, config } = await getProviderEntry(id);
  const c = config as ApiGatewayConfig;
  const ref = paymentId.slice(-8).toUpperCase();
  const label = PROVIDER_LABELS[id];

  const intro = (lang === "ru" ? c.instructionsRu : c.instructionsKk)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const referenceStep =
    lang === "ru"
      ? `Укажите номер заказа при оплате через ${label}: INV-${ref}`
      : `${label} арқылы төлеу кезінде тапсырыс кодын көрсетіңіз: INV-${ref}`;

  const contactStep =
    lang === "ru"
      ? "После оплаты администратор подтвердит платёж вручную"
      : "Төлемнен кейін admin оны қолмен растайды";

  return {
    enabled,
    mode,
    amount,
    currency: "KZT" as const,
    reference: ref,
    steps: [...intro, referenceStep, contactStep],
  };
}
