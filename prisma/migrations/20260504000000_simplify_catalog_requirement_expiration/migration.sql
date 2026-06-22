-- Simplify CatalogRequirementExpiration: keep NEVER and add CUSTOM_DATE, drop period-based values.
--
-- Written to be idempotent and recoverable from a partially-applied state,
-- because Prisma does not run this migration in a single transaction (the enum
-- rename/create can commit before a later statement fails). It uses a dedicated
-- "_new" intermediate type so it never collides with leftovers from a prior
-- failed run.

-- 1. Migrate existing period-based rows to NEVER before altering the enum.
--    The ::text cast makes this work whatever enum type the column currently has.
UPDATE "catalog_requirements"
SET "expirationType" = 'NEVER'
WHERE "expirationType"::text IN ('FROM_YEAR_START', 'FROM_COMPLETION', 'BEFORE_YEAR_END');

-- 2. Drop the default so the column type can be changed.
ALTER TABLE "catalog_requirements" ALTER COLUMN "expirationType" DROP DEFAULT;

-- 3. Create the target enum under a temporary name (idempotent).
DO $$ BEGIN
    CREATE TYPE "CatalogRequirementExpiration_new" AS ENUM ('NEVER', 'CUSTOM_DATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Point the column at the new enum.
ALTER TABLE "catalog_requirements"
  ALTER COLUMN "expirationType" TYPE "CatalogRequirementExpiration_new"
  USING "expirationType"::text::"CatalogRequirementExpiration_new";

-- 5. Remove the original enum and any leftover "_old" type from a prior failed
--    run, then promote the new enum to the canonical name.
DROP TYPE IF EXISTS "CatalogRequirementExpiration";
DROP TYPE IF EXISTS "CatalogRequirementExpiration_old";
ALTER TYPE "CatalogRequirementExpiration_new" RENAME TO "CatalogRequirementExpiration";

-- 6. Restore the default now that the column uses the simplified enum.
ALTER TABLE "catalog_requirements" ALTER COLUMN "expirationType" SET DEFAULT 'NEVER';

-- 7. Add optional expirationDate column for CUSTOM_DATE entries.
ALTER TABLE "catalog_requirements"
  ADD COLUMN IF NOT EXISTS "expirationDate" DATE;
