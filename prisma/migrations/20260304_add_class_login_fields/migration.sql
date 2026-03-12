-- AlterTable: Add K-2 class-code login fields to User
ALTER TABLE "User" ADD COLUMN "loginIcon" TEXT;
ALTER TABLE "User" ADD COLUMN "loginPin" TEXT;
ALTER TABLE "User" ADD COLUMN "preferredLanguage" TEXT;

-- AlterTable: Add default language to Course
ALTER TABLE "Course" ADD COLUMN "defaultLanguage" TEXT NOT NULL DEFAULT 'en';
