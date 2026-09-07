# Ticket #871 — Scope teacher access to authorized students

**Author:** Claude Code (Fable 5.1 lead; Opus 5 design/code review)
**Date:** 2026-09-06
**Sprint:** Audit remediation (tracker #870)
**Pod:** Build

## Intent

Stop any publicly registered teacher from reading any user's profile or aggregate
progress, and from writing checkpoints for other learners. Centralize the decision so
routes stop comparing roles inline.

## Prompt

```text
Implement the four highest-priority Bright Boost audit tickets (#871-#874) as four
focused PRs with regression evidence. Define the permission matrix before coding
(actor, authentication provenance, relationship to target, operation, allowed result);
enforce it server-side with reusable policy. Read access must not grant write access.
#871: centralize authorization for self, class ownership/enrollment, and explicitly
privileged staff; preserve home groups and their ownership model; cover profile reads,
aggregate progress reads, and checkpoint writes separately; removing an enrollment
must revoke access; denials must expose no protected data and make no writes.
```

## What Claude Code Did

- Files created/modified: `backend/src/utils/authorization.ts` (new policy:
  `resolveStudentReadGrant`, `canWriteProgressFor`, `requireStudentReadAccess`),
  `backend/src/routes/profile.ts`, `backend/src/routes/progress.ts`,
  `backend/src/routes/profile.test.ts`,
  `backend/src/routes/__tests__/studentAccessPolicy.test.ts` (mounted routes, real
  middleware, mocked Prisma), `backend/src/routes/__tests__/studentAccessPolicy.db.test.ts`
  (real PostgreSQL, opt-in via `TEST_DATABASE_URL`), `backend/src/__tests__/helpers/testDb.ts`,
  `docs/agents/rules/40-security.md`, this log
- Permission matrix: self / staff (`role: "admin"`, never issued by signup) / group owner
  (teacher owning a Course — classroom or home group — the target is enrolled in as a
  student) may read profile and aggregate progress; checkpoint writes are self-only.
- Tests passed: yes — 33/33 across the three suites; the Postgres suite ran against a
  disposable `postgres:15` container migrated with the root schema.
- Build clean: yes — backend `tsc --noEmit` and ESLint on changed files.

## What Worked

Resolving the relationship with a single `Enrollment` join (`course.teacherId`,
`student.role = "student"`) before any target lookup gives uniform 403s for existing and
missing ids, so a denied request cannot enumerate accounts.

## What Needed Editing

The pre-implementation Opus review pushed for denying staff checkpoint writes (a write
capability with no owning UI is attack surface) and for asserting the dev shim cannot
manufacture ownership; both became tests.

## Lessons

Write the matrix first, then make the tests state the relationship that exists for each
case; the mock then only has to answer the one question the policy asks.

## Rating

4/5
