-- Candidate-visible interview scheduling linked to submitted applications.
BEGIN;

CREATE TABLE IF NOT EXISTS "interviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "applicationId" uuid NOT NULL,
  "createdByUserId" uuid,
  "scheduledAt" timestamptz NOT NULL,
  "type" varchar(20) NOT NULL,
  "location" varchar(500),
  "meetingUrl" varchar(2048),
  "notes" text NOT NULL DEFAULT '',
  "status" varchar(20) NOT NULL DEFAULT 'SCHEDULED',
  "cancelledAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "FK_interviews_application"
    FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_interviews_creator"
    FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "CHK_interviews_type"
    CHECK ("type" IN ('ONLINE', 'ONSITE', 'PHONE')),
  CONSTRAINT "CHK_interviews_status"
    CHECK ("status" IN ('SCHEDULED', 'CANCELLED')),
  CONSTRAINT "CHK_interviews_location"
    CHECK ("type" <> 'ONSITE' OR NULLIF(btrim("location"), '') IS NOT NULL),
  CONSTRAINT "CHK_interviews_meeting_url"
    CHECK ("type" <> 'ONLINE' OR NULLIF(btrim("meetingUrl"), '') IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "IDX_interviews_application_scheduled"
  ON "interviews" ("applicationId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "IDX_interviews_scheduledAt"
  ON "interviews" ("scheduledAt");

COMMIT;
