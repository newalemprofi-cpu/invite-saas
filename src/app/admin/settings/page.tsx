import type { Metadata } from "next";
import { getProductSettings } from "@/lib/product";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Баптаулар — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const product = await getProductSettings();

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Баптаулар</h1>
        <p className="text-sm text-zinc-500 mt-1">Өнім параметрлерін басқарыңыз</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-zinc-900 mb-4">Шақыру бағасы</h2>
        <SettingsForm
          price={product.price}
          activeDays={product.activeDays}
          kaspiPaymentLink={product.kaspiPaymentLink ?? ""}
        />
      </div>
    </div>
  );
}
