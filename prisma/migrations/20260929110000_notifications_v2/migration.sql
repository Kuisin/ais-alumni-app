-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyOff" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "NotificationLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT,
    "locale" "Locale" NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "opens" INTEGER NOT NULL DEFAULT 0,
    "lastOpenedAt" TIMESTAMP(3),

    CONSTRAINT "NotificationLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLink_token_key" ON "NotificationLink"("token");

-- CreateIndex
CREATE INDEX "NotificationLink_kind_refId_idx" ON "NotificationLink"("kind", "refId");

ALTER TABLE "NotificationLink" ENABLE ROW LEVEL SECURITY;
