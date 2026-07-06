-- A/B Testing: Experiment, ExperimentAssignment, ExperimentEvent
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS "Experiment" (
  "id"           TEXT        NOT NULL,
  "slug"         TEXT        NOT NULL,
  "name"         TEXT        NOT NULL,
  "hypothesis"   TEXT        NOT NULL,
  "metric"       TEXT        NOT NULL,
  "status"       TEXT        NOT NULL DEFAULT 'draft',
  "trafficSplit" INTEGER     NOT NULL DEFAULT 50,
  "createdBy"    TEXT        NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"  TIMESTAMP(3),
  "conclusion"   TEXT,
  CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Experiment_slug_key" ON "Experiment" ("slug");
CREATE INDEX IF NOT EXISTS "Experiment_status_idx" ON "Experiment" ("status");

CREATE TABLE IF NOT EXISTS "ExperimentAssignment" (
  "id"           TEXT         NOT NULL,
  "experimentId" TEXT         NOT NULL,
  "userId"       TEXT         NOT NULL,
  "variant"      TEXT         NOT NULL,
  "assignedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExperimentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExperimentAssignment_experimentId_userId_key"
  ON "ExperimentAssignment" ("experimentId", "userId");
CREATE INDEX IF NOT EXISTS "ExperimentAssignment_experimentId_variant_idx"
  ON "ExperimentAssignment" ("experimentId", "variant");

DO $$ BEGIN
  ALTER TABLE "ExperimentAssignment"
    ADD CONSTRAINT "ExperimentAssignment_experimentId_fkey"
    FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ExperimentEvent" (
  "id"           TEXT         NOT NULL,
  "experimentId" TEXT         NOT NULL,
  "userId"       TEXT         NOT NULL,
  "variant"      TEXT         NOT NULL,
  "eventName"    TEXT         NOT NULL,
  "eventValue"   DOUBLE PRECISION,
  "metadata"     JSONB,
  "timestamp"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExperimentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExperimentEvent_experimentId_eventName_idx"
  ON "ExperimentEvent" ("experimentId", "eventName");
CREATE INDEX IF NOT EXISTS "ExperimentEvent_experimentId_variant_idx"
  ON "ExperimentEvent" ("experimentId", "variant");

DO $$ BEGIN
  ALTER TABLE "ExperimentEvent"
    ADD CONSTRAINT "ExperimentEvent_experimentId_fkey"
    FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
