-- Add PUBLISHED value to EventStatus enum
ALTER TYPE "EventStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';

-- Add 'from' column to messaging_configurations
ALTER TABLE "messaging_configurations" ADD COLUMN IF NOT EXISTS "from" TEXT;
