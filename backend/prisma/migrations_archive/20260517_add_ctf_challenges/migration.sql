-- CTF Challenges 2.0 — attempts, solves, teams, team members.
-- Challenge content itself lives in code; only state is persisted.
-- Idempotent: re-runnable on any env (CREATE IF NOT EXISTS + FK guards).

-- ─── PathwayCtfAttempt ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PathwayCtfAttempt" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "challengeSlug" TEXT NOT NULL,
  "submittedFlag" TEXT NOT NULL,
  "isCorrect"     BOOLEAN NOT NULL DEFAULT false,
  "hintsUsed"     INTEGER NOT NULL DEFAULT 0,
  "timeSpentSec"  INTEGER NOT NULL DEFAULT 0,
  "teamId"        TEXT,
  "submittedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PathwayCtfAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PathwayCtfAttempt_userId_challengeSlug_idx"
  ON "PathwayCtfAttempt"("userId", "challengeSlug");
CREATE INDEX IF NOT EXISTS "PathwayCtfAttempt_userId_isCorrect_idx"
  ON "PathwayCtfAttempt"("userId", "isCorrect");
CREATE INDEX IF NOT EXISTS "PathwayCtfAttempt_teamId_challengeSlug_idx"
  ON "PathwayCtfAttempt"("teamId", "challengeSlug");

-- ─── PathwayCtfSolve (one row per first correct solve) ────────────────────
CREATE TABLE IF NOT EXISTS "PathwayCtfSolve" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "challengeSlug" TEXT NOT NULL,
  "category"      TEXT NOT NULL,
  "difficulty"    TEXT NOT NULL,
  "solvedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "hintsUsed"     INTEGER NOT NULL DEFAULT 0,
  "totalAttempts" INTEGER NOT NULL DEFAULT 1,
  "teamId"        TEXT,

  CONSTRAINT "PathwayCtfSolve_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayCtfSolve_userId_challengeSlug_key"
  ON "PathwayCtfSolve"("userId", "challengeSlug");
CREATE INDEX IF NOT EXISTS "PathwayCtfSolve_userId_solvedAt_idx"
  ON "PathwayCtfSolve"("userId", "solvedAt");
CREATE INDEX IF NOT EXISTS "PathwayCtfSolve_category_idx"
  ON "PathwayCtfSolve"("category");

-- ─── PathwayCtfTeam ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PathwayCtfTeam" (
  "id"         TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "cohortId"   TEXT,
  "inviteCode" TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PathwayCtfTeam_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayCtfTeam_inviteCode_key"
  ON "PathwayCtfTeam"("inviteCode");

-- ─── PathwayCtfTeamMember ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PathwayCtfTeamMember" (
  "id"       TEXT NOT NULL,
  "teamId"   TEXT NOT NULL,
  "userId"   TEXT NOT NULL,
  "role"     TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PathwayCtfTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayCtfTeamMember_teamId_userId_key"
  ON "PathwayCtfTeamMember"("teamId", "userId");

-- ─── Foreign keys (wrapped so re-running is safe) ──────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayCtfAttempt_userId_fkey') THEN
    ALTER TABLE "PathwayCtfAttempt"
      ADD CONSTRAINT "PathwayCtfAttempt_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayCtfAttempt_teamId_fkey') THEN
    ALTER TABLE "PathwayCtfAttempt"
      ADD CONSTRAINT "PathwayCtfAttempt_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "PathwayCtfTeam"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayCtfSolve_userId_fkey') THEN
    ALTER TABLE "PathwayCtfSolve"
      ADD CONSTRAINT "PathwayCtfSolve_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayCtfSolve_teamId_fkey') THEN
    ALTER TABLE "PathwayCtfSolve"
      ADD CONSTRAINT "PathwayCtfSolve_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "PathwayCtfTeam"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayCtfTeam_cohortId_fkey') THEN
    ALTER TABLE "PathwayCtfTeam"
      ADD CONSTRAINT "PathwayCtfTeam_cohortId_fkey"
      FOREIGN KEY ("cohortId") REFERENCES "PathwayCohort"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayCtfTeamMember_teamId_fkey') THEN
    ALTER TABLE "PathwayCtfTeamMember"
      ADD CONSTRAINT "PathwayCtfTeamMember_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "PathwayCtfTeam"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayCtfTeamMember_userId_fkey') THEN
    ALTER TABLE "PathwayCtfTeamMember"
      ADD CONSTRAINT "PathwayCtfTeamMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
