-- Persist the stable external authentication subject independently from email.
ALTER TABLE "users"
ADD COLUMN "auth_subject" TEXT;

CREATE UNIQUE INDEX "users_auth_subject_key" ON "users"("auth_subject");

-- Email is profile data and may be absent for a valid authenticated identity.
ALTER TABLE "users"
ALTER COLUMN "email" DROP NOT NULL;
