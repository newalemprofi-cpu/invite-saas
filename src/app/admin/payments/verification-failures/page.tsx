import type { Metadata } from "next";
import { db } from "@/lib/db";
import { VerificationFailuresList } from "./VerificationFailuresList";
import { RECEIPT_WITH_PAYMENT_INCLUDE, serializeReceiptForAdmin } from "../serialize-receipt";

export const metadata: Metadata = { title: "Автоматты өтпегендер — Admin" };
export const dynamic = "force-dynamic";

/**
 * The ACTIVE failure queue: only receipts that currently need admin
 * attention because automatic verification did not succeed (or couldn't
 * run at all) AND whose Payment is still PENDING. The moment a Payment
 * leaves PENDING (approved, rejected, or separately paid), its receipt
 * naturally drops out of this list — see /admin/payments/receipts for the
 * broader, unfiltered history of every receipt ever submitted.
 *
 * FAILED is included alongside REVIEW_REQUIRED for backward compat — older
 * rows from before the extractor migration may still carry that status;
 * they must remain visible here, not silently disappear from the queue.
 */
export default async function VerificationFailuresPage() {
  const receipts = await db.paymentReceipt.findMany({
    where: { status: { in: ["REVIEW_REQUIRED", "FAILED"] }, payment: { status: "PENDING" } },
    orderBy: { createdAt: "asc" },
    include: RECEIPT_WITH_PAYMENT_INCLUDE,
  });

  const serialized = receipts.map(serializeReceiptForAdmin);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Автоматты өтпегендер</h1>
          <p className="text-sm text-zinc-500 mt-1">Автоматты тексеруден өтпей, қолмен назар аударуды қажет ететін чектер</p>
        </div>
        {serialized.length > 0 && (
          <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1">{serialized.length}</span>
        )}
      </div>
      <VerificationFailuresList receipts={serialized} />
    </div>
  );
}
