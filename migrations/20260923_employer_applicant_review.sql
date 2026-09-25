-- Employer applicant review and company-private notes.
-- Status history stays on applications so candidate history remains compatible.
BEGIN;

CREATE TABLE IF NOT EXISTS "application_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "applicationId" uuid NOT NULL,
  "authorUserId" uuid,
  "body" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "FK_application_notes_application"
    FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_application_notes_author"
    FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "CHK_application_notes_body"
    CHECK (length(btrim("body")) BETWEEN 1 AND 5000)
);

CREATE INDEX IF NOT EXISTS "IDX_application_notes_application_created"
  ON "application_notes" ("applicationId", "createdAt", "id");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CHK_applications_status'
      AND conrelid = 'applications'::regclass
  ) THEN
    ALTER TABLE "applications" ADD CONSTRAINT "CHK_applications_status"
      CHECK ("status" IN (
        'APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW',
        'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN'
      ));
  END IF;
END $$;

COMMIT;
