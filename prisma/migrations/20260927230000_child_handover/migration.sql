-- CreateTable
CREATE TABLE "ChildHandover" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildHandover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChildHandover_tokenHash_key" ON "ChildHandover"("tokenHash");

-- CreateIndex
CREATE INDEX "ChildHandover_childId_idx" ON "ChildHandover"("childId");

-- AddForeignKey
ALTER TABLE "ChildHandover" ADD CONSTRAINT "ChildHandover_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildHandover" ADD CONSTRAINT "ChildHandover_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- New table: block Supabase Data API access.
ALTER TABLE "ChildHandover" ENABLE ROW LEVEL SECURITY;
