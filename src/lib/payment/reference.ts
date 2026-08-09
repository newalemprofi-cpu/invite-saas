/** Same derivation already used by kaspiProvider.getInstructions() and the admin manual-payments list — the one place this format is now named. */
export function formatPaymentReference(paymentId: string): string {
  return `INV-${paymentId.slice(-8).toUpperCase()}`;
}
