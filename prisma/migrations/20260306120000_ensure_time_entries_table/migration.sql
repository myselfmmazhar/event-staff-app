-- Runs before `20260317_add_time_entry_revisions` (lexicographic order). `time_entries` is also created in
-- `20260409_comprehensive_schema_sync`, which sorts later — Prisma's shadow DB replays migrations in order and
-- would otherwise fail when the FK in 20260317 references `time_entries`.
-- Idempotent: safe on databases that already have `time_entries` from `db push` or later migrations.

CREATE TABLE IF NOT EXISTS "time_entries" (
    "id"            UUID          NOT NULL,
    "invitationId"  UUID          NOT NULL,
    "staffId"       UUID          NOT NULL,
    "callTimeId"    UUID          NOT NULL,
    "clockIn"       TIMESTAMP(6),
    "clockOut"      TIMESTAMP(6),
    "breakMinutes"  INTEGER       NOT NULL DEFAULT 0,
    "notes"         TEXT,
    "createdBy"     TEXT          NOT NULL,
    "createdAt"     TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(6)  NOT NULL,
    "overtimeCost"  DECIMAL(10,2),
    "overtimePrice" DECIMAL(10,2),
    "shiftCost"     DECIMAL(10,2),
    "shiftPrice"    DECIMAL(10,2),
    "travelCost"    DECIMAL(10,2),
    "travelPrice"   DECIMAL(10,2),
    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "time_entries_invitationId_key" ON "time_entries"("invitationId");
CREATE INDEX IF NOT EXISTS "time_entries_staffId_idx" ON "time_entries"("staffId");
CREATE INDEX IF NOT EXISTS "time_entries_callTimeId_idx" ON "time_entries"("callTimeId");

DO $$ BEGIN
    ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_callTimeId_fkey"
        FOREIGN KEY ("callTimeId") REFERENCES "call_times"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_invitationId_fkey"
        FOREIGN KEY ("invitationId") REFERENCES "call_time_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_staffId_fkey"
        FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
