-- CreateEnum
CREATE TYPE "ChatGroupKind" AS ENUM ('TEACHERS', 'CURRENT_STUDENTS', 'FORMER_STUDENTS', 'CURRENT_PARENTS', 'FORMER_PARENTS', 'COHORT', 'COHORT_PARENTS');

-- CreateTable
CREATE TABLE "ChatGroup" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "ChatGroupKind" NOT NULL,
    "cohortId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMember" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "muted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChatMember_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatGroup_key_key" ON "ChatGroup"("key");

-- CreateIndex
CREATE INDEX "ChatMember_userId_idx" ON "ChatMember"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_groupId_createdAt_idx" ON "ChatMessage"("groupId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatGroup" ADD CONSTRAINT "ChatGroup_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChatGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChatGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "ChatGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;

-- Supabase Realtime private channels (Broadcast). Browsers join with a
-- short-lived JWT the app signs (sub = User.id; not a uuid, so read it from
-- the claims rather than auth.uid()). They may read `user:<own id>` and
-- `chat:<groupId>` of their groups (admins: any chat). Only on Supabase:
-- plain Postgres (local, CI) has no realtime/auth schemas. Never fails the
-- migration: if the setup can't be applied, chats fall back to polling.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.ais_realtime_can_read(topic text)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT CASE
          WHEN (auth.jwt() ->> 'sub') IS NULL THEN false
          WHEN topic = 'user:' || (auth.jwt() ->> 'sub') THEN true
          WHEN topic LIKE 'chat:%' THEN EXISTS (
            SELECT 1 FROM "ChatMember" m
            WHERE m."groupId" = substr(topic, 6)
              AND m."userId" = auth.jwt() ->> 'sub'
          ) OR EXISTS (
            SELECT 1 FROM "User" u
            WHERE u.id = auth.jwt() ->> 'sub' AND u."isAdmin" AND u.state = 'ACTIVE'
          )
          ELSE false
        END
      $body$
    $f$;
    EXECUTE 'REVOKE ALL ON FUNCTION public.ais_realtime_can_read(text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.ais_realtime_can_read(text) TO authenticated';
    EXECUTE 'DROP POLICY IF EXISTS "ais members read own channels" ON realtime.messages';
    EXECUTE $p$
      CREATE POLICY "ais members read own channels" ON realtime.messages
      FOR SELECT TO authenticated
      USING (
        realtime.messages.extension = 'broadcast'
        AND public.ais_realtime_can_read(realtime.topic())
      )
    $p$;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Realtime policy not installed: %', SQLERRM;
END
$$;
