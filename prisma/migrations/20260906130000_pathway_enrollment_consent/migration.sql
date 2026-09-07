-- AlterTable
ALTER TABLE "PathwayEnrollment" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "invitedById" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'legacy';

-- AlterTable
ALTER TABLE "PathwayMilestone" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "PathwayInvite" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PathwayInvite_email_status_idx" ON "PathwayInvite"("email", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayInvite_cohortId_email_key" ON "PathwayInvite"("cohortId", "email");

-- CreateIndex
CREATE INDEX "PathwayEnrollment_userId_idx" ON "PathwayEnrollment"("userId");

-- AddForeignKey
ALTER TABLE "PathwayInvite" ADD CONSTRAINT "PathwayInvite_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "PathwayCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayInvite" ADD CONSTRAINT "PathwayInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

