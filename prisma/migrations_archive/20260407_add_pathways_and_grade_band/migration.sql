-- Add grade band and pathways fields to User and Course

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "userType" TEXT DEFAULT 'k8';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ageBand" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "birthYear" INTEGER;

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "gradeBand" TEXT DEFAULT 'k2';

-- Module Families & Variants

CREATE TABLE IF NOT EXISTS "ModuleFamily" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "iconEmoji" TEXT NOT NULL DEFAULT '🔬',
    CONSTRAINT "ModuleFamily_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ModuleFamily_key_key" ON "ModuleFamily"("key");

CREATE TABLE IF NOT EXISTS "ModuleVariant" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "band" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "moduleSlug" TEXT,
    "contentConfig" JSONB,
    CONSTRAINT "ModuleVariant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ModuleVariant_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "ModuleFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ModuleVariant_familyId_band_version_key" ON "ModuleVariant"("familyId", "band", "version");
CREATE INDEX IF NOT EXISTS "ModuleVariant_band_idx" ON "ModuleVariant"("band");
CREATE INDEX IF NOT EXISTS "ModuleVariant_familyId_idx" ON "ModuleVariant"("familyId");

CREATE TABLE IF NOT EXISTS "ClassModuleAssignment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "moduleVariantId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "dueAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassModuleAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClassModuleAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassModuleAssignment_moduleVariantId_fkey" FOREIGN KEY ("moduleVariantId") REFERENCES "ModuleVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ClassModuleAssignment_courseId_moduleVariantId_key" ON "ClassModuleAssignment"("courseId", "moduleVariantId");
CREATE INDEX IF NOT EXISTS "ClassModuleAssignment_courseId_idx" ON "ClassModuleAssignment"("courseId");

-- Pathways models

CREATE TABLE IF NOT EXISTS "PathwayCohort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "band" TEXT NOT NULL,
    "sitePartner" TEXT,
    "facilitatorId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "trackIds" TEXT[],
    "joinCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PathwayCohort_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PathwayCohort_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PathwayCohort_joinCode_key" ON "PathwayCohort"("joinCode");
CREATE INDEX IF NOT EXISTS "PathwayCohort_facilitatorId_idx" ON "PathwayCohort"("facilitatorId");

CREATE TABLE IF NOT EXISTS "PathwayEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT "PathwayEnrollment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PathwayEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PathwayEnrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "PathwayCohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PathwayEnrollment_userId_cohortId_key" ON "PathwayEnrollment"("userId", "cohortId");
CREATE INDEX IF NOT EXISTS "PathwayEnrollment_cohortId_idx" ON "PathwayEnrollment"("cohortId");

CREATE TABLE IF NOT EXISTS "PathwayMilestone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackSlug" TEXT NOT NULL,
    "moduleSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "score" INTEGER,
    "completedAt" TIMESTAMP(3),
    "artifacts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PathwayMilestone_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PathwayMilestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PathwayMilestone_userId_trackSlug_moduleSlug_key" ON "PathwayMilestone"("userId", "trackSlug", "moduleSlug");
CREATE INDEX IF NOT EXISTS "PathwayMilestone_userId_idx" ON "PathwayMilestone"("userId");
