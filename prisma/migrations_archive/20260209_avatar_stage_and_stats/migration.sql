-- CreateEnum: AvatarStage
CREATE TYPE "AvatarStage" AS ENUM ('GENERAL', 'SPECIALIZED');

-- AlterTable: Add stage column with default GENERAL
ALTER TABLE "Avatar" ADD COLUMN "stage" "AvatarStage" NOT NULL DEFAULT 'GENERAL';

-- AlterTable: Make archetype nullable
ALTER TABLE "Avatar" ALTER COLUMN "archetype" DROP NOT NULL;

-- AlterTable: Add general stats columns
ALTER TABLE "Avatar" ADD COLUMN "speed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Avatar" ADD COLUMN "control" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Avatar" ADD COLUMN "focus" INTEGER NOT NULL DEFAULT 0;

-- Migrate existing avatars to SPECIALIZED (they already have an archetype)
UPDATE "Avatar" SET "stage" = 'SPECIALIZED' WHERE "archetype" IS NOT NULL;
