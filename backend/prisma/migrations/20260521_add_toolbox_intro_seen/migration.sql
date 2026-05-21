-- Phase 2.2 — track whether each student has seen the CTF toolbox intro
-- screen. Idempotent: ALTER TABLE ADD COLUMN IF NOT EXISTS skips if the
-- column already exists, so re-running on any environment is safe.

ALTER TABLE "PathwayOnboarding"
  ADD COLUMN IF NOT EXISTS "toolboxIntroSeen" BOOLEAN NOT NULL DEFAULT false;
