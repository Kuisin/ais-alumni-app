-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstNameKana" TEXT,
ADD COLUMN     "lastNameKana" TEXT,
ADD COLUMN     "nameKana" TEXT;

-- CreateTable
CREATE TABLE "NameChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "current" JSONB NOT NULL,
    "proposed" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "NameChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NameChangeRequest_status_createdAt_idx" ON "NameChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NameChangeRequest_userId_idx" ON "NameChangeRequest"("userId");

-- AddForeignKey
ALTER TABLE "NameChangeRequest" ADD CONSTRAINT "NameChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameChangeRequest" ADD CONSTRAINT "NameChangeRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- New table: block Supabase Data API access.
ALTER TABLE "NameChangeRequest" ENABLE ROW LEVEL SECURITY;
