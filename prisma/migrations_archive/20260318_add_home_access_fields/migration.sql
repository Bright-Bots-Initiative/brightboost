-- CreateEnum (safe: skip if already exists)
DO $$ BEGIN
  CREATE TYPE "AccountMode" AS ENUM ('CLASS_CODE_ONLY', 'EMAIL_ONLY', 'CLASS_CODE_PLUS_HOME_ACCESS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: make email and password nullable (safe: idempotent)
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable: add home access fields (safe: skip if already exists)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountMode" "AccountMode" NOT NULL DEFAULT 'CLASS_CODE_ONLY';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "homeAccessEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "managedByParent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "parentEmail" TEXT;
