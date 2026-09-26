-- CreateEnum
CREATE TYPE "TeacherStatus" AS ENUM ('CURRENT', 'FORMER');

-- AlterTable
ALTER TABLE "UserRole" ADD COLUMN     "teacherStatus" "TeacherStatus";


-- Backfill: teachers without an end year are still at AIS.
UPDATE "UserRole"
SET "teacherStatus" = CASE WHEN "yearsTo" IS NULL THEN 'CURRENT'::"TeacherStatus" ELSE 'FORMER'::"TeacherStatus" END
WHERE "role" = 'TEACHER';
