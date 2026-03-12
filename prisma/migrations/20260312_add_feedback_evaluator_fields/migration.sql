-- AlterTable: Add evaluator-oriented fields to Feedback
ALTER TABLE "Feedback" ADD COLUMN "strongest" TEXT;
ALTER TABLE "Feedback" ADD COLUMN "pilotInterest" TEXT;
