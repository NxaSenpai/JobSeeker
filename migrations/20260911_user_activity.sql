-- Apply to the application's PostgreSQL database before a production deployment.
-- Additive only: existing accounts and verification tokens are preserved.
BEGIN;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "headline" varchar(160),
  ADD COLUMN IF NOT EXISTS "location" varchar(160),
  ADD COLUMN IF NOT EXISTS "bio" text;

CREATE TABLE IF NOT EXISTS "saved_jobs" (
  "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "jobId" varchar(100) NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("userId", "jobId")
);

CREATE TABLE IF NOT EXISTS "application_drafts" (
  "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "jobId" varchar(100) NOT NULL,
  "coverLetter" text NOT NULL DEFAULT '',
  "resumeUrl" varchar(2048) NOT NULL DEFAULT '',
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("userId", "jobId")
);

COMMIT;
