-- Add per-activity telemetry payload storage for ticket #672.
ALTER TABLE "Progress"
ADD COLUMN "gameSpecific" JSONB;
