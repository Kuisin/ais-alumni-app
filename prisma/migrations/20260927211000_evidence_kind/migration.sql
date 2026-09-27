-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('DIPLOMA', 'OTHER');

-- AlterTable
ALTER TABLE "VerificationEvidence" ADD COLUMN     "kind" "EvidenceKind" NOT NULL DEFAULT 'OTHER';

