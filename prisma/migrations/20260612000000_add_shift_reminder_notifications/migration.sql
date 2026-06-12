-- AlterEnum
ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'SHIFT_REMINDER_48H';
ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'SHIFT_REMINDER_2H';

-- AlterTable: idempotency stamps so each reminder is sent at most once per invitation
ALTER TABLE "call_time_invitations" ADD COLUMN IF NOT EXISTS "reminder48hSentAt" TIMESTAMP(6);
ALTER TABLE "call_time_invitations" ADD COLUMN IF NOT EXISTS "reminder2hSentAt" TIMESTAMP(6);
