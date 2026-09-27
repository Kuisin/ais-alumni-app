-- 学年 (Cohort). Broadcast/UserPosition switch from a graduation year to a
-- Cohort. Dropping cohortYear is safe: both tables exist only on dev (never
-- released to main) and hold no production data.

-- AlterTable
ALTER TABLE "Broadcast" DROP COLUMN "cohortYear",
ADD COLUMN     "cohortId" TEXT;

-- AlterTable
ALTER TABLE "UserPosition" DROP COLUMN "cohortYear",
ADD COLUMN     "cohortId" TEXT;

-- AlterTable
ALTER TABLE "UserRole" ADD COLUMN     "cohortId" TEXT;

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "elementaryStartYear" INTEGER NOT NULL,
    "elementaryEndYear" INTEGER NOT NULL,
    "graduated" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_number_key" ON "Cohort"("number");

-- CreateIndex
CREATE INDEX "UserRole_cohortId_idx" ON "UserRole"("cohortId");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPosition" ADD CONSTRAINT "UserPosition_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Block Supabase Data API access (see 20260926080000_enable_rls).
ALTER TABLE "Cohort" ENABLE ROW LEVEL SECURITY;
