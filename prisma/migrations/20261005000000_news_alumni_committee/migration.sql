-- AlterEnum
ALTER TYPE "PositionKey" ADD VALUE 'ALUMNI_COMMITTEE';

-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT;
