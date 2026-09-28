-- CreateTable
CREATE TABLE "CronRun" (
    "task" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL,
    "lastResult" JSONB,
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("task")
);


-- Blocks Supabase's public Data API.
ALTER TABLE "CronRun" ENABLE ROW LEVEL SECURITY;
