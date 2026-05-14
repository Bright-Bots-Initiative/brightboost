-- PathwayCohort lifecycle fields introduced in PR #580. The schema files were
-- updated but no migration was generated, leaving production missing the
-- columns the new facilitator queries select on. Idempotent so it is safe to
-- re-run on any environment where some columns may already exist.

ALTER TABLE "PathwayCohort" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "PathwayCohort" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "PathwayCohort" ADD COLUMN IF NOT EXISTS "maxEnrollment" INTEGER DEFAULT 25;
ALTER TABLE "PathwayCohort" ADD COLUMN IF NOT EXISTS "notes" JSONB;
ALTER TABLE "PathwayCohort" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "PathwayCohort_status_idx" ON "PathwayCohort"("status");
