-- Admin account controls and reversible company/job moderation. Existing
-- accounts and listings are preserved and existing jobs remain approved.
BEGIN;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "suspendedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "suspensionReason" varchar(500),
  ADD COLUMN IF NOT EXISTS "sessionVersion" integer NOT NULL DEFAULT 0;

ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "suspendedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "suspensionReason" varchar(500),
  ADD COLUMN IF NOT EXISTS "moderationNote" text;

-- Existing public listings are grandfathered as approved. Newly created jobs
-- default to pending review, including edits to previously published jobs.
ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "moderationStatus" varchar(20) NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS "moderationNote" text;
ALTER TABLE "jobs"
  ALTER COLUMN "moderationStatus" SET DEFAULT 'PENDING';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CHK_jobs_moderation_status'
  ) THEN
    ALTER TABLE "jobs" ADD CONSTRAINT "CHK_jobs_moderation_status"
      CHECK ("moderationStatus" IN ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CHK_jobs_moderation_note'
  ) THEN
    ALTER TABLE "jobs" ADD CONSTRAINT "CHK_jobs_moderation_note"
      CHECK (("moderationStatus" IN ('REJECTED', 'HIDDEN') AND "moderationNote" IS NOT NULL)
        OR ("moderationStatus" IN ('PENDING', 'APPROVED') AND "moderationNote" IS NULL));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CHK_users_suspension_reason'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "CHK_users_suspension_reason"
      CHECK ("suspendedAt" IS NULL OR "suspensionReason" IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CHK_users_session_version'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "CHK_users_session_version"
      CHECK ("sessionVersion" >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CHK_companies_suspension_reason'
  ) THEN
    ALTER TABLE "companies" ADD CONSTRAINT "CHK_companies_suspension_reason"
      CHECK ("suspendedAt" IS NULL OR "suspensionReason" IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CHK_companies_moderation_note'
  ) THEN
    ALTER TABLE "companies" ADD CONSTRAINT "CHK_companies_moderation_note"
      CHECK ("isVerified" = false OR "moderationNote" IS NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_users_suspendedAt_createdAt"
  ON "users" ("suspendedAt", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "IDX_companies_suspendedAt_createdAt"
  ON "companies" ("suspendedAt", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "IDX_jobs_moderation_updatedAt"
  ON "jobs" ("moderationStatus", "updatedAt" DESC);

COMMIT;
