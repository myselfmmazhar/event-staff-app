-- Add shift-related fields to invoice_items (matching bill_items structure)
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "actualEnd"           TIMESTAMP(6);
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "actualHours"         DECIMAL(10,2);
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "actualShiftDetails"  TEXT;
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "actualStart"         TIMESTAMP(6);
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "internalNotes"       TEXT;
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "scheduleShiftDetail" TEXT;
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "scheduledEnd"        TIMESTAMP(6);
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "scheduledHours"      DECIMAL(10,2);
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "scheduledStart"      TIMESTAMP(6);
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "isScheduledChecked"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "isActualChecked"     BOOLEAN NOT NULL DEFAULT false;
