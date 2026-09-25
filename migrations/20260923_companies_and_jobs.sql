-- Additive company/job foundation. Existing job IDs and application/saved-job
-- references are preserved; the existing jobs.company value remains a display
-- snapshot for demo and historical records.
BEGIN;

CREATE TABLE IF NOT EXISTS "companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerUserId" uuid,
  "name" varchar(180) NOT NULL,
  "slug" varchar(200) NOT NULL,
  "industry" varchar(120),
  "companySize" varchar(60),
  "foundedYear" smallint,
  "location" varchar(180),
  "website" varchar(2048),
  "description" text,
  "contactEmail" varchar(320),
  "timezone" varchar(80),
  "socialLinks" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "logoUrl" varchar(2048),
  "bannerUrl" varchar(2048),
  "isVerified" boolean NOT NULL DEFAULT false,
  "isDemo" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "FK_companies_owner" FOREIGN KEY ("ownerUserId")
    REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_companies_ownerUserId"
  ON "companies" ("ownerUserId") WHERE "ownerUserId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_companies_slug"
  ON "companies" ("slug");
CREATE INDEX IF NOT EXISTS "IDX_companies_industry"
  ON "companies" ("industry");

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorUserId" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "action" varchar(100) NOT NULL,
  "subjectType" varchar(80) NOT NULL,
  "subjectId" varchar(100) NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_audit_logs_createdAt"
  ON "audit_logs" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "IDX_audit_logs_subject"
  ON "audit_logs" ("subjectType", "subjectId");

-- Existing COMPANY accounts receive an editable profile without changing their
-- sign-in identity or exposing the account email as a public contact address.
INSERT INTO "companies" (
  "id", "ownerUserId", "name", "slug", "isVerified", "isDemo"
)
SELECT
  u."id",
  u."id",
  COALESCE(NULLIF(trim(u."companyName"), ''), 'Company'),
  trim(both '-' from regexp_replace(
    lower(COALESCE(NULLIF(trim(u."companyName"), ''), 'company')),
    '[^a-z0-9]+', '-', 'g'
  )) || '-' || substring(u."id"::text from 1 for 8),
  false,
  false
FROM "users" u
WHERE u."role" = 'COMPANY'
ON CONFLICT ("ownerUserId") WHERE "ownerUserId" IS NOT NULL DO NOTHING;

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "companyId" uuid;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "team" varchar(120);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "country" varchar(100);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "city" varchar(100);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "address" varchar(240);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "category" varchar(120);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "industry" varchar(120);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "jobType" varchar(30) NOT NULL DEFAULT 'FULL_TIME';
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "workplaceType" varchar(20) NOT NULL DEFAULT 'ONSITE';
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "summary" varchar(500) NOT NULL DEFAULT '';
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "responsibilities" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "requirements" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "benefits" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "skills" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "salaryMin" numeric(12,2);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "salaryMax" numeric(12,2);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "currency" char(3) NOT NULL DEFAULT 'USD';
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "salaryPeriod" varchar(20) NOT NULL DEFAULT 'YEAR';
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "experienceLevel" varchar(30);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "minExperienceYears" smallint;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "educationLevel" varchar(100);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "vacancies" smallint NOT NULL DEFAULT 1;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "isFeatured" boolean NOT NULL DEFAULT false;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "publishedAt" timestamptz;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT now();
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT now();

UPDATE "jobs"
SET "publishedAt" = COALESCE("publishedAt", now())
WHERE "status" = 'PUBLISHED' AND "publishedAt" IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_jobs_company') THEN
    ALTER TABLE "jobs" ADD CONSTRAINT "FK_jobs_company"
      FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_jobs_status') THEN
    ALTER TABLE "jobs" ADD CONSTRAINT "CHK_jobs_status"
      CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_companies_owner') THEN
    ALTER TABLE "companies" ADD CONSTRAINT "CHK_companies_owner"
      CHECK ("isDemo" = true OR "ownerUserId" IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_jobs_company_owner') THEN
    ALTER TABLE "jobs" ADD CONSTRAINT "CHK_jobs_company_owner"
      CHECK ("isDemo" = true OR "companyId" IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_jobs_type') THEN
    ALTER TABLE "jobs" ADD CONSTRAINT "CHK_jobs_type"
      CHECK ("jobType" IN ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'TEMPORARY', 'FREELANCE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_jobs_workplace') THEN
    ALTER TABLE "jobs" ADD CONSTRAINT "CHK_jobs_workplace"
      CHECK ("workplaceType" IN ('REMOTE', 'ONSITE', 'HYBRID'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_jobs_salary_range') THEN
    ALTER TABLE "jobs" ADD CONSTRAINT "CHK_jobs_salary_range"
      CHECK ("salaryMin" IS NULL OR "salaryMax" IS NULL OR "salaryMax" >= "salaryMin");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_jobs_vacancies') THEN
    ALTER TABLE "jobs" ADD CONSTRAINT "CHK_jobs_vacancies"
      CHECK ("vacancies" >= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_jobs_experience') THEN
    ALTER TABLE "jobs" ADD CONSTRAINT "CHK_jobs_experience"
      CHECK ("minExperienceYears" IS NULL OR "minExperienceYears" >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_jobs_status_createdAt"
  ON "jobs" ("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "IDX_jobs_company_status"
  ON "jobs" ("companyId", "status");
CREATE INDEX IF NOT EXISTS "IDX_jobs_category"
  ON "jobs" ("category");
CREATE INDEX IF NOT EXISTS "IDX_jobs_industry"
  ON "jobs" ("industry");
CREATE INDEX IF NOT EXISTS "IDX_jobs_location"
  ON "jobs" ("location");
CREATE INDEX IF NOT EXISTS "IDX_jobs_skills_gin"
  ON "jobs" USING gin ("skills");

COMMIT;
