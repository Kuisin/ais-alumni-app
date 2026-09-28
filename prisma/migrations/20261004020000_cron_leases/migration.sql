-- CronRun has not been used by the code on main yet (empty), so it can be
-- reshaped in one step: lastRunAt becomes the claimed slot, plus a lease,
-- progress and completion.
ALTER TABLE "CronRun" RENAME COLUMN "lastRunAt" TO "slot";
ALTER TABLE "CronRun" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "cursor" JSONB,
ADD COLUMN "doneAt" TIMESTAMP(3),
ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- News send leases (nullable; main ignores them).
ALTER TABLE "NewsPost" ADD COLUMN "notifyingUntil" TIMESTAMP(3),
ADD COLUMN "remindingUntil" TIMESTAMP(3);
