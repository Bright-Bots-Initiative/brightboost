-- Performance indexes. Same fresh-DB / production-already-applied
-- situation as 20240523000000_add_foreign_key_indexes — see that file
-- for the full rationale. Pattern: skip on missing table, idempotent on
-- existing table. End state identical on production.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'UnlockedAbility') THEN
    CREATE INDEX IF NOT EXISTS "UnlockedAbility_abilityId_idx" ON "UnlockedAbility"("abilityId");
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'UserBadge') THEN
    CREATE INDEX IF NOT EXISTS "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Unit') THEN
    CREATE INDEX IF NOT EXISTS "Unit_moduleId_idx" ON "Unit"("moduleId");
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Lesson') THEN
    CREATE INDEX IF NOT EXISTS "Lesson_unitId_idx" ON "Lesson"("unitId");
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Activity') THEN
    CREATE INDEX IF NOT EXISTS "Activity_unitId_idx" ON "Activity"("unitId");
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Match') THEN
    CREATE INDEX IF NOT EXISTS "Match_player1Id_idx" ON "Match"("player1Id");
    CREATE INDEX IF NOT EXISTS "Match_player2Id_idx" ON "Match"("player2Id");
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'MatchTurn') THEN
    CREATE INDEX IF NOT EXISTS "MatchTurn_matchId_idx" ON "MatchTurn"("matchId");
  END IF;
END
$$;
