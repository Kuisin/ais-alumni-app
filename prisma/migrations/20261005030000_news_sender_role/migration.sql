-- CreateEnum
CREATE TYPE "SenderRole" AS ENUM ('ADMIN', 'TEACHER', 'ALUMNI_COMMITTEE', 'STUDENT_LEADER');

-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "senderRole" "SenderRole";
