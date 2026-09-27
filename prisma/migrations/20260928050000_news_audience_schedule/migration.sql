-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "audience" JSONB,
ADD COLUMN     "notifyOnPublish" BOOLEAN NOT NULL DEFAULT true;

