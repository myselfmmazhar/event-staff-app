-- AlterTable: add custom-card columns to CatalogRequirement
ALTER TABLE "catalog_requirements"
    ADD COLUMN "customDocumentUrl"  TEXT,
    ADD COLUMN "customDocumentName" VARCHAR(300),
    ADD COLUMN "customDocumentType" VARCHAR(120),
    ADD COLUMN "customDocumentSize" INTEGER,
    ADD COLUMN "customLinkUrl"      TEXT,
    ADD COLUMN "customLinkLabel"    VARCHAR(200);
