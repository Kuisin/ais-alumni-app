-- CreateEnum
CREATE TYPE "NewsPollKind" AS ENUM ('POLL', 'SCHEDULE');

-- CreateEnum
CREATE TYPE "NewsVote" AS ENUM ('YES', 'MAYBE', 'NO');

-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "allowComments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "remindedAt" TIMESTAMP(3),
ADD COLUMN     "requireConfirm" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "NewsConfirm" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsConfirm_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateTable
CREATE TABLE "NewsPoll" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "kind" "NewsPollKind" NOT NULL,
    "question" TEXT NOT NULL,
    "multiple" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NewsPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsPollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "position" INTEGER NOT NULL,

    CONSTRAINT "NewsPollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsPollVote" (
    "optionId" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answer" "NewsVote" NOT NULL DEFAULT 'YES',
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsPollVote_pkey" PRIMARY KEY ("optionId","userId")
);

-- CreateTable
CREATE TABLE "NewsComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hiddenAt" TIMESTAMP(3),
    "hiddenById" TEXT,

    CONSTRAINT "NewsComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsReaction" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsReaction_pkey" PRIMARY KEY ("postId","userId","emoji")
);

-- CreateTable
CREATE TABLE "NewsAttachment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsConfirm_userId_idx" ON "NewsConfirm"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsPoll_postId_kind_key" ON "NewsPoll"("postId", "kind");

-- CreateIndex
CREATE INDEX "NewsPollOption_pollId_idx" ON "NewsPollOption"("pollId");

-- CreateIndex
CREATE INDEX "NewsPollVote_pollId_userId_idx" ON "NewsPollVote"("pollId", "userId");

-- CreateIndex
CREATE INDEX "NewsComment_postId_createdAt_idx" ON "NewsComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "NewsAttachment_postId_idx" ON "NewsAttachment"("postId");

-- AddForeignKey
ALTER TABLE "NewsConfirm" ADD CONSTRAINT "NewsConfirm_postId_fkey" FOREIGN KEY ("postId") REFERENCES "NewsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsConfirm" ADD CONSTRAINT "NewsConfirm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPoll" ADD CONSTRAINT "NewsPoll_postId_fkey" FOREIGN KEY ("postId") REFERENCES "NewsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPollOption" ADD CONSTRAINT "NewsPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "NewsPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPollVote" ADD CONSTRAINT "NewsPollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "NewsPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPollVote" ADD CONSTRAINT "NewsPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "NewsPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPollVote" ADD CONSTRAINT "NewsPollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsComment" ADD CONSTRAINT "NewsComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "NewsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsComment" ADD CONSTRAINT "NewsComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsComment" ADD CONSTRAINT "NewsComment_hiddenById_fkey" FOREIGN KEY ("hiddenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsReaction" ADD CONSTRAINT "NewsReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "NewsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsReaction" ADD CONSTRAINT "NewsReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsAttachment" ADD CONSTRAINT "NewsAttachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "NewsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NewsConfirm" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NewsPoll" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NewsPollOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NewsPollVote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NewsComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NewsReaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NewsAttachment" ENABLE ROW LEVEL SECURITY;
