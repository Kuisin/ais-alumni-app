-- AlterTable
ALTER TABLE "User" ADD COLUMN     "followerFields" TEXT[] DEFAULT ARRAY[]::TEXT[];

