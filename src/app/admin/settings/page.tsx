import type { Metadata } from "next";
import { getProductSettings } from "@/lib/product";
import { getAdminConfig } from "@/lib/admin-config";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Баптаулар — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [product, config] = await Promise.all([
    getProductSettings(),
    getAdminConfig(),
  ]);

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Баптаулар</h1>
        <p className="text-sm text-zinc-500 mt-1">Жаһандық баға, WhatsApp, байланыс ақпараты</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <SettingsForm
          price={config.price || product.price}
          activeDays={product.activeDays}
          kaspiPaymentLink={config.kaspiLink || product.kaspiPaymentLink || ""}
          orderWhatsapp={config.orderWhatsapp}
          receiptWhatsapp={config.receiptWhatsapp}
          companyPhone={config.companyPhone}
          companyEmail={config.companyEmail}
          instagramUrl={config.instagramUrl}
          tiktokUrl={config.tiktokUrl}
        />
      </div>
    </div>
  );
}
