import { db } from "@/lib/db";

export interface AdminConfig {
  price: number;
  whatsapp: string;
  kaspiLink: string;
}

const CONFIG_KEY = "admin_config";

function defaults(): AdminConfig {
  return {
    price: 4990,
    whatsapp:
      process.env.NEXT_PUBLIC_ADMIN_PHONE ??
      process.env.KASPI_PHONE_NUMBER ??
      "+77010000000",
    kaspiLink: process.env.KASPI_PAYMENT_LINK ?? "",
  };
}

export async function getAdminConfig(): Promise<AdminConfig> {
  try {
    const row = await db.siteSettings.findUnique({ where: { key: CONFIG_KEY } });
    if (!row) return defaults();
    const v = row.value as Partial<AdminConfig>;
    const d = defaults();
    return {
      price: typeof v.price === "number" ? v.price : d.price,
      whatsapp: v.whatsapp?.trim() || d.whatsapp,
      kaspiLink: v.kaspiLink?.trim() ?? d.kaspiLink,
    };
  } catch {
    return defaults();
  }
}

export async function updateAdminConfig(patch: Partial<AdminConfig>): Promise<AdminConfig> {
  const current = await getAdminConfig();
  const merged: AdminConfig = {
    price: patch.price !== undefined ? patch.price : current.price,
    whatsapp: patch.whatsapp !== undefined ? patch.whatsapp : current.whatsapp,
    kaspiLink: patch.kaspiLink !== undefined ? patch.kaspiLink : current.kaspiLink,
  };
  // Prisma Json field accepts plain objects via unknown cast
  const jsonValue = merged as unknown as Parameters<typeof db.siteSettings.create>[0]["data"]["value"];
  await db.siteSettings.upsert({
    where: { key: CONFIG_KEY },
    update: { value: jsonValue },
    create: { key: CONFIG_KEY, value: jsonValue },
  });
  return merged;
}
