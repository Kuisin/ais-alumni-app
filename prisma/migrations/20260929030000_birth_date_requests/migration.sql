-- CreateTable
CREATE TABLE "BirthDateRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "current" DATE,
    "proposed" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "BirthDateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BirthDateRequest_status_createdAt_idx" ON "BirthDateRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BirthDateRequest_userId_idx" ON "BirthDateRequest"("userId");

-- AddForeignKey
ALTER TABLE "BirthDateRequest" ADD CONSTRAINT "BirthDateRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BirthDateRequest" ADD CONSTRAINT "BirthDateRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BirthDateRequest" ENABLE ROW LEVEL SECURITY;
