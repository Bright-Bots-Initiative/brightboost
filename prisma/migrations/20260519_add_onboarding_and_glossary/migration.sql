-- Cyber Skills 101 onboarding + glossary term views (Phase 2.1).
-- Both tables are additive. Idempotent so re-running on any env is safe.

-- ─── PathwayOnboarding (one row per user) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "PathwayOnboarding" (
  "userId"            TEXT NOT NULL,
  "startedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"       TIMESTAMP(3),
  "avatarChosen"      BOOLEAN NOT NULL DEFAULT false,
  "skillsTourViewed"  BOOLEAN NOT NULL DEFAULT false,
  "skillsTourSkipped" BOOLEAN NOT NULL DEFAULT false,
  "missionStatement"  TEXT,
  "dailyGoalLevel"    TEXT,
  "avatarSlug"        TEXT,

  CONSTRAINT "PathwayOnboarding_pkey" PRIMARY KEY ("userId")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayOnboarding_userId_fkey') THEN
    ALTER TABLE "PathwayOnboarding"
      ADD CONSTRAINT "PathwayOnboarding_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── PathwayGlossaryView (first view per term per user) ────────────────────
CREATE TABLE IF NOT EXISTS "PathwayGlossaryView" (
  "id"       TEXT NOT NULL,
  "userId"   TEXT NOT NULL,
  "termSlug" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PathwayGlossaryView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayGlossaryView_userId_termSlug_key"
  ON "PathwayGlossaryView"("userId", "termSlug");
CREATE INDEX IF NOT EXISTS "PathwayGlossaryView_userId_idx"
  ON "PathwayGlossaryView"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayGlossaryView_userId_fkey') THEN
    ALTER TABLE "PathwayGlossaryView"
      ADD CONSTRAINT "PathwayGlossaryView_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
