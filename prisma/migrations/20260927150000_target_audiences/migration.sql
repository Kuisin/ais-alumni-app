-- CreateEnum
CREATE TYPE "AudienceKey" AS ENUM ('TEACHER', 'CURRENT_STUDENT', 'CURRENT_PARENT', 'GRADUATE', 'LEFT_STUDENT', 'FORMER_PARENT');

-- AlterTable
ALTER TABLE "Broadcast" ADD COLUMN     "targetAudiences" "AudienceKey"[] DEFAULT ARRAY[]::"AudienceKey"[];

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "targetAudiences" "AudienceKey"[] DEFAULT ARRAY[]::"AudienceKey"[];

-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "targetAudiences" "AudienceKey"[] DEFAULT ARRAY[]::"AudienceKey"[];


-- Backfill: the same audience as targetRoles, with 卒業生・元生徒 split into
-- both of its halves.
UPDATE "Event" SET "targetAudiences" = ARRAY(
  SELECT DISTINCT a::"AudienceKey"
  FROM unnest("targetRoles") AS r,
  LATERAL unnest(CASE WHEN r = 'FORMER_STUDENT' THEN ARRAY['GRADUATE', 'LEFT_STUDENT'] ELSE ARRAY[r::text] END) AS a
) WHERE cardinality("targetRoles") > 0;

UPDATE "NewsPost" SET "targetAudiences" = ARRAY(
  SELECT DISTINCT a::"AudienceKey"
  FROM unnest("targetRoles") AS r,
  LATERAL unnest(CASE WHEN r = 'FORMER_STUDENT' THEN ARRAY['GRADUATE', 'LEFT_STUDENT'] ELSE ARRAY[r::text] END) AS a
) WHERE cardinality("targetRoles") > 0;

UPDATE "Broadcast" SET "targetAudiences" = ARRAY(
  SELECT DISTINCT a::"AudienceKey"
  FROM unnest("targetRoles") AS r,
  LATERAL unnest(CASE WHEN r = 'FORMER_STUDENT' THEN ARRAY['GRADUATE', 'LEFT_STUDENT'] ELSE ARRAY[r::text] END) AS a
) WHERE cardinality("targetRoles") > 0;
