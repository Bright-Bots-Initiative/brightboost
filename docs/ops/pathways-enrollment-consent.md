> **Canonical for:** Pathways enrollment consent and legacy-row backfill. Last verified against code: 2026-09-06.

# Pathways enrollment consent (#874)

A `PathwayEnrollment` is an access relationship between a learner and a cohort. A facilitator
sees a learner — roster, profile fields, milestones, exports, aggregates, gamification, CTF
activity — only through a **trusted** row: `status` is `active` or `completed` **and**
`acceptedAt` is set. `acceptedAt` is the learner's own act:

| `source`             | How the row was created                                    | Trusted? |
| -------------------- | ---------------------------------------------------------- | -------- |
| `join_code`          | Learner entered the cohort join code while signed in       | yes      |
| `self_register`      | Learner registered with the cohort code                    | yes      |
| `facilitator_invite` | Learner accepted a facilitator's invitation to their email | yes      |
| `legacy`             | Row predates consent tracking (migration default)          | **no**   |

Facilitators never create a trusted row. "Add learner by email" records a `PathwayInvite` for the
typed address (no account lookup, identical response for any address); only the signed-in account
whose email matches can accept. Removing a learner keeps the row as `revoked`; a revoked learner
cannot re-join with the stale code and cannot log in through that cohort's code — a fresh
invitation is the way back.

## History boundary

For each trusted (learner, cohort) relationship a facilitator sees a milestone only if it belongs to
one of the cohort's tracks and was last touched (`updatedAt`) at or after that learner's
`acceptedAt`. `artifacts` and `homeworkResponse` are withheld for milestones started before
acceptance (this also withholds homework submitted later on such a module — known limitation).
XP, badges and CTF activity are counted since acceptance; the lifetime longest streak is not shared.

## Rollout: legacy rows fail closed

The migration `20260906130000_pathway_enrollment_consent` marks every existing enrollment
`source = 'legacy'` with `acceptedAt = NULL`. On deploy, facilitator dashboards show existing
learners only after each learner re-enters the join code (the roster shows an "unconfirmed" count
and the learner keeps learning meanwhile). Nothing is silently trusted.

An operator who can vouch for specific rows may backfill deliberately. Run against the target
environment, one cohort at a time, only for learners the operator has verified joined by code:

```sql
UPDATE "PathwayEnrollment"
SET "acceptedAt" = "enrolledAt", "source" = 'join_code'
WHERE "source" = 'legacy'
  AND "cohortId" = '<cohort id>'
  AND "userId" IN ('<verified user id>', '<verified user id>');
```

Record the backfill in the ops log. There is no audit row for a direct SQL change.

## Not yet delivered

Pathways invitations are not emailed; the learner sees them on the Pathways home after signing in
with the invited account. Email delivery is a follow-up.
