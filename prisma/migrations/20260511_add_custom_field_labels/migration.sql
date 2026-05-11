-- AlterTable
ALTER TABLE "bills"
    ADD COLUMN "customField1Label" TEXT,
    ADD COLUMN "customField2Label" TEXT,
    ADD COLUMN "customField3Label" TEXT;

-- AlterTable
ALTER TABLE "invoices"
    ADD COLUMN "customField1Label" TEXT,
    ADD COLUMN "customField2Label" TEXT,
    ADD COLUMN "customField3Label" TEXT;
