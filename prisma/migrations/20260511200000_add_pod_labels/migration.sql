-- AlterTable
-- Adds pod-scoped label overrides. Each key in the JSON object corresponds to a pod id
-- (task | talent | time) and holds a snapshot of the GlobalLabels structure to override.
-- The column is nullable-equivalent (default '{}') so dropping this column safely restores
-- the prior behaviour: the application falls back to globalLabels in that case.
ALTER TABLE "organization_settings"
    ADD COLUMN "podLabels" JSONB NOT NULL DEFAULT '{}';
