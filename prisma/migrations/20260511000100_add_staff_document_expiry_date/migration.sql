-- Optional document expiry date on Staff. Captured on the Add/Edit Talent
-- Basic Info tab so an admin can record when a talent's submitted documents
-- (e.g. license, certification) expire. Stored separately from the JSON
-- documents column so it can be queried for upcoming-expiration reminders.

ALTER TABLE "staff"
  ADD COLUMN IF NOT EXISTS "documentExpiryDate" DATE;
