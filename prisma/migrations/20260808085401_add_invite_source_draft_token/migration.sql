-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "sourceDraftToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invite_sourceDraftToken_key" ON "Invite"("sourceDraftToken");
