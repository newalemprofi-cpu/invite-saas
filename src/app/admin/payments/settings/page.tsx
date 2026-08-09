import type { Metadata } from "next";
import { getReceiptVerificationSettings } from "@/lib/receipts/settings";
import { ReceiptSettingsForm } from "./ReceiptSettingsForm";

export const metadata: Metadata = { title: "Баптаулар — Admin" };
export const dynamic = "force-dynamic";

export default async function PaymentSettingsPage() {
  const settings = await getReceiptVerificationSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Баптаулар</h1>
        <p className="text-sm text-zinc-500 mt-1">Чекті автоматты тексеру ережелері</p>
      </div>
      <ReceiptSettingsForm settings={settings} />
    </div>
  );
}
