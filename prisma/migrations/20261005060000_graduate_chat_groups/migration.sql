-- 「卒業生」 and 「卒業生（成人）」 group chats. Only the enum values: rows use
-- them once GRADUATE_CHATS_ENABLED is on (after these values reach main).
ALTER TYPE "ChatGroupKind" ADD VALUE 'GRADUATES';
ALTER TYPE "ChatGroupKind" ADD VALUE 'GRADUATES_ADULTS';
