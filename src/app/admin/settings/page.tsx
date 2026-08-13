import type { Metadata } from "next";
import Link from "next/link";
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

      <Link
        href="/admin/settings/features"
        className="block bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 hover:border-zinc-200 transition-colors"
      >
        <p className="font-semibold text-zinc-900">Қосымша мүмкіндіктер →</p>
        <p className="text-sm text-zinc-500 mt-1">Музыка, галерея, RSVP, карта, тілек, статистика және QR баптаулары</p>
      </Link>

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
          promoCodesEnabled={config.promoCodesEnabled}
        />
      </div>
    </div>
  );
}
