-- CreateEnum
CREATE TYPE "ReceiptSource" AS ENUM ('WEBSITE', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'AUTO_VERIFIED', 'REVIEW_REQUIRED', 'REJECTED', 'FAILED');

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "source" "ReceiptSource" NOT NULL DEFAULT 'WEBSITE',
    "mediaKey" TEXT NOT NULL,
    "receiptId" TEXT,
    "extractedAmount" DECIMAL(10,2),
    "extractedCurrency" TEXT,
    "extractedRecipient" TEXT,
    "extractedSender" TEXT,
    "extractedBank" TEXT,
    "extractedPaidAt" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION,
    "rawExtractionJson" JSONB,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'UPLOADED',
    "failureReason" TEXT,
    "checksJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_receiptId_key" ON "PaymentReceipt"("receiptId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_paymentId_idx" ON "PaymentReceipt"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_status_idx" ON "PaymentReceipt"("status");

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

