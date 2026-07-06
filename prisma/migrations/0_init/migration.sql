-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountMode" AS ENUM ('CLASS_CODE_ONLY', 'EMAIL_ONLY', 'CLASS_CODE_PLUS_HOME_ACCESS');

-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('INFO', 'INTERACT');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "Archetype" AS ENUM ('AI', 'QUANTUM', 'BIOTECH');

-- CreateEnum
CREATE TYPE "AvatarStage" AS ENUM ('GENERAL', 'SPECIALIZED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'FORFEIT');

-- CreateEnum
CREATE TYPE "BenchmarkKind" AS ENUM ('PRE', 'POST');

-- CreateEnum
CREATE TYPE "BenchmarkStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CreationStatus" AS ENUM ('IN_PROGRESS', 'SHARED', 'COMPLETE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL,
    "school" TEXT,
    "subject" TEXT,
    "bio" TEXT NOT NULL DEFAULT 'No bio added',
    "grade" INTEGER,
    "loginIcon" TEXT,
    "loginPin" TEXT,
    "preferredLanguage" TEXT,
    "accountMode" "AccountMode" NOT NULL DEFAULT 'CLASS_CODE_ONLY',
    "homeAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
    "managedByParent" BOOLEAN NOT NULL DEFAULT false,
    "parentEmail" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" TEXT NOT NULL DEFAULT 'Explorer',
    "streak" INTEGER NOT NULL DEFAULT 0,
    "avatarUrl" TEXT DEFAULT '/robots/robot_default.png',
    "userType" TEXT NOT NULL DEFAULT 'k8',
    "ageBand" TEXT,
    "birthYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "order" INTEGER NOT NULL,
    "content" TEXT,
    "unitId" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "moduleSlug" TEXT NOT NULL,
    "lessonId" TEXT,
    "activityId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL,
    "timeSpentS" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklySnapshot" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avatar" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "stage" "AvatarStage" NOT NULL DEFAULT 'GENERAL',
    "archetype" "Archetype",
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL DEFAULT 100,
    "energy" INTEGER NOT NULL DEFAULT 100,
    "speed" INTEGER NOT NULL DEFAULT 0,
    "control" INTEGER NOT NULL DEFAULT 0,
    "focus" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Avatar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ability" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archetype" "Archetype" NOT NULL,
    "reqLevel" INTEGER NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "Ability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnlockedAbility" (
    "id" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "abilityId" TEXT NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UnlockedAbility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "winnerId" TEXT,
    "band" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchTurn" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "xpBonus" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "gradeBand" TEXT NOT NULL DEFAULT 'k2',
    "kind" TEXT NOT NULL DEFAULT 'class',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "grade" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "activityId" TEXT,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

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
    "titleEs" TEXT,
    "descriptionEs" TEXT,
    "contentHtmlEs" TEXT,
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

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT,
    "liked" TEXT,
    "confused" TEXT,
    "strongest" TEXT,
    "pilotInterest" TEXT,
    "wantsFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "GamePersonalBest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "lastScore" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "bestRoundsCompleted" INTEGER NOT NULL DEFAULT 0,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "firstPlayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPlayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "GamePersonalBest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleFamily" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "iconEmoji" TEXT NOT NULL DEFAULT '🔬',

    CONSTRAINT "ModuleFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleVariant" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "band" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "moduleSlug" TEXT,
    "contentConfig" JSONB,

    CONSTRAINT "ModuleVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassModuleAssignment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "moduleVariantId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "dueAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassModuleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayCohort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "band" TEXT NOT NULL,
    "sitePartner" TEXT,
    "facilitatorId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "trackIds" TEXT[],
    "joinCode" TEXT NOT NULL,
    "description" TEXT,
    "maxEnrollment" INTEGER DEFAULT 25,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayCohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "PathwayEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayMilestone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackSlug" TEXT NOT NULL,
    "moduleSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "score" INTEGER,
    "completedAt" TIMESTAMP(3),
    "artifacts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hookCompleted" BOOLEAN NOT NULL DEFAULT false,
    "readingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "lessonCompleted" BOOLEAN NOT NULL DEFAULT false,
    "practiceCompleted" BOOLEAN NOT NULL DEFAULT false,
    "homeworkSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "homeworkResponse" TEXT,
    "quizCompleted" BOOLEAN NOT NULL DEFAULT false,
    "quizScore" INTEGER,
    "timeSpentMinutes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PathwayMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayLabAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "labSlug" TEXT NOT NULL,
    "mode" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "output" JSONB,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayLabAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayXpEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRefId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayXpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayGamification" (
    "userId" TEXT NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TIMESTAMP(3),
    "streakFreezesAvailable" INTEGER NOT NULL DEFAULT 1,
    "streakFreezesUsedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "lastFreezeRefresh" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PathwayGamification_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PathwayBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "PathwayBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayDailyGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "goals" JSONB NOT NULL,
    "allComplete" BOOLEAN NOT NULL DEFAULT false,
    "bonusAwarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PathwayDailyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayCtfAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeSlug" TEXT NOT NULL,
    "submittedFlag" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSec" INTEGER NOT NULL DEFAULT 0,
    "teamId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayCtfAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayCtfSolve" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeSlug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "totalAttempts" INTEGER NOT NULL DEFAULT 1,
    "teamId" TEXT,

    CONSTRAINT "PathwayCtfSolve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayCtfTeam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cohortId" TEXT,
    "inviteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayCtfTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayCtfTeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayCtfTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayOnboarding" (
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "avatarChosen" BOOLEAN NOT NULL DEFAULT false,
    "skillsTourViewed" BOOLEAN NOT NULL DEFAULT false,
    "skillsTourSkipped" BOOLEAN NOT NULL DEFAULT false,
    "missionStatement" TEXT,
    "dailyGoalLevel" TEXT,
    "avatarSlug" TEXT,
    "toolboxIntroSeen" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PathwayOnboarding_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PathwayGlossaryView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "termSlug" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayGlossaryView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "trafficSplit" INTEGER NOT NULL DEFAULT 50,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "conclusion" TEXT,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentAssignment" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentEvent" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventValue" DOUBLE PRECISION,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creation" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "content" JSONB NOT NULL,
    "status" "CreationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "encouragements" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Module_slug_key" ON "Module"("slug");

-- CreateIndex
CREATE INDEX "Unit_teacherId_idx" ON "Unit"("teacherId");

-- CreateIndex
CREATE INDEX "Unit_moduleId_idx" ON "Unit"("moduleId");

-- CreateIndex
CREATE INDEX "Lesson_unitId_idx" ON "Lesson"("unitId");

-- CreateIndex
CREATE INDEX "Activity_unitId_idx" ON "Activity"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_lessonId_order_key" ON "Activity"("lessonId", "order");

-- CreateIndex
CREATE INDEX "Progress_studentId_status_idx" ON "Progress"("studentId", "status");

-- CreateIndex
CREATE INDEX "Progress_studentId_moduleSlug_idx" ON "Progress"("studentId", "moduleSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Progress_studentId_activityId_key" ON "Progress"("studentId", "activityId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySnapshot_studentId_weekStart_key" ON "WeeklySnapshot"("studentId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "Avatar_studentId_key" ON "Avatar"("studentId");

-- CreateIndex
CREATE INDEX "UnlockedAbility_abilityId_idx" ON "UnlockedAbility"("abilityId");

-- CreateIndex
CREATE UNIQUE INDEX "UnlockedAbility_avatarId_abilityId_key" ON "UnlockedAbility"("avatarId", "abilityId");

-- CreateIndex
CREATE INDEX "Match_player1Id_idx" ON "Match"("player1Id");

-- CreateIndex
CREATE INDEX "Match_player2Id_idx" ON "Match"("player2Id");

-- CreateIndex
CREATE INDEX "Match_status_band_idx" ON "Match"("status", "band");

-- CreateIndex
CREATE INDEX "MatchTurn_matchId_idx" ON "MatchTurn"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_slug_key" ON "Badge"("slug");

-- CreateIndex
CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_joinCode_key" ON "Course"("joinCode");

-- CreateIndex
CREATE INDEX "Course_teacherId_idx" ON "Course"("teacherId");

-- CreateIndex
CREATE INDEX "Enrollment_courseId_idx" ON "Enrollment"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_courseId_key" ON "Enrollment"("studentId", "courseId");

-- CreateIndex
CREATE INDEX "Assignment_courseId_idx" ON "Assignment"("courseId");

-- CreateIndex
CREATE INDEX "PulseResponse_courseId_idx" ON "PulseResponse"("courseId");

-- CreateIndex
CREATE INDEX "PulseResponse_respondentId_idx" ON "PulseResponse"("respondentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherPrepChecklist_teacherId_moduleSlug_key" ON "TeacherPrepChecklist"("teacherId", "moduleSlug");

-- CreateIndex
CREATE INDEX "Resource_moduleSlug_idx" ON "Resource"("moduleSlug");

-- CreateIndex
CREATE INDEX "Resource_type_idx" ON "Resource"("type");

-- CreateIndex
CREATE INDEX "Resource_category_idx" ON "Resource"("category");

-- CreateIndex
CREATE INDEX "PDSession_teacherId_idx" ON "PDSession"("teacherId");

-- CreateIndex
CREATE INDEX "PDReflection_teacherId_idx" ON "PDReflection"("teacherId");

-- CreateIndex
CREATE INDEX "PDReflection_pdSessionId_idx" ON "PDReflection"("pdSessionId");

-- CreateIndex
CREATE INDEX "FacultyPost_authorId_idx" ON "FacultyPost"("authorId");

-- CreateIndex
CREATE INDEX "FacultyPost_parentId_idx" ON "FacultyPost"("parentId");

-- CreateIndex
CREATE INDEX "FacultyPost_moduleSlug_idx" ON "FacultyPost"("moduleSlug");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- CreateIndex
CREATE INDEX "BenchmarkAssignment_courseId_idx" ON "BenchmarkAssignment"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "BenchmarkAssignment_courseId_templateId_kind_key" ON "BenchmarkAssignment"("courseId", "templateId", "kind");

-- CreateIndex
CREATE INDEX "BenchmarkAttempt_assignmentId_idx" ON "BenchmarkAttempt"("assignmentId");

-- CreateIndex
CREATE INDEX "BenchmarkAttempt_studentId_idx" ON "BenchmarkAttempt"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "BenchmarkAttempt_assignmentId_studentId_key" ON "BenchmarkAttempt"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "GamePersonalBest_studentId_idx" ON "GamePersonalBest"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "GamePersonalBest_studentId_gameKey_key" ON "GamePersonalBest"("studentId", "gameKey");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleFamily_key_key" ON "ModuleFamily"("key");

-- CreateIndex
CREATE INDEX "ModuleVariant_band_idx" ON "ModuleVariant"("band");

-- CreateIndex
CREATE INDEX "ModuleVariant_familyId_idx" ON "ModuleVariant"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleVariant_familyId_band_version_key" ON "ModuleVariant"("familyId", "band", "version");

-- CreateIndex
CREATE INDEX "ClassModuleAssignment_courseId_idx" ON "ClassModuleAssignment"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassModuleAssignment_courseId_moduleVariantId_key" ON "ClassModuleAssignment"("courseId", "moduleVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayCohort_joinCode_key" ON "PathwayCohort"("joinCode");

-- CreateIndex
CREATE INDEX "PathwayCohort_facilitatorId_idx" ON "PathwayCohort"("facilitatorId");

-- CreateIndex
CREATE INDEX "PathwayCohort_status_idx" ON "PathwayCohort"("status");

-- CreateIndex
CREATE INDEX "PathwayEnrollment_cohortId_idx" ON "PathwayEnrollment"("cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayEnrollment_userId_cohortId_key" ON "PathwayEnrollment"("userId", "cohortId");

-- CreateIndex
CREATE INDEX "PathwayMilestone_userId_idx" ON "PathwayMilestone"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayMilestone_userId_trackSlug_moduleSlug_key" ON "PathwayMilestone"("userId", "trackSlug", "moduleSlug");

-- CreateIndex
CREATE INDEX "PathwayLabAttempt_userId_labSlug_idx" ON "PathwayLabAttempt"("userId", "labSlug");

-- CreateIndex
CREATE INDEX "PathwayLabAttempt_userId_idx" ON "PathwayLabAttempt"("userId");

-- CreateIndex
CREATE INDEX "PathwayXpEvent_userId_createdAt_idx" ON "PathwayXpEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PathwayXpEvent_userId_source_idx" ON "PathwayXpEvent"("userId", "source");

-- CreateIndex
CREATE INDEX "PathwayXpEvent_userId_source_sourceRefId_idx" ON "PathwayXpEvent"("userId", "source", "sourceRefId");

-- CreateIndex
CREATE INDEX "PathwayBadge_userId_earnedAt_idx" ON "PathwayBadge"("userId", "earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayBadge_userId_slug_key" ON "PathwayBadge"("userId", "slug");

-- CreateIndex
CREATE INDEX "PathwayDailyGoal_userId_date_idx" ON "PathwayDailyGoal"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayDailyGoal_userId_date_key" ON "PathwayDailyGoal"("userId", "date");

-- CreateIndex
CREATE INDEX "PathwayCtfAttempt_userId_challengeSlug_idx" ON "PathwayCtfAttempt"("userId", "challengeSlug");

-- CreateIndex
CREATE INDEX "PathwayCtfAttempt_userId_isCorrect_idx" ON "PathwayCtfAttempt"("userId", "isCorrect");

-- CreateIndex
CREATE INDEX "PathwayCtfAttempt_teamId_challengeSlug_idx" ON "PathwayCtfAttempt"("teamId", "challengeSlug");

-- CreateIndex
CREATE INDEX "PathwayCtfSolve_userId_solvedAt_idx" ON "PathwayCtfSolve"("userId", "solvedAt");

-- CreateIndex
CREATE INDEX "PathwayCtfSolve_category_idx" ON "PathwayCtfSolve"("category");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayCtfSolve_userId_challengeSlug_key" ON "PathwayCtfSolve"("userId", "challengeSlug");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayCtfTeam_inviteCode_key" ON "PathwayCtfTeam"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayCtfTeamMember_teamId_userId_key" ON "PathwayCtfTeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "PathwayGlossaryView_userId_idx" ON "PathwayGlossaryView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayGlossaryView_userId_termSlug_key" ON "PathwayGlossaryView"("userId", "termSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_slug_key" ON "Experiment"("slug");

-- CreateIndex
CREATE INDEX "Experiment_status_idx" ON "Experiment"("status");

-- CreateIndex
CREATE INDEX "ExperimentAssignment_experimentId_variant_idx" ON "ExperimentAssignment"("experimentId", "variant");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentAssignment_experimentId_userId_key" ON "ExperimentAssignment"("experimentId", "userId");

-- CreateIndex
CREATE INDEX "ExperimentEvent_experimentId_eventName_idx" ON "ExperimentEvent"("experimentId", "eventName");

-- CreateIndex
CREATE INDEX "ExperimentEvent_experimentId_variant_idx" ON "ExperimentEvent"("experimentId", "variant");

-- CreateIndex
CREATE INDEX "Creation_courseId_status_idx" ON "Creation"("courseId", "status");

-- CreateIndex
CREATE INDEX "Creation_authorId_idx" ON "Creation"("authorId");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySnapshot" ADD CONSTRAINT "WeeklySnapshot_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avatar" ADD CONSTRAINT "Avatar_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockedAbility" ADD CONSTRAINT "UnlockedAbility_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockedAbility" ADD CONSTRAINT "UnlockedAbility_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "Ability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "Avatar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "Avatar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchTurn" ADD CONSTRAINT "MatchTurn_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseResponse" ADD CONSTRAINT "PulseResponse_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseResponse" ADD CONSTRAINT "PulseResponse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherPrepChecklist" ADD CONSTRAINT "TeacherPrepChecklist_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDSession" ADD CONSTRAINT "PDSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDReflection" ADD CONSTRAINT "PDReflection_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDReflection" ADD CONSTRAINT "PDReflection_pdSessionId_fkey" FOREIGN KEY ("pdSessionId") REFERENCES "PDSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultyPost" ADD CONSTRAINT "FacultyPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultyPost" ADD CONSTRAINT "FacultyPost_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FacultyPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkAssignment" ADD CONSTRAINT "BenchmarkAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkAssignment" ADD CONSTRAINT "BenchmarkAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BenchmarkTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkAttempt" ADD CONSTRAINT "BenchmarkAttempt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "BenchmarkAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkAttempt" ADD CONSTRAINT "BenchmarkAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePersonalBest" ADD CONSTRAINT "GamePersonalBest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleVariant" ADD CONSTRAINT "ModuleVariant_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "ModuleFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassModuleAssignment" ADD CONSTRAINT "ClassModuleAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassModuleAssignment" ADD CONSTRAINT "ClassModuleAssignment_moduleVariantId_fkey" FOREIGN KEY ("moduleVariantId") REFERENCES "ModuleVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayCohort" ADD CONSTRAINT "PathwayCohort_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayEnrollment" ADD CONSTRAINT "PathwayEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayEnrollment" ADD CONSTRAINT "PathwayEnrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "PathwayCohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayMilestone" ADD CONSTRAINT "PathwayMilestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayLabAttempt" ADD CONSTRAINT "PathwayLabAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayXpEvent" ADD CONSTRAINT "PathwayXpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayGamification" ADD CONSTRAINT "PathwayGamification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayBadge" ADD CONSTRAINT "PathwayBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayDailyGoal" ADD CONSTRAINT "PathwayDailyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayCtfAttempt" ADD CONSTRAINT "PathwayCtfAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayCtfAttempt" ADD CONSTRAINT "PathwayCtfAttempt_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "PathwayCtfTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayCtfSolve" ADD CONSTRAINT "PathwayCtfSolve_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayCtfSolve" ADD CONSTRAINT "PathwayCtfSolve_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "PathwayCtfTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayCtfTeam" ADD CONSTRAINT "PathwayCtfTeam_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "PathwayCohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayCtfTeamMember" ADD CONSTRAINT "PathwayCtfTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "PathwayCtfTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayCtfTeamMember" ADD CONSTRAINT "PathwayCtfTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayOnboarding" ADD CONSTRAINT "PathwayOnboarding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayGlossaryView" ADD CONSTRAINT "PathwayGlossaryView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentAssignment" ADD CONSTRAINT "ExperimentAssignment_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentEvent" ADD CONSTRAINT "ExperimentEvent_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creation" ADD CONSTRAINT "Creation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creation" ADD CONSTRAINT "Creation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

