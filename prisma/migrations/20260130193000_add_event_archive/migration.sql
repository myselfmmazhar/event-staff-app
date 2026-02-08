-- AlterTable
ALTER TABLE "events"
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedAt" TIMESTAMP(6);

-- CreateIndex
CREATE INDEX "events_isArchived_idx" ON "events"("isArchived");
