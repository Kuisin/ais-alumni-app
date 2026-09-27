-- Supabase Realtime private channels for the app (idempotent; also in
-- migration 20260928150000_group_chat, which skips it when the realtime
-- tables don't exist yet). Browsers join with a JWT the app signs
-- (sub = User.id, not a uuid, so read it from the claims) and may read
-- `user:<own id>` and `chat:<groupId>` of their groups (admins: any chat).
-- Run with: pnpm realtime:setup  (DATABASE_URL = direct Supabase URL)

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
$body$;

REVOKE ALL ON FUNCTION public.ais_realtime_can_read(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ais_realtime_can_read(text) TO authenticated;

DROP POLICY IF EXISTS "ais members read own channels" ON realtime.messages;
CREATE POLICY "ais members read own channels" ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND public.ais_realtime_can_read(realtime.topic())
);
