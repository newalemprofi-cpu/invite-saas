import type { PaymentProvider } from "@prisma/client";

/**
 * APIpay provider stub.
 * TODO: Implement when APIpay credentials are available.
 * Docs: https://apipay.kz/docs
 */
export const apipayProvider = {
  id: "APIPAY" as PaymentProvider,

  async createPaymentUrl(params: {
    orderId: string;
    amount: number;
    description: string;
    returnUrl: string;
  }): Promise<{ paymentUrl: string; externalId: string }> {
    // TODO: implement real API call
    const apiKey = process.env.APIPAY_API_KEY;
    if (!apiKey) throw new Error("APIPAY_API_KEY is not set");

    void params; // suppress unused warning until implemented
    throw new Error("APIPay integration not yet implemented");
  },

  parseWebhookPayload(body: unknown): {
    externalId: string;
    status: "PAID" | "FAILED";
    amount: number;
  } {
    // TODO: parse real APIpay webhook shape
    const raw = body as Record<string, unknown>;
    return {
      externalId: String(raw.order_id ?? ""),
      status: raw.status === "success" ? "PAID" : "FAILED",
      amount: Number(raw.amount ?? 0),
    };
  },
};
