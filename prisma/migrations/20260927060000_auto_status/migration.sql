-- AlterEnum
ALTER TYPE "Division" ADD VALUE 'KINDERGARTEN';

-- AlterTable
ALTER TABLE "Cohort" DROP COLUMN "graduated";

-- AlterTable
ALTER TABLE "FamilyLink" ADD COLUMN     "childCohortId" TEXT,
ADD COLUMN     "childLeftYear" INTEGER;

-- AddForeignKey
ALTER TABLE "FamilyLink" ADD CONSTRAINT "FamilyLink_childCohortId_fkey" FOREIGN KEY ("childCohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AIS is kindergarten + elementary: old junior/high school values → elementary.
UPDATE "UserRole" SET "lastDivision" = 'ELEMENTARY'
WHERE "lastDivision" IN ('JUNIOR_HIGH', 'HIGH_SCHOOL');
