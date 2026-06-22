-- Backfill the team_units / team_unit_activities tables.
--
-- These models exist in schema.prisma but were originally created with
-- `prisma db push`, so no CREATE TABLE migration was ever committed. Migration
-- 20260428000000_add_team_invitation_to_call_time_invitations adds a foreign
-- key that REFERENCES team_units and therefore fails (P3018 / relation
-- "team_units" does not exist) on any database that was built purely from the
-- migration history. This migration creates those tables so the chain applies
-- cleanly on every environment. All statements are idempotent.

-- Enums -----------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE "TeamUnitStatus" AS ENUM ('ACTIVE', 'PENDING_REVIEW', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "TeamUnitAvailability" AS ENUM ('AVAILABLE', 'LIMITED', 'NOT_AVAILABLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- team_units ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "team_units" (
    "id"             UUID                   NOT NULL,
    "unitId"         TEXT                   NOT NULL,
    "unitName"       TEXT                   NOT NULL,
    "primaryContact" TEXT,
    "serviceId"      UUID,
    "status"         "TeamUnitStatus"       NOT NULL DEFAULT 'ACTIVE',
    "availability"   "TeamUnitAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "capacityNotes"  TEXT,
    "internalNotes"  TEXT,
    "staffId"        UUID                   NOT NULL,
    "createdBy"      TEXT                   NOT NULL,
    "createdAt"      TIMESTAMP(6)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(6)           NOT NULL,
    CONSTRAINT "team_units_pkey" PRIMARY KEY ("id")
);

-- team_unit_activities --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "team_unit_activities" (
    "id"          UUID         NOT NULL,
    "teamUnitId"  UUID         NOT NULL,
    "action"      TEXT         NOT NULL,
    "note"        TEXT,
    "performedBy" TEXT         NOT NULL,
    "createdAt"   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_unit_activities_pkey" PRIMARY KEY ("id")
);

-- Indexes ---------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "team_units_unitId_key"   ON "team_units" ("unitId");
CREATE INDEX        IF NOT EXISTS "team_units_unitId_idx"   ON "team_units" ("unitId");
CREATE INDEX        IF NOT EXISTS "team_units_staffId_idx"  ON "team_units" ("staffId");
CREATE INDEX        IF NOT EXISTS "team_units_createdBy_idx" ON "team_units" ("createdBy");
CREATE INDEX        IF NOT EXISTS "team_units_status_idx"   ON "team_units" ("status");

CREATE INDEX IF NOT EXISTS "team_unit_activities_teamUnitId_idx"  ON "team_unit_activities" ("teamUnitId");
CREATE INDEX IF NOT EXISTS "team_unit_activities_performedBy_idx" ON "team_unit_activities" ("performedBy");
CREATE INDEX IF NOT EXISTS "team_unit_activities_createdAt_idx"   ON "team_unit_activities" ("createdAt");

-- Foreign keys: team_units ----------------------------------------------------
DO $$ BEGIN
    ALTER TABLE "team_units"
        ADD CONSTRAINT "team_units_serviceId_fkey"
        FOREIGN KEY ("serviceId") REFERENCES "services"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "team_units"
        ADD CONSTRAINT "team_units_staffId_fkey"
        FOREIGN KEY ("staffId") REFERENCES "staff"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "team_units"
        ADD CONSTRAINT "team_units_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Foreign keys: team_unit_activities ------------------------------------------
DO $$ BEGIN
    ALTER TABLE "team_unit_activities"
        ADD CONSTRAINT "team_unit_activities_teamUnitId_fkey"
        FOREIGN KEY ("teamUnitId") REFERENCES "team_units"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "team_unit_activities"
        ADD CONSTRAINT "team_unit_activities_performedBy_fkey"
        FOREIGN KEY ("performedBy") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
