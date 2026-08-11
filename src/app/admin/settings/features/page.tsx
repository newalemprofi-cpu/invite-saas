import type { Metadata } from "next";
import Link from "next/link";
import { getFeaturePricing } from "@/lib/feature-pricing";
import { FeaturePricingForm } from "./FeaturePricingForm";

export const metadata: Metadata = { title: "Қосымша мүмкіндіктер — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminFeaturePricingPage() {
  const pricing = await getFeaturePricing();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/admin/settings" className="text-sm" style={{ color: "var(--muted)" }}>← Баптаулар</Link>
        <h1 className="text-2xl font-bold text-zinc-900 mt-2">Қосымша мүмкіндіктер</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Әр қосымша мүмкіндіктің бағасын, атауын және сипаттамасын басқарыңыз. Базалық баға{" "}
          <Link href="/admin/settings" className="underline">Баптаулар</Link> бетінде.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <FeaturePricingForm pricing={pricing} />
      </div>
    </div>
  );
}
