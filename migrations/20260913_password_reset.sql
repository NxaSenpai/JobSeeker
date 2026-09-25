-- Apply to the application's PostgreSQL database before a production deployment.
-- Password reset tokens are stored as hashes and are deleted after use.
BEGIN;

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "tokenHash" varchar NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_password_reset_tokens_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("userId")
    REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_password_reset_tokens_userId"
  ON "password_reset_tokens" ("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_password_reset_tokens_tokenHash"
  ON "password_reset_tokens" ("tokenHash");

COMMIT;
