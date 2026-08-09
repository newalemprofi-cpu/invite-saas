import type { Metadata } from "next";

export const metadata: Metadata = { title: "Промокодтар — Admin" };

// No PromoCode model exists yet. Same rationale as refunds/page.tsx: a
// clearly-labeled placeholder, not a half-built feature.
export default function PromoCodesPage() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-10 text-center">
      <p className="text-lg font-bold text-zinc-800">Промокодтар</p>
      <p className="text-sm text-zinc-400 mt-2 max-w-sm mx-auto">
        Бұл бөлім әлі іске асырылмаған.
      </p>
    </div>
  );
}
