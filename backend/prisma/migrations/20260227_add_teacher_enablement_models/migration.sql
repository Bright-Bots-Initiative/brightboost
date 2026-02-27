-- CreateTable
CREATE TABLE "TeacherPrepChecklist" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "moduleSlug" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherPrepChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "moduleSlug" TEXT,
    "category" TEXT NOT NULL,
    "contentHtml" TEXT,
    "contentUrl" TEXT,
    "printable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PDSession" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "facilitator" TEXT,
    "notes" TEXT,
    "actionItems" JSONB,
    "relatedModuleSlugs" JSONB,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PDSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PDReflection" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "pdSessionId" TEXT NOT NULL,
    "moduleSlug" TEXT,
    "whatWorked" TEXT,
    "whatToChange" TEXT,
    "studentObservations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PDReflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacultyPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "moduleSlug" TEXT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherPrepChecklist_teacherId_moduleSlug_key" ON "TeacherPrepChecklist"("teacherId", "moduleSlug");

-- CreateIndex
CREATE INDEX "Resource_moduleSlug_idx" ON "Resource"("moduleSlug");
CREATE INDEX "Resource_type_idx" ON "Resource"("type");
CREATE INDEX "Resource_category_idx" ON "Resource"("category");

-- CreateIndex
CREATE INDEX "PDSession_teacherId_idx" ON "PDSession"("teacherId");

-- CreateIndex
CREATE INDEX "PDReflection_teacherId_idx" ON "PDReflection"("teacherId");
CREATE INDEX "PDReflection_pdSessionId_idx" ON "PDReflection"("pdSessionId");

-- CreateIndex
CREATE INDEX "FacultyPost_authorId_idx" ON "FacultyPost"("authorId");
CREATE INDEX "FacultyPost_parentId_idx" ON "FacultyPost"("parentId");
CREATE INDEX "FacultyPost_moduleSlug_idx" ON "FacultyPost"("moduleSlug");

-- AddForeignKey
ALTER TABLE "TeacherPrepChecklist" ADD CONSTRAINT "TeacherPrepChecklist_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDSession" ADD CONSTRAINT "PDSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDReflection" ADD CONSTRAINT "PDReflection_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PDReflection" ADD CONSTRAINT "PDReflection_pdSessionId_fkey" FOREIGN KEY ("pdSessionId") REFERENCES "PDSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultyPost" ADD CONSTRAINT "FacultyPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacultyPost" ADD CONSTRAINT "FacultyPost_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FacultyPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
