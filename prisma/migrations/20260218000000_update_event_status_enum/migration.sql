-- Update EventStatus enum: Remove PUBLISHED and CONFIRMED, Add ASSIGNED
-- PostgreSQL requires a multi-step approach for enum changes

-- Step 1: Create a new enum type with the desired values
CREATE TYPE "EventStatus_new" AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- Step 2: Drop the default value first
ALTER TABLE "events" ALTER COLUMN "status" DROP DEFAULT;

-- Step 3: Update the column to use TEXT temporarily
ALTER TABLE "events" ALTER COLUMN "status" TYPE TEXT;

-- Step 4: Convert PUBLISHED and CONFIRMED to ASSIGNED
UPDATE "events" SET "status" = 'ASSIGNED' WHERE "status" IN ('PUBLISHED', 'CONFIRMED');

-- Step 5: Convert to the new enum type
ALTER TABLE "events" ALTER COLUMN "status" TYPE "EventStatus_new" USING "status"::"EventStatus_new";

-- Step 6: Drop the old enum and rename the new one
DROP TYPE "EventStatus";
ALTER TYPE "EventStatus_new" RENAME TO "EventStatus";

-- Step 7: Re-set the default value
ALTER TABLE "events" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"EventStatus";
