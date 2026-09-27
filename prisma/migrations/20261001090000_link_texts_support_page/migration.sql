-- AlterTable
ALTER TABLE "NotificationLink" ADD COLUMN     "texts" JSONB,
ALTER COLUMN "locale" DROP NOT NULL,
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "body" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SupportRequest" ADD COLUMN     "page" TEXT;

