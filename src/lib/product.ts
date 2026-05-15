import { db } from "@/lib/db";

const DEFAULTS = {
  productKey: "INVITE",
  price: 4990,
  currency: "KZT",
  activeDays: 30,
  kaspiPaymentLink: null as string | null,
  isActive: true,
};

export async function getProductSettings() {
  return db.productSettings.upsert({
    where: { productKey: "INVITE" },
    update: {},
    create: DEFAULTS,
  });
}
