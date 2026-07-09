-- Add foreign-key indexes. The original migration assumed the parent
-- tables already existed because production was deployed with a different
-- initial-schema migration ordering. After the 20250526 consolidated init
-- was introduced, this migration appears EARLIER in timestamp order but
-- references tables the init creates LATER — which breaks fresh CI / dev
-- DBs with P3018 / "relation Lesson does not exist".
--
-- Production already has these indexes applied. We can't reorder or drop
-- migrations that ran against production, so this rewrite:
--   1. Wraps every CREATE INDEX in a DO block that no-ops when the
--      target table doesn't exist yet (fresh DB case).
--   2. Uses CREATE INDEX IF NOT EXISTS so the production case is a true
--      no-op (the index is already there).
-- Net effect: identical end state on production; safe to run cleanly
-- from zero on fresh DBs.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Lesson') THEN
    CREATE INDEX IF NOT EXISTS "Lesson_teacherId_idx" ON "Lesson"("teacherId");
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Activity') THEN
    CREATE INDEX IF NOT EXISTS "Activity_lessonId_idx" ON "Activity"("lessonId");
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Course') THEN
    CREATE INDEX IF NOT EXISTS "Course_teacherId_idx" ON "Course"("teacherId");
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Enrollment') THEN
    CREATE INDEX IF NOT EXISTS "Enrollment_courseId_idx" ON "Enrollment"("courseId");
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Assignment') THEN
    CREATE INDEX IF NOT EXISTS "Assignment_courseId_idx" ON "Assignment"("courseId");
  END IF;
END
$$;
