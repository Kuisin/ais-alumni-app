-- AlterTable
ALTER TABLE "User" ADD COLUMN     "linkCode" TEXT;

-- CreateTable
CREATE TABLE "NotificationReceipt" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channels" TEXT[],
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "opens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NotificationReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationReceipt_userId_idx" ON "NotificationReceipt"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationReceipt_linkId_userId_key" ON "NotificationReceipt"("linkId", "userId");

-- CreateIndex
CREATE INDEX "SupportRequest_closedAt_createdAt_idx" ON "SupportRequest"("closedAt", "createdAt");

-- CreateIndex
CREATE INDEX "SupportRequest_email_createdAt_idx" ON "SupportRequest"("email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_linkCode_key" ON "User"("linkCode");

-- AddForeignKey
ALTER TABLE "NotificationReceipt" ADD CONSTRAINT "NotificationReceipt_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "NotificationLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationReceipt" ADD CONSTRAINT "NotificationReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "NotificationReceipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportRequest" ENABLE ROW LEVEL SECURITY;
