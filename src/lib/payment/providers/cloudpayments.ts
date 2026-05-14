import type { PaymentProvider } from "@prisma/client";

/**
 * CloudPayments provider stub.
 * TODO: Implement when CloudPayments credentials are available.
 * Docs: https://developers.cloudpayments.ru
 */
export const cloudpaymentsProvider = {
  id: "CLOUDPAYMENTS" as PaymentProvider,

  async createPaymentWidget(params: {
    orderId: string;
    amount: number;
    description: string;
    email?: string;
  }): Promise<{ widgetData: Record<string, unknown> }> {
    const publicId = process.env.CLOUDPAYMENTS_PUBLIC_ID;
    if (!publicId) throw new Error("CLOUDPAYMENTS_PUBLIC_ID is not set");

    void params;
    throw new Error("CloudPayments integration not yet implemented");
  },

  parseWebhookPayload(body: unknown): {
    externalId: string;
    status: "PAID" | "FAILED";
    amount: number;
  } {
    // CloudPayments sends form-encoded data; parse accordingly
    const raw = body as Record<string, unknown>;
    const statusCode = Number(raw.Status ?? raw.status ?? 0);
    return {
      externalId: String(raw.TransactionId ?? raw.InvoiceId ?? ""),
      status: statusCode === 0 ? "PAID" : "FAILED",
      amount: Number(raw.Amount ?? 0),
    };
  },
};
