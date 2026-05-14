-- Cyber Launch modules now use a 6-section learning flow (hook / reading /
-- lesson / practice / homework / quiz). Track completion at the section
-- level so facilitators can see where a learner is and so the homework
-- task can store a free-text response that the facilitator reviews.
-- Idempotent so it is safe to re-run on any environment.

ALTER TABLE "PathwayMilestone" ADD COLUMN IF NOT EXISTS "hookCompleted"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PathwayMilestone" ADD COLUMN IF NOT EXISTS "readingCompleted"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PathwayMilestone" ADD COLUMN IF NOT EXISTS "lessonCompleted"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PathwayMilestone" ADD COLUMN IF NOT EXISTS "practiceCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PathwayMilestone" ADD COLUMN IF NOT EXISTS "homeworkSubmitted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PathwayMilestone" ADD COLUMN IF NOT EXISTS "homeworkResponse"  TEXT;
ALTER TABLE "PathwayMilestone" ADD COLUMN IF NOT EXISTS "quizCompleted"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PathwayMilestone" ADD COLUMN IF NOT EXISTS "quizScore"         INTEGER;
ALTER TABLE "PathwayMilestone" ADD COLUMN IF NOT EXISTS "timeSpentMinutes"  INTEGER NOT NULL DEFAULT 0;
