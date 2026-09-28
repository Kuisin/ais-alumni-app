-- CreateEnum
CREATE TYPE "InviteKind" AS ENUM ('INDIVIDUAL', 'GRADE');

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "kind" "InviteKind" NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN     "maxUses" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "InviteUse" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteUse_userId_key" ON "InviteUse"("userId");

-- CreateIndex
CREATE INDEX "InviteUse_inviteId_idx" ON "InviteUse"("inviteId");

-- AddForeignKey
ALTER TABLE "InviteUse" ADD CONSTRAINT "InviteUse_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteUse" ADD CONSTRAINT "InviteUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "InviteUse" ENABLE ROW LEVEL SECURITY;
