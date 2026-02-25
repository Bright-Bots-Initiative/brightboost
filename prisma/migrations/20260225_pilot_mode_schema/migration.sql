-- AlterTable: Add joinCode to Course
ALTER TABLE "Course" ADD COLUMN "joinCode" TEXT;

-- Backfill existing courses with unique join codes (use their id as seed)
UPDATE "Course" SET "joinCode" = LEFT(REPLACE(gen_random_uuid()::text, '-', ''), 8) WHERE "joinCode" IS NULL;

-- Now make it NOT NULL and UNIQUE
ALTER TABLE "Course" ALTER COLUMN "joinCode" SET NOT NULL;
ALTER TABLE "Course" ALTER COLUMN "joinCode" SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX "Course_joinCode_key" ON "Course"("joinCode");

-- AlterTable: Add description and activityId to Assignment
ALTER TABLE "Assignment" ADD COLUMN "description" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "activityId" TEXT;

-- CreateTable: PulseResponse
CREATE TABLE "PulseResponse" (
    "id" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "answers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PulseResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PulseResponse_courseId_idx" ON "PulseResponse"("courseId");
CREATE INDEX "PulseResponse_respondentId_idx" ON "PulseResponse"("respondentId");

-- AddForeignKey
ALTER TABLE "PulseResponse" ADD CONSTRAINT "PulseResponse_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PulseResponse" ADD CONSTRAINT "PulseResponse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
