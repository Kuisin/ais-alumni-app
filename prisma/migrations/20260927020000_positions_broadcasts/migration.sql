-- CreateEnum
CREATE TYPE "PositionKey" AS ENUM ('TEACHER_MANAGER', 'STUDENT_LEADER');

-- CreateEnum
CREATE TYPE "BroadcastScope" AS ENUM ('ALL', 'COHORT');

-- CreateTable
CREATE TABLE "UserPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" "PositionKey" NOT NULL,
    "cohortYear" INTEGER,
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "position" "PositionKey",
    "scope" "BroadcastScope" NOT NULL,
    "targetRoles" "RoleKey"[],
    "cohortYear" INTEGER,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "lineCount" INTEGER NOT NULL,
    "emailCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPosition_userId_position_key" ON "UserPosition"("userId", "position");

-- CreateIndex
CREATE INDEX "Broadcast_senderId_createdAt_idx" ON "Broadcast"("senderId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserPosition" ADD CONSTRAINT "UserPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPosition" ADD CONSTRAINT "UserPosition_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Block Supabase Data API access (see 20260926080000_enable_rls).
ALTER TABLE "UserPosition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Broadcast" ENABLE ROW LEVEL SECURITY;
