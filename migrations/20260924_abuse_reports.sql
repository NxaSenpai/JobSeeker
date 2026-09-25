-- User-submitted reports and the admin review queue. Polymorphic targets are
-- intentionally not foreign-keyed so report history survives target removal.
BEGIN;

CREATE TABLE IF NOT EXISTS "abuse_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reporterUserId" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "subjectType" varchar(20) NOT NULL,
  "subjectId" varchar(100) NOT NULL,
  "category" varchar(40) NOT NULL,
  "description" text NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'OPEN',
  "reviewedByUserId" uuid REFERENCES "users"("id") ON DELETE RESTRICT,
  "reviewedAt" timestamptz,
  "resolutionNote" varchar(500),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CHK_abuse_reports_subject_type"
    CHECK ("subjectType" IN ('JOB', 'COMPANY', 'USER')),
  CONSTRAINT "CHK_abuse_reports_category"
    CHECK ("category" IN ('SCAM', 'HARASSMENT', 'FALSE_INFORMATION', 'INAPPROPRIATE', 'EXPIRED_OR_FILLED', 'OTHER')),
  CONSTRAINT "CHK_abuse_reports_status"
    CHECK ("status" IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED')),
  CONSTRAINT "CHK_abuse_reports_description"
    CHECK (char_length(btrim("description")) BETWEEN 20 AND 3000),
  CONSTRAINT "CHK_abuse_reports_not_self"
    CHECK ("subjectType" <> 'USER' OR lower("subjectId") <> lower("reporterUserId"::text)),
  CONSTRAINT "CHK_abuse_reports_review_state"
    CHECK (("status" = 'OPEN' AND "reviewedByUserId" IS NULL AND "reviewedAt" IS NULL AND "resolutionNote" IS NULL)
      OR ("status" = 'IN_REVIEW' AND "reviewedByUserId" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "resolutionNote" IS NULL)
      OR ("status" IN ('RESOLVED', 'DISMISSED') AND "reviewedByUserId" IS NOT NULL AND "reviewedAt" IS NOT NULL AND char_length(btrim("resolutionNote")) BETWEEN 3 AND 500))
);

CREATE INDEX IF NOT EXISTS "IDX_abuse_reports_status_createdAt"
  ON "abuse_reports" ("status", "createdAt" ASC);
CREATE INDEX IF NOT EXISTS "IDX_abuse_reports_reporter_createdAt"
  ON "abuse_reports" ("reporterUserId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "IDX_abuse_reports_subject"
  ON "abuse_reports" ("subjectType", "subjectId");
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_abuse_reports_active_reporter_subject"
  ON "abuse_reports" ("reporterUserId", "subjectType", "subjectId")
  WHERE "status" IN ('OPEN', 'IN_REVIEW');

COMMIT;

