-- CreateTable
CREATE TABLE "HomeAccessInvite" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "adultEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeAccessInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeAccessInvite_tokenHash_key" ON "HomeAccessInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "HomeAccessInvite_studentId_idx" ON "HomeAccessInvite"("studentId");

-- CreateIndex
CREATE INDEX "HomeAccessInvite_expiresAt_idx" ON "HomeAccessInvite"("expiresAt");

-- AddForeignKey
ALTER TABLE "HomeAccessInvite" ADD CONSTRAINT "HomeAccessInvite_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeAccessInvite" ADD CONSTRAINT "HomeAccessInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

