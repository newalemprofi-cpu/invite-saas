-- AlterTable
ALTER TABLE "InviteTemplate" ALTER COLUMN "emoji" SET DEFAULT '✨',
ALTER COLUMN "demoName1" SET DEFAULT 'Атыңыз';

-- CreateTable
CREATE TABLE "Wish" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviteId" TEXT NOT NULL,

    CONSTRAINT "Wish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Wish_inviteId_idx" ON "Wish"("inviteId");

-- AddForeignKey
ALTER TABLE "Wish" ADD CONSTRAINT "Wish_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
