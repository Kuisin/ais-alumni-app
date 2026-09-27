-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "mentionAll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mentionUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

