import { db } from "@/lib/db";
import { getAdminConfig } from "@/lib/admin-config";

export async function getProductSettings() {
  const config = await getAdminConfig();
  // Use admin_config as authoritative source; fall back to ProductSettings for activeDays
  try {
    const ps = await db.productSettings.findUnique({ where: { productKey: "INVITE" } });
    return {
      productKey: "INVITE",
      price: config.price,
      currency: "KZT",
      activeDays: ps?.activeDays ?? 30,
      kaspiPaymentLink: config.kaspiLink || ps?.kaspiPaymentLink || null,
      isActive: true,
    };
  } catch {
    return {
      productKey: "INVITE",
      price: config.price,
      currency: "KZT",
      activeDays: 30,
      kaspiPaymentLink: config.kaspiLink || null,
      isActive: true,
    };
  }
}
