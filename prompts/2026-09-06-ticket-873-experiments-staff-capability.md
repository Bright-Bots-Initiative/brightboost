# Ticket #873 — Restrict global experiment administration to staff

**Author:** Claude Code (Fable 5.1 lead; Opus 5 design/code review)
**Date:** 2026-09-06
**Sprint:** Audit remediation (tracker #870)
**Pod:** Build

## Intent

Stop publicly registered teachers from listing, creating, editing and reading results of global
A/B experiments (and from triggering the Slack notifications a status change sends), while
keeping learner variant/event routes working.

## Prompt

```text
#873: Protect global experiment creation, management listing, updates, results, and
administrative status-change notifications with an explicit server-controlled staff
capability. A publicly registered teacher must not gain this authority; creator ownership
alone does not make global experiments safe. Preserve legitimate authenticated learner
variant/event routes and their intended side effects. Test authorized staff and unauthorized
teachers. Mock notification delivery and prove denied administrative requests cause no
notification or mutation.
```

## What Claude Code Did

- `backend/src/utils/staff.ts` (new): `requireStaff` — role `admin`, re-read from the
  database on every call so demotion is immediate; exact check (no `requireRole` pass-through).
- `backend/src/routes/experiments.ts`: the four administrative routes use `requireStaff`;
  learner routes unchanged.
- `src/App.tsx`: `/admin/experiments` requires the `admin` role in `ProtectedRoute` (display
  only; the API is authoritative). Header comments updated.
- `docs/ops/staff-capability.md` (new canonical doc): what staff gates, and the SQL grant /
  revoke runbook (no admin account exists in any seed, so the dashboard is unusable until an
  operator grants the role).
- `backend/src/routes/__tests__/experimentsAuthorization.test.ts`: 11 cases with real JWTs
  through the mounted app; Slack mocked; denied requests assert no mutation and no
  notification; staff path asserts the notification fires; learner routes keep assignment,
  event and milestone side effects.
- Tests passed: yes. Build clean: backend + frontend `tsc --noEmit`, ESLint on changed files.

## What Worked

`requireStaff` as a separate module kept the change out of `utils/auth.ts`, which the sibling
PRs (#871, #872) also touch, so the four audit PRs stay independent.

## What Needed Editing

The pre-implementation Opus review pointed out that trusting the `role` claim leaves a demoted
admin with a working token for up to seven days; the middleware re-reads the role from the
database instead.

## Lessons

"Explicit staff capability" needs a runbook as much as a middleware: without a documented grant
path the gate simply turns the feature off.

## Rating

4/5
