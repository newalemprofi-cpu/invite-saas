-- CreateEnum
CREATE TYPE "ReceiptVerificationResult" AS ENUM ('VERIFIED', 'AMOUNT_MISMATCH', 'PAYMENT_METHOD_MISMATCH', 'IIN_MISMATCH', 'RECEIPT_TOO_OLD', 'DUPLICATE_RECEIPT', 'EXTRACTION_FAILED', 'INVALID_RECEIPT', 'NOT_CONFIGURED', 'MANUAL_REVIEW_REQUIRED');

-- AlterTable
ALTER TABLE "PaymentReceipt" ADD COLUMN     "extractedDatetimeRaw" TEXT,
ADD COLUMN     "extractedIin" TEXT,
ADD COLUMN     "extractedMethodOfPayment" TEXT,
ADD COLUMN     "extractionMediaKey" TEXT,
ADD COLUMN     "verificationResult" "ReceiptVerificationResult";

