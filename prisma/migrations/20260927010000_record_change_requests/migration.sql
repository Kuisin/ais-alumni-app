-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "RecordChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoleKey" NOT NULL,
    "current" JSONB NOT NULL,
    "proposed" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "RecordChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecordChangeRequest_status_createdAt_idx" ON "RecordChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RecordChangeRequest_userId_idx" ON "RecordChangeRequest"("userId");

-- AddForeignKey
ALTER TABLE "RecordChangeRequest" ADD CONSTRAINT "RecordChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordChangeRequest" ADD CONSTRAINT "RecordChangeRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Block Supabase Data API access (see 20260926080000_enable_rls).
ALTER TABLE "RecordChangeRequest" ENABLE ROW LEVEL SECURITY;
