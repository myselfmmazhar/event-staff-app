-- =============================================================
-- Comprehensive schema sync: adds all tables/columns/enums
-- that were applied via db push but never had migration files.
-- All statements are idempotent (IF NOT EXISTS / DO..EXCEPTION).
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. Missing enums
-- ──────────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE "BillStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'PAID', 'VOID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 2. Missing enum values on existing enums
-- ──────────────────────────────────────────────────────────────

ALTER TYPE "EventStatus"       ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'CALL_INVITATION_BATCH';
ALTER TYPE "SmsTemplateType"   ADD VALUE IF NOT EXISTS 'CALL_INVITATION_BATCH';

-- ──────────────────────────────────────────────────────────────
-- 3. Missing tables
-- ──────────────────────────────────────────────────────────────

-- service_categories
CREATE TABLE IF NOT EXISTS "service_categories" (
    "id"          UUID          NOT NULL,
    "categoryId"  TEXT          NOT NULL,
    "name"        VARCHAR(200)  NOT NULL,
    "description" VARCHAR(1000),
    "isActive"    BOOLEAN       NOT NULL DEFAULT true,
    "createdBy"   TEXT          NOT NULL,
    "createdAt"   TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(6)  NOT NULL,
    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "service_categories_categoryId_key" ON "service_categories"("categoryId");
CREATE INDEX IF NOT EXISTS "service_categories_categoryId_idx"        ON "service_categories"("categoryId");
CREATE INDEX IF NOT EXISTS "service_categories_name_idx"              ON "service_categories"("name");
CREATE INDEX IF NOT EXISTS "service_categories_isActive_idx"          ON "service_categories"("isActive");
DO $$ BEGIN
    ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- time_entries
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
CREATE INDEX IF NOT EXISTS "time_entries_staffId_idx"    ON "time_entries"("staffId");
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

-- time_entry_revisions (may not exist if migration 20260317 was resolved without running)
CREATE TABLE IF NOT EXISTS "time_entry_revisions" (
    "id"            UUID          NOT NULL,
    "timeEntryId"   UUID          NOT NULL,
    "clockIn"       TIMESTAMP(6),
    "clockOut"      TIMESTAMP(6),
    "breakMinutes"  INTEGER       NOT NULL DEFAULT 0,
    "overtimeCost"  DECIMAL(10,2),
    "overtimePrice" DECIMAL(10,2),
    "notes"         TEXT,
    "editedBy"      TEXT          NOT NULL,
    "editedAt"      TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "time_entry_revisions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "time_entry_revisions_timeEntryId_idx" ON "time_entry_revisions"("timeEntryId");
CREATE INDEX IF NOT EXISTS "time_entry_revisions_editedBy_idx"    ON "time_entry_revisions"("editedBy");
CREATE INDEX IF NOT EXISTS "time_entry_revisions_editedAt_idx"    ON "time_entry_revisions"("editedAt");
DO $$ BEGIN
    ALTER TABLE "time_entry_revisions" ADD CONSTRAINT "time_entry_revisions_timeEntryId_fkey"
        FOREIGN KEY ("timeEntryId") REFERENCES "time_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "time_entry_revisions" ADD CONSTRAINT "time_entry_revisions_editedBy_fkey"
        FOREIGN KEY ("editedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- bills
CREATE TABLE IF NOT EXISTS "bills" (
    "id"             UUID          NOT NULL,
    "billNo"         TEXT          NOT NULL,
    "staffId"        UUID          NOT NULL,
    "status"         "BillStatus"  NOT NULL DEFAULT 'DRAFT',
    "billDate"       DATE          NOT NULL,
    "dueDate"        DATE,
    "terms"          TEXT,
    "customField1"   TEXT,
    "customField2"   TEXT,
    "customField3"   TEXT,
    "discountType"   "DiscountType",
    "discountValue"  DECIMAL(10,2),
    "depositAmount"  DECIMAL(10,2),
    "shippingAmount" DECIMAL(10,2),
    "salesTaxAmount" DECIMAL(10,2),
    "isTaxable"      BOOLEAN       NOT NULL DEFAULT false,
    "notes"          TEXT,
    "paymentDetails" TEXT,
    "fileLinks"      JSONB,
    "isArchived"     BOOLEAN       NOT NULL DEFAULT false,
    "archivedAt"     TIMESTAMP(6),
    "createdBy"      TEXT          NOT NULL,
    "createdAt"      TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(6)  NOT NULL,
    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "bills_billNo_key"    ON "bills"("billNo");
CREATE INDEX IF NOT EXISTS "bills_staffId_idx"          ON "bills"("staffId");
CREATE INDEX IF NOT EXISTS "bills_billNo_idx"           ON "bills"("billNo");
DO $$ BEGIN
    ALTER TABLE "bills" ADD CONSTRAINT "bills_staffId_fkey"
        FOREIGN KEY ("staffId") REFERENCES "staff"("id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "bills" ADD CONSTRAINT "bills_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- bill_items
CREATE TABLE IF NOT EXISTS "bill_items" (
    "id"                  UUID          NOT NULL,
    "billId"              UUID          NOT NULL,
    "date"                DATE,
    "productId"           UUID,
    "serviceId"           UUID,
    "description"         TEXT          NOT NULL,
    "quantity"            DECIMAL(10,2) NOT NULL,
    "price"               DECIMAL(10,2) NOT NULL,
    "amount"              DECIMAL(10,2) NOT NULL,
    "createdAt"           TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(6)  NOT NULL,
    "actualEnd"           TIMESTAMP(6),
    "actualHours"         DECIMAL(10,2),
    "actualShiftDetails"  TEXT,
    "actualStart"         TIMESTAMP(6),
    "internalNotes"       TEXT,
    "scheduleShiftDetail" TEXT,
    "scheduledEnd"        TIMESTAMP(6),
    "scheduledHours"      DECIMAL(10,2),
    "scheduledStart"      TIMESTAMP(6),
    CONSTRAINT "bill_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "bill_items_billId_idx"     ON "bill_items"("billId");
CREATE INDEX IF NOT EXISTS "bill_items_productId_idx"  ON "bill_items"("productId");
CREATE INDEX IF NOT EXISTS "bill_items_serviceId_idx"  ON "bill_items"("serviceId");
DO $$ BEGIN
    ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_billId_fkey"
        FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "products"("id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_serviceId_fkey"
        FOREIGN KEY ("serviceId") REFERENCES "services"("id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 4. Missing columns on existing tables
-- ──────────────────────────────────────────────────────────────

-- call_times
ALTER TABLE "call_times" ADD COLUMN IF NOT EXISTS "instructions"          TEXT;
ALTER TABLE "call_times" ADD COLUMN IF NOT EXISTS "travelInMinimum"       BOOLEAN       NOT NULL DEFAULT false;
ALTER TABLE "call_times" ADD COLUMN IF NOT EXISTS "expenditureAmount"     DECIMAL(10,2);
ALTER TABLE "call_times" ADD COLUMN IF NOT EXISTS "expenditureAmountType" "AmountType";
ALTER TABLE "call_times" ADD COLUMN IF NOT EXISTS "expenditure"           BOOLEAN       NOT NULL DEFAULT false;
ALTER TABLE "call_times" ADD COLUMN IF NOT EXISTS "expenditureCost"       DECIMAL(10,2);
ALTER TABLE "call_times" ADD COLUMN IF NOT EXISTS "expenditurePrice"      DECIMAL(10,2);
ALTER TABLE "call_times" ADD COLUMN IF NOT EXISTS "minimum"               DECIMAL(10,2);

-- services
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "categoryId"            UUID;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "travelInMinimum"       BOOLEAN       NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "expenditureAmount"     DECIMAL(10,2);
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "expenditureAmountType" "AmountType";
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "expenditure"           BOOLEAN       NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "expenditureCost"       DECIMAL(10,2);
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "expenditurePrice"      DECIMAL(10,2);
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "minimum"               DECIMAL(10,2);
DO $$ BEGIN
    ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- staff
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "geocodedAt"  TIMESTAMP(6);
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "latitude"    DOUBLE PRECISION;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "longitude"   DOUBLE PRECISION;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "hrSystemId"  TEXT;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "payrollId"   TEXT;

-- events
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "addressLine2" TEXT;

-- event_templates
ALTER TABLE "event_templates" ADD COLUMN IF NOT EXISTS "addressLine2" VARCHAR(200);

-- messaging_configurations (idempotent — may already exist from prior migration)
ALTER TABLE "messaging_configurations" ADD COLUMN IF NOT EXISTS "from" TEXT;

-- contacts
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
