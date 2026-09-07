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
silent trust. The post-commit review then caught three real defects: the join-code path read
and decided outside its transaction (a double-click could 500 and a racing revocation could be
overwritten), the cohort list still counted untrusted rows, and the weekly XP leaderboard showed
pre-consent XP; all three were fixed with new PostgreSQL cases, along with re-invite no longer
resetting an accepted invitation and the invite copy no longer claiming an email was sent.

## Lessons

Consent has to be modelled as data with provenance; a status string alone cannot say who
created the relationship or when the learner agreed to it.

## Rating

4/5

---

## Correction pass — 2026-09-07 (PR #915, reviewed head 16c3b48a)

### Prompt (excerpt)

```
Enforce the promise to share progress from acceptance onward. Current code admits a whole
milestone by updatedAt and only strips homeworkResponse/artifacts; time-only or section-only
updates reveal old scores, completion dates, section history and totals. Policy: strict
post-consent sharing; derive facilitator-visible activity from post-consent events / field-level
provenance; updatedAt is not evidence; withhold where provenance is unavailable. Replace the DB
test expectation that shows score 91 after a timeSpentMinutes change with a regression proving
historical values are withheld. Ask Opus to challenge the historical-data provenance design first.
```

### Opus design challenge

Model self-report: "Opus 5 (1M context), claude-opus-5[1m]"; the agent stated it found **no
runtime evidence** of its model id (environment carried only agent/effort/session ids) — recorded
as a self-description, not independent verification. Material findings and dispositions:

- `completedAt >= since` is not provenance for `score`/`artifacts` (the section route completes a
  module without writing a score; POST with `status: completed` and no score refreshes
  `completedAt`) → for pre-consent rows `score` and `artifacts` are always withheld.
- Section flags: require row flag **and** post-consent event (un-completing must drop credit);
  events were keyed by module slug only, so the track is now recorded in event metadata and must
  match; `section: "homework"` emits source `section` → treated as homework evidence.
- `quizScore` has no writer anywhere → always `null` for projected rows.
- Keep time-only rows as stripped `in_progress` (engagement charts use `updatedAt`).
- `createdAt` of a pre-consent row is itself a leak → `null`.
- Return a declared `VisibleMilestone` DTO, keep `visibleMilestones` pure with an event index.
- `m.score ?? 0` averages report a false low → visible scores only, `null` when none.
- Cross-PR (#913 × #915): a home-access binding writes an adult's email onto a child's account,
  which would let the child's account list/accept Pathways invitations addressed to the adult →
  home-access-bound accounts match no invitation (`matchableEmail`), with a regression.
- CI: backend `npm ci` wipes the generated client, so the backend client is regenerated before the
  suites; `REQUIRE_TEST_DATABASE` makes a missing URL fail instead of skip; migration trees diffed.

### What changed

`services/pathwaysAccess.ts` (projection: `projectMilestone`, `moduleEvidence`,
`averageVisibleScore`, `VisibleMilestone`; `matchableEmail`), `routes/pathways.ts` (track in
XP metadata, averages), facilitator pages (withheld label, null averages, activity date),
EN/ES key `learnerDetail.historyWithheld`, `docs/ops/pathways-enrollment-consent.md`,
`.github/workflows/ci-cd.yml`, `__tests__/helpers/testDb.ts`.

### Evidence

- RED (reviewed-head service + routes, new suite): 8 of 21 PostgreSQL cases fail
  (DB-874-6, 6b–6f, 15, 16 — score 91 and January dates visible, cross-track credit, no fresh
  boundary, adult-addressed invitation acceptable by the child's account).
- GREEN: 21/21 PostgreSQL cases; 14 mocked cases (8 of them the boundary helpers BND-1…8).

### Rating

4/5 — the first design treated a row as the unit of consent; the unit is the fact.

### Opus final review of 2149afdd (2026-09-07)

Verdict: material findings, no blocker; model self-reported `claude-opus-5[1m]`, no runtime
evidence of the model id. Dispositions in the follow-up commit: the home-access exclusion now
applies only to accounts managed by a parent whose login email _is_ the parent's address (a
learner's own home login still receives invitations; DB-874-17, BND-10); the learner
gamification view no longer returns XP-event `metadata`, which the correction had started
populating with the track of every act (DB-874-6f); editing a cohort's `trackIds` can no longer
widen an existing relationship — `PathwayEnrollment.trackBoundaries` snapshots the consented
tracks with per-track boundaries, re-entering the join code consents to added tracks from then
on, and migration `20260907100000_pathway_enrollment_track_boundaries` backfills accepted rows
(DB-874-6g, BND-9); the four `db-check` steps are registered in `scripts/ci-required-steps.json`
with the fail-not-skip flag in the guarded run string; `not_started` is no longer relabelled;
the leak sweep covers the learner detail and gamification surfaces and CSV-shaped values, with a
positive last-active assertion, the legacy code-login path and the decline path proven.
Recorded, not changed: application-vs-database clock skew on the `createdAt >= since` fast path;
homework revised without a fresh submission event stays withheld; Prettier reflow of two
facilitator pages is what `format:check` requires for changed files.

Delta review of 02742307: **APPROVE** (all eight findings addressed or recorded; the per-track
mechanism judged monotone-narrowing, the migration SQL correct). Follow-up: `withTrackBoundaries`
keeps consent for tracks a cohort temporarily unlists (`boundariesOf` hides them meanwhile);
recorded as owner decisions — re-entering the join code has no UI today, and the home-access
gate is an equality test (a second adult-controlled login address stays matchable).

---

## Consent-confirmation UI pass — 2026-09-07 (PR #915)

### Prompt (excerpt)

```
Complete the authenticated Pathways confirmation flow. Add a discoverable "Join or confirm a
cohort" action on the Pathways home, usable for legacy learners, learners joining another
cohort, and learners confirming newly added tracks. Preview must be read-only; the server must
ensure the confirmed grant contains only the cohort and tracks the learner actually previewed;
if cohort configuration changes between preview and confirmation, refresh and require
confirmation again. Repeated submissions idempotent; revoked stays revoked. EN/ES, accessible,
browser-level tests on the real API and a disposable PostgreSQL database. Fix commitlint.
```

### Opus design challenge (preview/confirmation boundary)

Model self-report `claude-opus-5[1m]`, no runtime evidence. Verdict "needs changes"; dispositions:

- Grant computed from a different read than the one the version verified → the confirmation
  runs in ONE transaction, reads cohort + row once and grants exactly that read (pinned).
- Lost update on `trackBoundaries` (two tabs, confirm vs invitation accept) → every writer
  of a (learner, cohort) row takes `SELECT … FOR UPDATE` on it first; invitation acceptance
  reads the cohort's tracks inside that lock (DB-874-21/22/23).
- P2002 retry re-entered without re-verifying → the retry re-runs the whole verified sequence.
- Case-insensitive code on preview but not confirm → one resolver for both (DB-874-19).
- A code alone reveals facilitator + site partner + tracks; codes are 31-bit `Math.random` →
  site partner only once a row exists, per-account preview limiter; facilitator name kept
  (owner asked for it); CSPRNG join codes recorded as a follow-up.
- Revoked preview leaked current cohort configuration → minimal payload (no tracks/version).
- Home `consent` over-claimed for snapshot-less rows → mirrors `boundariesOf`; `accepted`
  from the trust predicate (DB-874-24).
- Onboarding redirect traps (post-confirm bounce, degraded payload, no enrollments) →
  one-shot per session, suppressed on pending consent / degraded / empty.
- Legacy confirm discarded prior boundaries → merged (DB-874-24).
- Invitation card grants blind → tracks listed on the card; tracks read under the lock.
- Idempotent duplicate: `200 changed:false` whenever nothing is pending (DB-874-20).
- HMAC unnecessary (comparison token; bearer auth, no ambient credential) — plain SHA-256.

### What changed

`GET /api/pathways/enroll/preview` (read-only, per-account limiter), `POST /api/pathways/enroll`
now requires the preview `version` (409 `preview_changed` + fresh preview on change; 400
`preview_required`; revoked → 403 first), `consentSummary` on the home payload,
`/pathways/join` page (`JoinCohort.tsx`), home prompts + button, invitation card tracks, EN/ES
copy (`pathways.join.*`, `pathways.home.consent.*`), roster notice + facilitator guide + ops doc,
seed fixtures (`E2EPW1`/`E2EPW2`, legacy/trusted/revoked learners), Cypress
`pathways-consent.cy.ts` in the `e2e-flows` job.

### Evidence

PostgreSQL suite 30/30 (DB-874-18…24 new: read-only preview, wrong/missing version, stale
preview after a track change, duplicate, own-rows-only cohort id, confirm racing a track change
×6, confirm racing an invitation acceptance, confirm racing a revocation, prior boundaries kept,
snapshot-less trusted row); mocked 16/16; Cypress live stack: see the PR.

### Opus review of 95ab686d (consent-confirmation flow)

Model self-report `claude-opus-5[1m]`, no runtime evidence. Verdict: material findings, no
blocker (it could not break the pinned-read grant, a stale version never grants, a duplicate
never writes). Dispositions in the follow-up commit: the confirm route now runs behind the same
per-account limiter as the preview and no longer echoes a preview on 409 (the client re-reads it
through the limited route) — closing the unlimited lookup oracle; a trusted row without a
snapshot shares nothing and is asked to confirm (no fallback to the cohort's current tracks, so
a cohort gaining a track can never widen it unasked; DB-874-24, BND-9); the onboarding redirect
is no longer suppressed for learners with no enrollment; the row lock is a transaction-scoped
advisory lock keyed by (learner, cohort) so it also serializes writers before the row exists; the
learner's state and every branch follow the trust predicate (a lapsed status re-activates on
confirm); `consentedSince` is clamped like the facilitator boundary; 429 renders its own EN/ES
message without a retry; the focus targets show a ring for pointer-driven focus moves; the
Cypress spec signs each role in once, runs with `retries: 0`, restores the cohort in `after()`
and makes the Spanish case self-contained; DB-874-18 also proves another learner's version is
refused. Recorded: `cypress-real-events` works under Electron in the `e2e-flows` job (7/7 on
95ab686d); the review noted the tree was not frozen when a tests-only commit (7ab48eb6) landed
mid-review — it touched only a root unit test the review had not covered.

Delta review of 227cdba0: **APPROVE** with one residual, fixed in the next commit — a trusted
row whose snapshot covers none of the cohort's tracks is now left out of the facilitator scope
entirely (no identity, gamification or CTF surface) and off the roster (counted with the
unconfirmed rows, never named); the revoke path takes the same writer lock; the advisory lock
uses the two-key form. Recorded nits: a failed re-read after a 409 shows the fetch error rather
than the "cohort changed" notice (code retained); `cy.realPress` under Electron is proven by
the `e2e-flows` job itself (7/7 on 95ab686d and 7ab48eb6).
