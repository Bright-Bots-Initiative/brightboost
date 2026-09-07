-- AlterTable
ALTER TABLE "PathwayEnrollment" ADD COLUMN "trackBoundaries" JSONB;

-- #874: every already-accepted relationship snapshots the cohort's tracks as
-- they are now, each bounded by that learner's acceptance moment, so a later
-- edit of the cohort's trackIds cannot widen an existing relationship. Rows
-- without a consent moment stay untrusted and get no snapshot.
UPDATE "PathwayEnrollment" e
SET "trackBoundaries" = sub.boundaries
FROM (
  SELECT e2."id",
         jsonb_object_agg(
           t,
           to_jsonb(to_char(e2."acceptedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
         ) AS boundaries
  FROM "PathwayEnrollment" e2
  JOIN "PathwayCohort" c ON c."id" = e2."cohortId"
  CROSS JOIN LATERAL unnest(c."trackIds") AS t
  WHERE e2."acceptedAt" IS NOT NULL
    AND e2."trackBoundaries" IS NULL
  GROUP BY e2."id"
) sub
WHERE sub."id" = e."id";
