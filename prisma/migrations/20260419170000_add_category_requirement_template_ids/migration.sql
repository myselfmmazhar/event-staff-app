-- Onboarding requirement template ids (e.g. w9, upload) configured per service category.
ALTER TABLE "service_categories" ADD COLUMN "requirementTemplateIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
