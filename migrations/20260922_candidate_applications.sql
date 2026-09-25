-- Additive migration. Run after the 20260913 profile/resume migrations.
-- Demo jobs are deliberately not inserted here; use SEED_DEMO_JOBS=true locally.
BEGIN;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "education" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "experience" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "languages" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "avatarKey" varchar(100);
ALTER TABLE "application_drafts" ADD COLUMN IF NOT EXISTS "resumeId" uuid;
ALTER TABLE "application_drafts" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';
ALTER TABLE "application_drafts" ADD COLUMN IF NOT EXISTS "phone" varchar(40) NOT NULL DEFAULT '';
ALTER TABLE "application_drafts" ADD COLUMN IF NOT EXISTS "portfolioUrl" varchar(2048) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "jobs" (
  "id" varchar(100) PRIMARY KEY,
  "title" varchar(200) NOT NULL,
  "company" varchar(200) NOT NULL,
  "location" varchar(200) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'PUBLISHED',
  "deadline" timestamptz,
  "isDemo" boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS "applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "jobId" varchar(100) NOT NULL REFERENCES "jobs"("id") ON DELETE RESTRICT,
  "resumeId" uuid NOT NULL REFERENCES "resumes"("id") ON DELETE RESTRICT,
  "status" varchar(30) NOT NULL DEFAULT 'APPLIED',
  "description" text NOT NULL,
  "coverLetter" text NOT NULL DEFAULT '',
  "phone" varchar(40) NOT NULL DEFAULT '',
  "portfolioUrl" varchar(2048) NOT NULL DEFAULT '',
  "candidate" jsonb NOT NULL,
  "history" jsonb NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_applications_user_job" ON "applications" ("userId", "jobId");
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(240) NOT NULL,
  "message" text NOT NULL,
  "link" varchar(200) NOT NULL,
  "readAt" timestamptz,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_notifications_user" ON "notifications" ("userId");
COMMIT;
