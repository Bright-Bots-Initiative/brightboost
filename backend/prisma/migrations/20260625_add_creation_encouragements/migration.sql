-- Phase 0 — Creation.encouragements: adult-only, text-free "give a boost" count
-- on a kid's creation in the group gallery. No kid-to-kid reactions (Phase 2).
--
-- Idempotent (ADD COLUMN IF NOT EXISTS) so it is safe to re-run on any environment.

ALTER TABLE "Creation"
  ADD COLUMN IF NOT EXISTS "encouragements" INTEGER NOT NULL DEFAULT 0;
