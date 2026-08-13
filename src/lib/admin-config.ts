import { db } from "@/lib/db";

export interface AdminConfig {
  price: number;
  /** WhatsApp number for "I want to order an invitation" flows (homepage CTA, template-detail order button). */
  orderWhatsapp: string;
  /** WhatsApp number used ONLY for the post-Kaspi-payment receipt-submission button. Separate on purpose — see task this was split for. */
  receiptWhatsapp: string;
  kaspiLink: string;
  companyPhone: string;
  companyEmail: string;
  instagramUrl: string;
  tiktokUrl: string;
  /** Global customer-facing promo-code visibility/availability switch. Admin CRUD at /admin/payments/promocodes is unaffected either way. */
  promoCodesEnabled: boolean;
}

const CONFIG_KEY = "admin_config";

function defaults(): AdminConfig {
  const fallbackPhone =
    process.env.NEXT_PUBLIC_ADMIN_PHONE ??
    process.env.KASPI_PHONE_NUMBER ??
    "+77010000000";
  return {
    price: 4990,
    orderWhatsapp: fallbackPhone,
    receiptWhatsapp: fallbackPhone,
    kaspiLink: process.env.KASPI_PAYMENT_LINK ?? "",
    companyPhone: "",
    companyEmail: "",
    instagramUrl: "",
    tiktokUrl: "",
    promoCodesEnabled: false,
  };
}

/** Shape of rows written before the single `whatsapp` field was split into order/receipt — read-only migration fallback, never written again. */
interface LegacyAdminConfig {
  whatsapp?: string;
}

export async function getAdminConfig(): Promise<AdminConfig> {
  try {
    const row = await db.siteSettings.findUnique({ where: { key: CONFIG_KEY } });
    if (!row) return defaults();
    const v = row.value as Partial<AdminConfig> & LegacyAdminConfig;
    const d = defaults();
    const legacyWhatsapp = v.whatsapp?.trim();
    return {
      price: typeof v.price === "number" ? v.price : d.price,
      orderWhatsapp: v.orderWhatsapp?.trim() || legacyWhatsapp || d.orderWhatsapp,
      receiptWhatsapp: v.receiptWhatsapp?.trim() || legacyWhatsapp || d.receiptWhatsapp,
      kaspiLink: v.kaspiLink?.trim() ?? d.kaspiLink,
      companyPhone: v.companyPhone?.trim() ?? d.companyPhone,
      companyEmail: v.companyEmail?.trim() ?? d.companyEmail,
      instagramUrl: v.instagramUrl?.trim() ?? d.instagramUrl,
      tiktokUrl: v.tiktokUrl?.trim() ?? d.tiktokUrl,
      promoCodesEnabled: typeof v.promoCodesEnabled === "boolean" ? v.promoCodesEnabled : d.promoCodesEnabled,
    };
  } catch {
    return defaults();
  }
}

export async function updateAdminConfig(patch: Partial<AdminConfig>): Promise<AdminConfig> {
  const current = await getAdminConfig();
  const merged: AdminConfig = { ...current, ...patch };
  const jsonValue = merged as unknown as Parameters<typeof db.siteSettings.create>[0]["data"]["value"];
  await db.siteSettings.upsert({
    where: { key: CONFIG_KEY },
    update: { value: jsonValue },
    create: { key: CONFIG_KEY, value: jsonValue },
  });
  return merged;
}
