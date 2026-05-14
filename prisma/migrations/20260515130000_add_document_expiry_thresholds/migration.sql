-- AlterEnum
ALTER TYPE "EmailTemplateType" ADD VALUE 'TALENT_DOCUMENT_EXPIRING';

-- AlterTable
ALTER TABLE "staff_documents" ADD COLUMN "notifiedThresholds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
