-- Add timezone preference for talent and client users
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(50);
