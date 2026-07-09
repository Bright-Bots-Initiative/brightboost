-- CreateEnum
CREATE TYPE "BenchmarkKind" AS ENUM ('PRE', 'POST');
CREATE TYPE "BenchmarkStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "BenchmarkTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gradeRange" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenchmarkTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkAssignment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "kind" "BenchmarkKind" NOT NULL,
    "status" "BenchmarkStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenchmarkAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkAttempt" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "timeSpentS" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenchmarkAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BenchmarkAssignment_courseId_idx" ON "BenchmarkAssignment"("courseId");
CREATE UNIQUE INDEX "BenchmarkAssignment_courseId_templateId_kind_key" ON "BenchmarkAssignment"("courseId", "templateId", "kind");

-- CreateIndex
CREATE INDEX "BenchmarkAttempt_assignmentId_idx" ON "BenchmarkAttempt"("assignmentId");
CREATE INDEX "BenchmarkAttempt_studentId_idx" ON "BenchmarkAttempt"("studentId");
CREATE UNIQUE INDEX "BenchmarkAttempt_assignmentId_studentId_key" ON "BenchmarkAttempt"("assignmentId", "studentId");

-- AddForeignKey
ALTER TABLE "BenchmarkAssignment" ADD CONSTRAINT "BenchmarkAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BenchmarkAssignment" ADD CONSTRAINT "BenchmarkAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BenchmarkTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkAttempt" ADD CONSTRAINT "BenchmarkAttempt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "BenchmarkAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BenchmarkAttempt" ADD CONSTRAINT "BenchmarkAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
