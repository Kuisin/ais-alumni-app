-- CreateTable
CREATE TABLE "GenderRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "current" TEXT,
    "proposed" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "GenderRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GenderRequest_status_createdAt_idx" ON "GenderRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GenderRequest_userId_idx" ON "GenderRequest"("userId");

-- AddForeignKey
ALTER TABLE "GenderRequest" ADD CONSTRAINT "GenderRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenderRequest" ADD CONSTRAINT "GenderRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "GenderRequest" ENABLE ROW LEVEL SECURITY;
