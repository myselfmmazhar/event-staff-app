-- Add PER_TALENT value to CatalogRequirementExpiration enum.
-- When set, each talent supplies their own expiry date when uploading the document
-- rather than a single fixed expiry on the requirement itself.

ALTER TYPE "CatalogRequirementExpiration" ADD VALUE IF NOT EXISTS 'PER_TALENT';
