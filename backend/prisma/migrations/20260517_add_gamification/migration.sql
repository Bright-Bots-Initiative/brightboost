-- Gamification 1.5 — XP events, cached per-user state, badges, daily goals.
-- All four tables are additive; no existing rows are touched. Idempotent so
-- re-running on any environment is safe (uses CREATE IF NOT EXISTS / DO
-- blocks for constraints).

-- ─── PathwayXpEvent ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PathwayXpEvent" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "amount"      INTEGER NOT NULL,
  "source"      TEXT NOT NULL,
  "sourceRefId" TEXT,
  "metadata"    JSONB,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PathwayXpEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PathwayXpEvent_userId_createdAt_idx"
  ON "PathwayXpEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "PathwayXpEvent_userId_source_idx"
  ON "PathwayXpEvent"("userId", "source");
CREATE INDEX IF NOT EXISTS "PathwayXpEvent_userId_source_sourceRefId_idx"
  ON "PathwayXpEvent"("userId", "source", "sourceRefId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayXpEvent_userId_fkey') THEN
    ALTER TABLE "PathwayXpEvent"
      ADD CONSTRAINT "PathwayXpEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── PathwayGamification (cached state, one row per user) ──────────────────
CREATE TABLE IF NOT EXISTS "PathwayGamification" (
  "userId"                    TEXT NOT NULL,
  "totalXp"                   INTEGER NOT NULL DEFAULT 0,
  "currentLevel"              INTEGER NOT NULL DEFAULT 1,
  "currentStreak"             INTEGER NOT NULL DEFAULT 0,
  "longestStreak"             INTEGER NOT NULL DEFAULT 0,
  "lastActiveDate"            TIMESTAMP(3),
  "streakFreezesAvailable"    INTEGER NOT NULL DEFAULT 1,
  "streakFreezesUsedThisWeek" INTEGER NOT NULL DEFAULT 0,
  "lastFreezeRefresh"         TIMESTAMP(3),
  "updatedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PathwayGamification_pkey" PRIMARY KEY ("userId")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayGamification_userId_fkey') THEN
    ALTER TABLE "PathwayGamification"
      ADD CONSTRAINT "PathwayGamification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── PathwayBadge ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PathwayBadge" (
  "id"       TEXT NOT NULL,
  "userId"   TEXT NOT NULL,
  "slug"     TEXT NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,

  CONSTRAINT "PathwayBadge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayBadge_userId_slug_key"
  ON "PathwayBadge"("userId", "slug");
CREATE INDEX IF NOT EXISTS "PathwayBadge_userId_earnedAt_idx"
  ON "PathwayBadge"("userId", "earnedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayBadge_userId_fkey') THEN
    ALTER TABLE "PathwayBadge"
      ADD CONSTRAINT "PathwayBadge_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── PathwayDailyGoal ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PathwayDailyGoal" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "date"         DATE NOT NULL,
  "goals"        JSONB NOT NULL,
  "allComplete"  BOOLEAN NOT NULL DEFAULT false,
  "bonusAwarded" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PathwayDailyGoal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayDailyGoal_userId_date_key"
  ON "PathwayDailyGoal"("userId", "date");
CREATE INDEX IF NOT EXISTS "PathwayDailyGoal_userId_date_idx"
  ON "PathwayDailyGoal"("userId", "date");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayDailyGoal_userId_fkey') THEN
    ALTER TABLE "PathwayDailyGoal"
      ADD CONSTRAINT "PathwayDailyGoal_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
