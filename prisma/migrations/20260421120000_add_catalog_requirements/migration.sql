-- Catalog requirements: per-category configured requirement instances (templates + settings).

DO $$ BEGIN
    CREATE TYPE "CatalogRequirementExpiration" AS ENUM ('NEVER', 'FROM_YEAR_START', 'FROM_COMPLETION', 'BEFORE_YEAR_END');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "catalog_requirements" (
    "id"                 UUID                         NOT NULL,
    "serviceCategoryId"  UUID                         NOT NULL,
    "templateId"         VARCHAR(32)                  NOT NULL,
    "name"               VARCHAR(200)                 NOT NULL,
    "instructions"       TEXT,
    "allowPdf"           BOOLEAN                      NOT NULL DEFAULT true,
    "allowImage"         BOOLEAN                      NOT NULL DEFAULT true,
    "allowOther"         BOOLEAN                      NOT NULL DEFAULT false,
    "expirationType"     "CatalogRequirementExpiration" NOT NULL DEFAULT 'NEVER',
    "allowEarlyRenewal"  BOOLEAN                      NOT NULL DEFAULT false,
    "requiresApproval"   BOOLEAN                      NOT NULL DEFAULT false,
    "isTalentRequired"   BOOLEAN                      NOT NULL DEFAULT false,
    "createdBy"          TEXT                         NOT NULL,
    "createdAt"          TIMESTAMP(6)                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(6)                 NOT NULL,
    CONSTRAINT "catalog_requirements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "catalog_requirements_serviceCategoryId_idx" ON "catalog_requirements"("serviceCategoryId");

DO $$ BEGIN
    ALTER TABLE "catalog_requirements" ADD CONSTRAINT "catalog_requirements_serviceCategoryId_fkey"
        FOREIGN KEY ("serviceCategoryId") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "catalog_requirements" ADD CONSTRAINT "catalog_requirements_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
