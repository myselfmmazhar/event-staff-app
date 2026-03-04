-- AlterTable
ALTER TABLE "call_times" ADD COLUMN     "commissionAmount" DECIMAL(10,2),
ADD COLUMN     "commissionAmountType" "AmountType",
ADD COLUMN     "overtimeRate" DECIMAL(10,2),
ADD COLUMN     "overtimeRateType" "AmountType";
