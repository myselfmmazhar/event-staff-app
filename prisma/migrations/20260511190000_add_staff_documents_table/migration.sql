-- Talent document tracking with status/versioning.
-- Replaces (alongside) the legacy `staff.documents` JSON column. Onboarding
-- writes APPROVED+isCurrent rows here; talent update flow creates PENDING
-- rows reviewed by admins.

CREATE TYPE "StaffDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TALENT_DOCUMENT_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TALENT_DOCUMENT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TALENT_DOCUMENT_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TALENT_DOCUMENT_EXPIRING';

CREATE TABLE "staff_documents" (
    "id" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "requirementTemplateId" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT,
    "size" INTEGER,
    "status" "StaffDocumentStatus" NOT NULL DEFAULT 'APPROVED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "replacesId" UUID,
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(6),
    "reviewedBy" TEXT,
    "expiresAt" DATE,
    "expiryNotifiedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "staff_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "staff_documents_staffId_idx" ON "staff_documents"("staffId");
CREATE INDEX "staff_documents_staffId_requirementTemplateId_idx" ON "staff_documents"("staffId", "requirementTemplateId");
CREATE INDEX "staff_documents_staffId_isCurrent_idx" ON "staff_documents"("staffId", "isCurrent");
CREATE INDEX "staff_documents_status_idx" ON "staff_documents"("status");
CREATE INDEX "staff_documents_expiresAt_idx" ON "staff_documents"("expiresAt");

ALTER TABLE "staff_documents"
  ADD CONSTRAINT "staff_documents_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "staff_documents"
  ADD CONSTRAINT "staff_documents_reviewedBy_fkey"
  FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "staff_documents"
  ADD CONSTRAINT "staff_documents_replacesId_fkey"
  FOREIGN KEY ("replacesId") REFERENCES "staff_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
