-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('JUNIOR_HIGH', 'HIGH_SCHOOL', 'UNIVERSITY', 'GRADUATE_SCHOOL', 'VOCATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "HistoryVisibility" AS ENUM ('MEMBERS', 'FOLLOWERS');

-- CreateTable
CREATE TABLE "EducationEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "EducationLevel" NOT NULL,
    "schoolId" TEXT NOT NULL,
    "field" TEXT,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "visibility" "HistoryVisibility" NOT NULL DEFAULT 'MEMBERS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "visibility" "HistoryVisibility" NOT NULL DEFAULT 'FOLLOWERS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EducationEntry_userId_idx" ON "EducationEntry"("userId");

-- CreateIndex
CREATE INDEX "EducationEntry_schoolId_idx" ON "EducationEntry"("schoolId");

-- CreateIndex
CREATE INDEX "WorkEntry_userId_idx" ON "WorkEntry"("userId");

-- CreateIndex
CREATE INDEX "WorkEntry_companyId_idx" ON "WorkEntry"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "School_nameKey_key" ON "School"("nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "Company_nameKey_key" ON "Company"("nameKey");

-- AddForeignKey
ALTER TABLE "EducationEntry" ADD CONSTRAINT "EducationEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationEntry" ADD CONSTRAINT "EducationEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkEntry" ADD CONSTRAINT "WorkEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkEntry" ADD CONSTRAINT "WorkEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Block Supabase Data API access (see 20260926080000_enable_rls).
ALTER TABLE "EducationEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
