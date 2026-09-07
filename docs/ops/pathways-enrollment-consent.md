> **Canonical for:** Pathways enrollment consent and legacy-row backfill. Last verified against code: 2026-09-07.

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

Consent is "from today on", and it is enforced field by field. For each trusted (learner, cohort)
relationship a facilitator sees a milestone only if it belongs to one of the cohort's tracks and was
touched (`createdAt` or `updatedAt`) at or after that learner's `acceptedAt`. A milestone _created_
at or after acceptance is shown whole. A milestone that predates acceptance is **projected**
(`historyWithheld: true`): only facts with post-consent provenance are shown, everything else is
withheld — never guessed, relabelled or reset.

| Field                                                              | Shown for a pre-consent row when                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `status = completed`, `completedAt`                                | the row is completed **and** `completedAt` is at/after acceptance                                                                 |
| `hook/reading/lesson/practiceCompleted`                            | the flag is set **and** a `section` XP event for that track and module (matching `metadata.section`) is dated at/after acceptance |
| `quizCompleted`                                                    | the flag is set **and** a `quiz` XP event for that track and module is at/after acceptance                                        |
| `homeworkSubmitted`                                                | the flag is set **and** a `homework` or `section` (homework) event is at/after acceptance                                         |
| `homeworkResponse`                                                 | `homeworkSubmitted` is shown **and** the `homework` event (the submission itself) is post-consent                                 |
| `score`, `artifacts`, `timeSpentMinutes`, `quizScore`, `createdAt` | never (`null`)                                                                                                                    |

`updatedAt` alone is not evidence: a time-only or section-only update admits the row (the facilitator
sees post-consent activity as `in_progress`) but reveals none of its older values. XP events carry
`metadata.trackSlug` so an act in another track never credits a same-named module. Averages
(`averageScore`, the export's "Avg Score", `moduleStats.avgScore`) use visible scores only and are
`null` / blank — not 0 — when none is visible. Deliberate under-claims: a score re-posted on a
pre-consent module and homework text revised without a new submission stay withheld. The learner's
own routes and views are untouched.

XP, badges and CTF activity are counted since acceptance; the lifetime longest streak is not shared.
The learner-level gamification view returns XP events without their `metadata` (it names the
track of every act, including tracks outside the facilitator's cohorts). Every acceptance is its
own boundary: after a revocation, a fresh invitation starts a new boundary (work from the earlier
relationship becomes history); re-accepting an already accepted invitation keeps the original
moment. A revoked learner cannot restart through the join code — only a fresh invitation.

### Consent is per track

`PathwayEnrollment.trackBoundaries` snapshots the cohort's tracks at the moment of consent
(`{ "<trackSlug>": "<ISO boundary>" }`). A facilitator editing the cohort's `trackIds` afterwards
shares nothing new: a track the learner never consented to is not visible, however old or new
its work. The learner consents to an added track by re-entering the join code (idempotent for the
original acceptance moment), and that track's boundary is the re-entry moment. A track the cohort
no longer lists is hidden. Rows written by operator SQL without a snapshot fall back to the
cohort's current tracks at the acceptance moment — set the snapshot in the backfill (below).

Known residuals: `createdAt` is a database default while `acceptedAt` is set by the application,
so a clock skew between the two could show a row started moments before acceptance as
post-consent; run both on synchronised clocks. Homework revised after acceptance without a fresh
submission event stays withheld (see above).

## Home-access accounts

A classroom student whose home login was bound by a parent (#872) can carry the adult's email as
its login address. An account that is managed by a parent **and** whose login email is the parent's
address never matches a Pathways invitation by email: it lists none, cannot accept or decline one,
and joining by code does not adopt an invitation addressed to the adult. A home login that carries
the learner's own address (a different parent email, or none) matches normally.

## Rollout: legacy rows fail closed

The migration `20260906130000_pathway_enrollment_consent` marks every existing enrollment
`source = 'legacy'` with `acceptedAt = NULL`. On deploy, facilitator dashboards show existing
learners only after each learner re-enters the join code (the roster shows an "unconfirmed" count
and the learner keeps learning meanwhile). Nothing is silently trusted.

An operator who can vouch for specific rows may backfill deliberately. Run against the target
environment, one cohort at a time, only for learners the operator has verified joined by code:

```sql
UPDATE "PathwayEnrollment" e
SET "acceptedAt" = e."enrolledAt",
    "source" = 'join_code',
    "trackBoundaries" = (
      SELECT jsonb_object_agg(t, to_jsonb(to_char(e."enrolledAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
      FROM unnest(c."trackIds") AS t
    )
FROM "PathwayCohort" c
WHERE c."id" = e."cohortId"
  AND e."source" = 'legacy'
  AND e."cohortId" = '<cohort id>'
  AND e."userId" IN ('<verified user id>', '<verified user id>');
```

Record the backfill in the ops log. There is no audit row for a direct SQL change.

## Not yet delivered

Pathways invitations are not emailed; the learner sees them on the Pathways home after signing in
with the invited account. Email delivery is a follow-up.
