# Ticket #874 — Require a valid Pathways relationship before exposing learner history

**Author:** Claude Code (Fable 5.1 lead; Opus 5 design/code review)
**Date:** 2026-09-06
**Sprint:** Audit remediation (tracker #870)
**Pod:** Build

## Intent

Stop "add learner by email" from creating an accepted relationship that exposes a learner's
birth year and every prior milestone to a facilitator who merely knows the email. Make the
learner's own act the only way a relationship becomes trusted, and bound the history a
cohort may see.

## Prompt

```text
#874: Adding an existing learner by email must create no accepted access relationship.
Require acceptance by the intended authenticated learner or an already trusted
institutional roster process. Pending, rejected, expired, or revoked relationships must
grant no protected profile, roster, export, aggregate, milestone, gamification, or team
visibility. Cover wrong-user acceptance, replay, expiration, duplicate/concurrent
acceptance, and revocation. Preserve legitimate learner-initiated join-code flows. Avoid
disclosing account existence through invitation responses. Specify and enforce
historical-sharing boundaries: cohort membership is not blanket consent to all prior
milestones. Inspect record provenance; never silently treat unverified legacy
facilitator-created enrollments as trusted.
```

## What Claude Code Did

- Schema (both trees) + `20260906130000_pathway_enrollment_consent`: `PathwayEnrollment`
  gains `source`, `acceptedAt`, `revokedAt`, `invitedById` and the `revoked` status;
  `PathwayMilestone` gains `updatedAt`; new `PathwayInvite` table keyed by
  `(cohortId, email)`. Existing rows become `source = "legacy"` with no `acceptedAt`.
- `backend/src/services/pathwaysAccess.ts` (new): the trust predicate, the history boundary
  (`visibleMilestones` / `redactMilestone`), `loadFacilitatorScope`, invitation lifecycle
  (invite, list, accept with a count-guarded transaction, decline, withdraw), revoke, and
  join-by-code that confirms legacy rows and refuses revoked ones.
- `backend/src/routes/pathways.ts`: every facilitator surface reads through the scope;
  "add learner" records an invitation and answers 202 identically for any address; learner
  detail drops `birthYear`; gamification/CTF views count since acceptance; new learner
  routes to list/accept/decline invitations and a facilitator route to withdraw one.
  `routes/auth.ts`: self-registration is trusted at creation; code-login excludes revoked
  rows. `services/gamification.ts`: cohort summary accepts a per-learner boundary.
- Frontend: pending-invitation card on the Pathways home; roster shows invitations by the
  typed address, a legacy-unconfirmed count and a withdraw action; learner detail tolerates
  the withheld lifetime streak. EN + ES copy.
- Seeds (both trees): demo enrollments carry `acceptedAt` so the seeded dashboards work.
- Tests: `pathwaysConsent.db.test.ts` (real PostgreSQL: no relationship on invite, identical
  response/roster for unknown addresses, wrong-user 404, expiry 410, concurrent acceptance
  exactly once, replay no-op, history boundary and redaction, legacy row hidden until
  join-code confirmation, join-code idempotence, revocation blocks visibility/re-join/code
  login, declined and withdrawn invitations, foreign cohort 404) and
  `pathwaysConsent.test.ts` (no account lookup on invite; boundary helpers).

## What Worked

Storing the invitation by address instead of creating a pending enrollment removed the
account-existence oracle the first design still had; the roster shows the same chip for a
real address and a typo.

## What Needed Editing

The pre-implementation Opus review reshaped the design: invitation table keyed by email,
`updatedAt` as the boundary clock with detail redaction, join-code must not resurrect
revoked rows, and legacy rows fail closed with a documented operator backfill rather than
silent trust.

## Lessons

Consent has to be modelled as data with provenance; a status string alone cannot say who
created the relationship or when the learner agreed to it.

## Rating

4/5
