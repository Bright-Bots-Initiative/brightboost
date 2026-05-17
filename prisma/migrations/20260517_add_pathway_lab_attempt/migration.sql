-- PathwayLabAttempt — records of student attempts at sandbox labs
-- (Password Strength Lab, Phishing Showdown, etc.). Independent of
-- PathwayMilestone so labs can live outside any module and a student
-- can re-attempt the same lab any number of times. `output` holds the
-- portfolio artifact JSON (e.g., Red Flag Field Guide, personal password
-- policy). Idempotent so it is safe to re-run on any environment.

CREATE TABLE IF NOT EXISTS "PathwayLabAttempt" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "labSlug"     TEXT NOT NULL,
  "mode"        TEXT,
  "score"       INTEGER NOT NULL DEFAULT 0,
  "hintsUsed"   INTEGER NOT NULL DEFAULT 0,
  "output"      JSONB,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PathwayLabAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PathwayLabAttempt_userId_labSlug_idx"
  ON "PathwayLabAttempt"("userId", "labSlug");

CREATE INDEX IF NOT EXISTS "PathwayLabAttempt_userId_idx"
  ON "PathwayLabAttempt"("userId");

-- Foreign key wrapped in DO block so re-running is safe (Postgres
-- doesn't support IF NOT EXISTS on ADD CONSTRAINT until v18).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PathwayLabAttempt_userId_fkey'
  ) THEN
    ALTER TABLE "PathwayLabAttempt"
      ADD CONSTRAINT "PathwayLabAttempt_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
