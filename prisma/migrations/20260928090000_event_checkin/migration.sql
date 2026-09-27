-- CreateTable
CREATE TABLE "EventStaff" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventStaff_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateTable
CREATE TABLE "EventCheckIn" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkedInById" TEXT,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventStaff_userId_idx" ON "EventStaff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventCheckIn_eventId_userId_key" ON "EventCheckIn"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "EventStaff" ADD CONSTRAINT "EventStaff_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventStaff" ADD CONSTRAINT "EventStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCheckIn" ADD CONSTRAINT "EventCheckIn_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCheckIn" ADD CONSTRAINT "EventCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCheckIn" ADD CONSTRAINT "EventCheckIn_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "EventStaff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventCheckIn" ENABLE ROW LEVEL SECURITY;
