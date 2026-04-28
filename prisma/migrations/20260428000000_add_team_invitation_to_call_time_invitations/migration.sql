-- Add team-invitation fields to call_time_invitations so a single Team Manager
-- (Staff with staffRole = TEAM) can receive multiple invitations for the same
-- CallTime, each later bound to a specific TeamUnit when the manager accepts.

-- 1. Add columns
ALTER TABLE "call_time_invitations"
    ADD COLUMN IF NOT EXISTS "invitedAsTeam" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "teamUnitId" UUID;

-- 2. Replace the existing unique constraint (callTimeId, staffId) with one that
-- includes teamUnitId so multiple team-manager invitations are permitted.
DO $$ BEGIN
    ALTER TABLE "call_time_invitations"
        DROP CONSTRAINT "call_time_invitations_callTimeId_staffId_key";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "call_time_invitations"
        ADD CONSTRAINT "call_time_invitations_callTimeId_staffId_teamUnitId_key"
        UNIQUE ("callTimeId", "staffId", "teamUnitId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Index on teamUnitId for availability lookups
CREATE INDEX IF NOT EXISTS "call_time_invitations_teamUnitId_idx"
    ON "call_time_invitations" ("teamUnitId");

-- 4. Foreign key teamUnitId -> team_units(id)
DO $$ BEGIN
    ALTER TABLE "call_time_invitations"
        ADD CONSTRAINT "call_time_invitations_teamUnitId_fkey"
        FOREIGN KEY ("teamUnitId") REFERENCES "team_units"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
