import type { Metadata } from "next";

export const metadata: Metadata = { title: "Қайтарымдар — Admin" };

// No refund model/flow exists yet — Payment has no "REFUNDED" status and no
// refund-tracking fields. Building that is out of scope for this pass
// (KASPI_LINK + manual approval MVP); this page exists so the nav
// structure matches the spec and clearly communicates "not yet available"
// instead of a broken/missing link.
export default function RefundsPage() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-10 text-center">
      <p className="text-lg font-bold text-zinc-800">Қайтарымдар</p>
      <p className="text-sm text-zinc-400 mt-2 max-w-sm mx-auto">
        Бұл бөлім әлі іске асырылмаған. Қазіргі уақытта қайтарымдар қолмен, admin арқылы өңделеді.
      </p>
    </div>
  );
}
