-- CreateTable
CREATE TABLE "GamePersonalBest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "lastScore" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "bestRoundsCompleted" INTEGER NOT NULL DEFAULT 0,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "firstPlayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPlayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "GamePersonalBest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GamePersonalBest_studentId_gameKey_key" ON "GamePersonalBest"("studentId", "gameKey");

-- CreateIndex
CREATE INDEX "GamePersonalBest_studentId_idx" ON "GamePersonalBest"("studentId");

-- AddForeignKey
ALTER TABLE "GamePersonalBest" ADD CONSTRAINT "GamePersonalBest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
