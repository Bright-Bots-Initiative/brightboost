-- Student creations, including drafts, are evidence: removing a class must not erase them.
ALTER TABLE "Creation" DROP CONSTRAINT "Creation_courseId_fkey",
  ADD CONSTRAINT "Creation_courseId_fkey" FOREIGN KEY ("courseId")
  REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
