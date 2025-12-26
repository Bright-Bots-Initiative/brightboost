-- CreateIndex
CREATE INDEX "UnlockedAbility_abilityId_idx" ON "UnlockedAbility"("abilityId");

-- CreateIndex
CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");

-- CreateIndex
CREATE INDEX "Unit_moduleId_idx" ON "Unit"("moduleId");

-- CreateIndex
CREATE INDEX "Lesson_unitId_idx" ON "Lesson"("unitId");

-- CreateIndex
CREATE INDEX "Activity_unitId_idx" ON "Activity"("unitId");

-- CreateIndex
CREATE INDEX "Match_player1Id_idx" ON "Match"("player1Id");

-- CreateIndex
CREATE INDEX "Match_player2Id_idx" ON "Match"("player2Id");

-- CreateIndex
CREATE INDEX "MatchTurn_matchId_idx" ON "MatchTurn"("matchId");
