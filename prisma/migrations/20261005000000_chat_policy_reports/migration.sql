-- CreateEnum
CREATE TYPE "DirectChatRule" AS ENUM ('ANYONE', 'SAME_ROLE', 'NOBODY');

-- CreateTable
CREATE TABLE "DirectChatPolicy" (
    "role" "RoleKey" NOT NULL,
    "rule" "DirectChatRule" NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectChatPolicy_pkey" PRIMARY KEY ("role")
);

-- CreateTable
CREATE TABLE "ChatReport" (
    "id" TEXT NOT NULL,
    "groupId" TEXT,
    "reporterId" TEXT,
    "reportedUserId" TEXT,
    "reason" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "messages" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,

    CONSTRAINT "ChatReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatReport_closedAt_createdAt_idx" ON "ChatReport"("closedAt", "createdAt");

-- CreateIndex
CREATE INDEX "ChatReport_reporterId_createdAt_idx" ON "ChatReport"("reporterId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatReport" ADD CONSTRAINT "ChatReport_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChatGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReport" ADD CONSTRAINT "ChatReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReport" ADD CONSTRAINT "ChatReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Block Supabase's public Data API.
ALTER TABLE "DirectChatPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatReport" ENABLE ROW LEVEL SECURITY;
