ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "hasSeenOnboarding" BOOLEAN NOT NULL DEFAULT false;
