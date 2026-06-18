-- Reconcile the production database with prisma/schema.prisma.
--
-- These enums, tables and columns exist in the Prisma schema (and in the dev
-- database, which was updated with `prisma db push`) but were never captured
-- as migrations. Production was therefore missing them, and any select-all
-- query against an affected table failed with:
--   "The column `(not available)` does not exist in the current database."
-- (observed on better-auth login -> users.findFirst, and organization_settings).
--
-- The diff is purely additive: new enums/values, new tables, new columns,
-- recreated foreign keys and relaxed constraints. Nothing is dropped that holds
-- data. Written idempotently (IF NOT EXISTS / duplicate_object guards) so it is
-- safe to run on environments that already contain these objects.

-- ===========================================================================
-- Enums
-- ===========================================================================
DO $$ BEGIN
    CREATE TYPE "CategoryRequirementType" AS ENUM ('STANDARD', 'ESIGNATURE', 'FILE_UPLOAD', 'DRIVER_LICENSE', 'HEADSHOT', 'RESUME');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "EventRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "EventUpdateRequestStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INVITATION_BATCH';
ALTER TYPE "StaffType" ADD VALUE IF NOT EXISTS 'TEAM';

-- ===========================================================================
-- Drop foreign keys that are recreated below with corrected ON DELETE behavior
-- ===========================================================================
ALTER TABLE "bill_items" DROP CONSTRAINT IF EXISTS "bill_items_productId_fkey";
ALTER TABLE "bill_items" DROP CONSTRAINT IF EXISTS "bill_items_serviceId_fkey";
ALTER TABLE "bills" DROP CONSTRAINT IF EXISTS "bills_staffId_fkey";

-- ===========================================================================
-- Column additions / constraint relaxations
-- ===========================================================================
ALTER TABLE "call_time_invitations" ADD COLUMN IF NOT EXISTS "responseToken" TEXT;

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "businessAddressLine2" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
ALTER TABLE "clients" ALTER COLUMN "businessName" DROP NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "firstName" DROP NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "lastName" DROP NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "cellPhone" DROP NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "city" DROP NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "state" DROP NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "zipCode" DROP NOT NULL;

ALTER TABLE "organization_settings" ADD COLUMN IF NOT EXISTS "companyEmail" TEXT;

ALTER TABLE "service_categories" ADD COLUMN IF NOT EXISTS "isRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "service_categories" ADD COLUMN IF NOT EXISTS "requirementType" "CategoryRequirementType" NOT NULL DEFAULT 'STANDARD';

ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "profileCompleted" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "staff_tax_details" ADD COLUMN IF NOT EXISTS "policyAcknowledgedAt" TIMESTAMP(6);
ALTER TABLE "staff_tax_details" ADD COLUMN IF NOT EXISTS "recordsAcknowledgedAt" TIMESTAMP(6);
ALTER TABLE "staff_tax_details" ADD COLUMN IF NOT EXISTS "w4EmployerAddress" TEXT;
ALTER TABLE "staff_tax_details" ADD COLUMN IF NOT EXISTS "w4EmployerName" TEXT;
ALTER TABLE "staff_tax_details" ADD COLUMN IF NOT EXISTS "w4EmploymentDate" TIMESTAMP(6);
ALTER TABLE "staff_tax_details" ADD COLUMN IF NOT EXISTS "w4FirstName" TEXT;
ALTER TABLE "staff_tax_details" ADD COLUMN IF NOT EXISTS "w4LastName" TEXT;
ALTER TABLE "staff_tax_details" ADD COLUMN IF NOT EXISTS "w4Status" TEXT;

ALTER TABLE "time_entry_revisions" ADD COLUMN IF NOT EXISTS "shiftCost" DECIMAL(10,2);
ALTER TABLE "time_entry_revisions" ADD COLUMN IF NOT EXISTS "shiftPrice" DECIMAL(10,2);
ALTER TABLE "time_entry_revisions" ADD COLUMN IF NOT EXISTS "travelCost" DECIMAL(10,2);
ALTER TABLE "time_entry_revisions" ADD COLUMN IF NOT EXISTS "travelPrice" DECIMAL(10,2);

ALTER TABLE "user_preferences" ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otpCode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otpExpiresAt" TIMESTAMP(6);

ALTER TABLE "verifications" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(6);

-- ===========================================================================
-- New tables
-- ===========================================================================
CREATE TABLE IF NOT EXISTS "event_requests" (
    "id" UUID NOT NULL,
    "eventRequestId" TEXT NOT NULL,
    "clientId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirements" TEXT,
    "venueName" TEXT,
    "address" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "meetingPoint" TEXT,
    "onsitePocName" TEXT,
    "onsitePocPhone" TEXT,
    "onsitePocEmail" TEXT,
    "preEventInstructions" TEXT,
    "requestMethod" "RequestMethod",
    "poNumber" TEXT,
    "requestorName" TEXT,
    "requestorPhone" TEXT,
    "requestorEmail" TEXT,
    "fileLinks" JSONB,
    "eventDocuments" JSONB,
    "customFields" JSONB,
    "estimate" BOOLEAN,
    "startDate" DATE,
    "startTime" TEXT,
    "endDate" DATE,
    "endTime" TEXT,
    "timezone" TEXT,
    "status" "EventRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(6),
    "reviewedBy" TEXT,
    "createdEventId" UUID,
    "notes" TEXT,
    "requestedServiceIds" JSONB,

    CONSTRAINT "event_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "event_update_requests" (
    "id" UUID NOT NULL,
    "requestId" TEXT NOT NULL,
    "eventId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "status" "EventUpdateRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(6),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_update_requests_pkey" PRIMARY KEY ("id")
);

-- ===========================================================================
-- Indexes
-- ===========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS "event_requests_eventRequestId_key" ON "event_requests"("eventRequestId");
CREATE UNIQUE INDEX IF NOT EXISTS "event_requests_createdEventId_key" ON "event_requests"("createdEventId");
CREATE INDEX IF NOT EXISTS "event_requests_clientId_idx" ON "event_requests"("clientId");
CREATE INDEX IF NOT EXISTS "event_requests_status_idx" ON "event_requests"("status");
CREATE INDEX IF NOT EXISTS "event_requests_createdAt_idx" ON "event_requests"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "event_update_requests_requestId_key" ON "event_update_requests"("requestId");
CREATE INDEX IF NOT EXISTS "event_update_requests_eventId_idx" ON "event_update_requests"("eventId");
CREATE INDEX IF NOT EXISTS "event_update_requests_clientId_idx" ON "event_update_requests"("clientId");
CREATE INDEX IF NOT EXISTS "event_update_requests_status_idx" ON "event_update_requests"("status");
CREATE INDEX IF NOT EXISTS "event_update_requests_createdAt_idx" ON "event_update_requests"("createdAt");
CREATE INDEX IF NOT EXISTS "bills_status_idx" ON "bills"("status");
CREATE INDEX IF NOT EXISTS "bills_createdBy_idx" ON "bills"("createdBy");
CREATE UNIQUE INDEX IF NOT EXISTS "call_time_invitations_responseToken_key" ON "call_time_invitations"("responseToken");
CREATE INDEX IF NOT EXISTS "services_categoryId_idx" ON "services"("categoryId");

-- ===========================================================================
-- Foreign keys
-- ===========================================================================
DO $$ BEGIN
    ALTER TABLE "event_requests" ADD CONSTRAINT "event_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "event_requests" ADD CONSTRAINT "event_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "event_requests" ADD CONSTRAINT "event_requests_createdEventId_fkey" FOREIGN KEY ("createdEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "event_update_requests" ADD CONSTRAINT "event_update_requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "event_update_requests" ADD CONSTRAINT "event_update_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "event_update_requests" ADD CONSTRAINT "event_update_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "bills" ADD CONSTRAINT "bills_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
