-- Add shiftEndedAt column to track when a talent has permanently ended their shift.
ALTER TABLE "call_time_invitations" ADD COLUMN "shiftEndedAt" TIMESTAMP(6);
