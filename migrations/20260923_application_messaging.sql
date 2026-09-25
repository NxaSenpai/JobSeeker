-- Private candidate/company conversation threads tied to submitted applications.
BEGIN;

CREATE TABLE IF NOT EXISTS "application_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "applicationId" uuid NOT NULL,
  "senderUserId" uuid NOT NULL,
  "recipientUserId" uuid NOT NULL,
  "body" text NOT NULL,
  "readAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "FK_application_messages_application"
    FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_application_messages_sender"
    FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_application_messages_recipient"
    FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "CHK_application_messages_body"
    CHECK (length(btrim("body")) BETWEEN 1 AND 5000),
  CONSTRAINT "CHK_application_messages_participants"
    CHECK ("senderUserId" <> "recipientUserId")
);

CREATE INDEX IF NOT EXISTS "IDX_application_messages_thread_created"
  ON "application_messages" ("applicationId", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "IDX_application_messages_sender_created"
  ON "application_messages" ("applicationId", "senderUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "IDX_application_messages_recipient_read"
  ON "application_messages" ("applicationId", "recipientUserId", "readAt");

COMMIT;
