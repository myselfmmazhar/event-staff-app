/*
  Warnings:

  - The values [CORPORATION] on the enum `BusinessStructure` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `collectTaxDetails` on the `staff_tax_details` table. All the data in the column will be lost.
  - You are about to drop the column `consentDate` on the `staff_tax_details` table. All the data in the column will be lost.
  - You are about to drop the column `electronic1099Consent` on the `staff_tax_details` table. All the data in the column will be lost.
  - You are about to drop the column `identificationBackUrl` on the `staff_tax_details` table. All the data in the column will be lost.
  - You are about to drop the column `identificationFrontUrl` on the `staff_tax_details` table. All the data in the column will be lost.
  - You are about to drop the column `trackFor1099` on the `staff_tax_details` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TaxFilledBy" AS ENUM ('TALENT', 'STAFF');

-- AlterEnum
BEGIN;
CREATE TYPE "BusinessStructure_new" AS ENUM ('INDIVIDUAL', 'LLC', 'C_CORPORATION', 'S_CORPORATION', 'PARTNERSHIP', 'TRUST_ESTATE', 'OTHER');
ALTER TABLE "public"."staff_tax_details" ALTER COLUMN "businessStructure" DROP DEFAULT;
ALTER TABLE "staff_tax_details" ALTER COLUMN "businessStructure" TYPE "BusinessStructure_new" USING ("businessStructure"::text::"BusinessStructure_new");
ALTER TYPE "BusinessStructure" RENAME TO "BusinessStructure_old";
ALTER TYPE "BusinessStructure_new" RENAME TO "BusinessStructure";
DROP TYPE "public"."BusinessStructure_old";
ALTER TABLE "staff_tax_details" ALTER COLUMN "businessStructure" SET DEFAULT 'INDIVIDUAL';
COMMIT;

-- AlterTable
ALTER TABLE "staff_tax_details" DROP COLUMN "collectTaxDetails",
DROP COLUMN "consentDate",
DROP COLUMN "electronic1099Consent",
DROP COLUMN "identificationBackUrl",
DROP COLUMN "identificationFrontUrl",
DROP COLUMN "trackFor1099",
ADD COLUMN     "accountNumbers" TEXT,
ADD COLUMN     "certificationDate" TIMESTAMP(6),
ADD COLUMN     "exemptPayeeCode" TEXT,
ADD COLUMN     "fatcaExemptionCode" TEXT,
ADD COLUMN     "llcClassification" TEXT,
ADD COLUMN     "taxAddress" TEXT,
ADD COLUMN     "taxCity" TEXT,
ADD COLUMN     "taxFilledBy" "TaxFilledBy" NOT NULL DEFAULT 'TALENT',
ADD COLUMN     "taxName" TEXT,
ADD COLUMN     "taxState" TEXT,
ADD COLUMN     "taxZip" TEXT;
