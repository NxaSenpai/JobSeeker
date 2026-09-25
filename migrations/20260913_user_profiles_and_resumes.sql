-- Apply to PostgreSQL before deploying profile and resume endpoints.
-- Existing USER account details are copied into their one-to-one profile.
BEGIN;

CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "firstName" varchar(100) NOT NULL DEFAULT '',
  "lastName" varchar(100) NOT NULL DEFAULT '',
  "headline" varchar(160),
  "bio" text,
  "phone" varchar(40),
  "profileImageUrl" varchar(2048),
  "dateOfBirth" date,
  "location" varchar(160),
  "websiteUrl" varchar(2048),
  "linkedinUrl" varchar(2048),
  "githubUrl" varchar(2048),
  "isOpenToWork" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_user_profiles_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_user_profiles_userId" UNIQUE ("userId"),
  CONSTRAINT "FK_user_profiles_user" FOREIGN KEY ("userId")
    REFERENCES "users"("id") ON DELETE CASCADE
);

INSERT INTO "user_profiles" (
  "id", "userId", "firstName", "lastName", "headline", "bio", "location"
)
SELECT
  "id", "id", COALESCE("firstName", ''), COALESCE("lastName", ''),
  "headline", "bio", "location"
FROM "users"
WHERE "role" = 'USER'
ON CONFLICT ("userId") DO NOTHING;

CREATE TABLE IF NOT EXISTS "resumes" (
  "id" uuid NOT NULL,
  "profileId" uuid NOT NULL,
  "fileName" varchar(255) NOT NULL,
  "storageKey" varchar(100) NOT NULL,
  "mimeType" varchar(100) NOT NULL,
  "fileSize" integer NOT NULL,
  "isDefault" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_resumes_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_resumes_storageKey" UNIQUE ("storageKey"),
  CONSTRAINT "FK_resumes_profile" FOREIGN KEY ("profileId")
    REFERENCES "user_profiles"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_resumes_profileId"
  ON "resumes" ("profileId");

COMMIT;
