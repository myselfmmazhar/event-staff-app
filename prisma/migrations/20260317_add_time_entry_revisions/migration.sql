-- CreateTable
CREATE TABLE "time_entry_revisions" (
    "id" UUID NOT NULL,
    "timeEntryId" UUID NOT NULL,
    "clockIn" TIMESTAMP(6),
    "clockOut" TIMESTAMP(6),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeCost" DECIMAL(10,2),
    "overtimePrice" DECIMAL(10,2),
    "notes" TEXT,
    "editedBy" TEXT NOT NULL,
    "editedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entry_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_entry_revisions_timeEntryId_idx" ON "time_entry_revisions"("timeEntryId");

-- CreateIndex
CREATE INDEX "time_entry_revisions_editedBy_idx" ON "time_entry_revisions"("editedBy");

-- CreateIndex
CREATE INDEX "time_entry_revisions_editedAt_idx" ON "time_entry_revisions"("editedAt");

-- AddForeignKey
ALTER TABLE "time_entry_revisions" ADD CONSTRAINT "time_entry_revisions_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "time_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entry_revisions" ADD CONSTRAINT "time_entry_revisions_editedBy_fkey" FOREIGN KEY ("editedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
