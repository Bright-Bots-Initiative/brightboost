-- Phase 0 — Course.kind: distinguishes a teacher class ("class") from a parent
-- home group ("home"). A parent reuses the teacher role; their group is a Course
-- with kind = 'home'. Kept as a plain string default so it is fully reversible
-- and can later be backfilled into a real parent role if desired.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS) so it is safe to re-run on any environment.

ALTER TABLE "Course"
  ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'class';
