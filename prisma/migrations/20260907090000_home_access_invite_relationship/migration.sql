-- AlterTable
ALTER TABLE "HomeAccessInvite" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "enrollmentId" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "HomeAccessInvite_enrollmentId_idx" ON "HomeAccessInvite"("enrollmentId");

-- CreateIndex
CREATE INDEX "HomeAccessInvite_courseId_idx" ON "HomeAccessInvite"("courseId");

-- AddForeignKey
ALTER TABLE "HomeAccessInvite" ADD CONSTRAINT "HomeAccessInvite_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- #872 correction: invitations issued before relationship provenance existed
-- cannot prove which enrollment authorized them, so every unused one is
-- revoked here. The current class owner may issue a fresh invitation.
UPDATE "HomeAccessInvite"
SET "revokedAt" = NOW()
WHERE "usedAt" IS NULL
  AND "revokedAt" IS NULL
  AND "enrollmentId" IS NULL;
