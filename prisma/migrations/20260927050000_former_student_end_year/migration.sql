-- Former students have a single end year: their graduation / leaving year.
-- Keep yearsTo in step with it (the app now writes both together).
UPDATE "UserRole"
SET "yearsTo" = "graduationOrLeaveYear"
WHERE "role" = 'FORMER_STUDENT' AND "graduationOrLeaveYear" IS NOT NULL;
