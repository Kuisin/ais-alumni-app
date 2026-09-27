-- AlterTable
ALTER TABLE "Broadcast" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "archivedAt" TIMESTAMP(3);

