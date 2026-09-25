-- Store the job seeker's skills, technologies, and spoken languages on the profile.
BEGIN;

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "skills" jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
