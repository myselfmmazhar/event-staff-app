-- Simplify CatalogRequirementExpiration: keep NEVER and add CUSTOM_DATE, drop period-based values.

-- Migrate existing period-based rows to NEVER before altering the enum
UPDATE "catalog_requirements"
SET "expirationType" = 'NEVER'
WHERE "expirationType" IN ('FROM_YEAR_START', 'FROM_COMPLETION', 'BEFORE_YEAR_END');

-- Rename the old enum type so we can recreate it cleanly
ALTER TYPE "CatalogRequirementExpiration" RENAME TO "CatalogRequirementExpiration_old";

-- Create the new simplified enum
CREATE TYPE "CatalogRequirementExpiration" AS ENUM ('NEVER', 'CUSTOM_DATE');

-- Swap the column to use the new type
ALTER TABLE "catalog_requirements"
  ALTER COLUMN "expirationType" TYPE "CatalogRequirementExpiration"
  USING "expirationType"::text::"CatalogRequirementExpiration";

-- Drop the old enum
DROP TYPE "CatalogRequirementExpiration_old";

-- Add optional expirationDate column for CUSTOM_DATE entries
ALTER TABLE "catalog_requirements"
  ADD COLUMN IF NOT EXISTS "expirationDate" DATE;
