-- Phase 0 — Creation model: kid-authored, group-scoped creations.
--
-- A Creation is a child-made artifact scoped to a single group (Course — a
-- class or a home group). It is the foundation for the authorable Data Dash
-- challenge (content = challenge config) and the group gallery. Visibility is
-- group-scoped only; `SHARED` is the kid-initiated "viewable while still in
-- progress" state.
--
-- Idempotent (guarded CREATE TYPE / CREATE TABLE IF NOT EXISTS / DO-blocked
-- constraints) so it is safe to re-run on any environment.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreationStatus') THEN
    CREATE TYPE "CreationStatus" AS ENUM ('IN_PROGRESS', 'SHARED', 'COMPLETE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Creation" (
  "id"        TEXT NOT NULL,
  "authorId"  TEXT NOT NULL,
  "courseId"  TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "title"     TEXT,
  "content"   JSONB NOT NULL,
  "status"    "CreationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Creation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Creation_courseId_status_idx"
  ON "Creation"("courseId", "status");

CREATE INDEX IF NOT EXISTS "Creation_authorId_idx"
  ON "Creation"("authorId");

-- Foreign keys wrapped in DO blocks so re-running is safe (Postgres doesn't
-- support IF NOT EXISTS on ADD CONSTRAINT until v18).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Creation_authorId_fkey'
  ) THEN
    ALTER TABLE "Creation"
      ADD CONSTRAINT "Creation_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Creation_courseId_fkey'
  ) THEN
    ALTER TABLE "Creation"
      ADD CONSTRAINT "Creation_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
