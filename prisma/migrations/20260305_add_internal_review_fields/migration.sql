-- CreateEnum
CREATE TYPE "InternalReviewRating" AS ENUM ('MET_EXPECTATIONS', 'NEEDS_IMPROVEMENT', 'DID_NOT_MEET', 'NO_CALL_NO_SHOW');

-- AlterTable
ALTER TABLE "call_time_invitations" ADD COLUMN "internalReviewRating" "InternalReviewRating",
ADD COLUMN "internalReviewNotes" TEXT,
ADD COLUMN "reviewedBy" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(6);

-- AddForeignKey
ALTER TABLE "call_time_invitations" ADD CONSTRAINT "call_time_invitations_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
