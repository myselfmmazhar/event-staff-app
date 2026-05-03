-- The 0_init migration created a unique INDEX on (callTimeId, staffId):
--   CREATE UNIQUE INDEX "call_time_invitations_callTimeId_staffId_key" ...
-- The 20260428000000 migration intended to drop it via ALTER TABLE ... DROP CONSTRAINT,
-- but a unique INDEX is not a CONSTRAINT in PostgreSQL, so the drop silently failed
-- (the statement is wrapped in an EXCEPTION block). The leftover index now blocks
-- creating multiple team-manager invitations on the same CallTime (one per team unit).
--
-- Drop it as an INDEX. The replacement composite unique
-- (callTimeId, staffId, teamUnitId) was added in the prior migration; PostgreSQL
-- treats NULL values as distinct, so multiple (ct, manager, NULL) rows are permitted.

DROP INDEX IF EXISTS "call_time_invitations_callTimeId_staffId_key";
