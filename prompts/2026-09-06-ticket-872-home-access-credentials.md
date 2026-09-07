# Ticket #872 — Protect home-access credentials from classroom sessions

**Author:** Claude Code (Fable 5.1 lead; Opus 5 design/code review)
**Date:** 2026-09-06
**Sprint:** Audit remediation (tracker #870)
**Pod:** Build

## Intent

Stop a classroom session (K-2 icon login, with or without a PIN) from setting or replacing a
student's home email, password and parent relationship. Separate first-time binding by a
verified adult from reauthenticated changes by the credential holder, and make the session's
provenance server-issued.

## Prompt

```text
#872: Separate verified adult first-time home binding from reauthenticated credential or
parent-relationship changes. Checking homeAccessEnabled alone is insufficient: first-time
binding must also be protected. Represent session provenance/capabilities with server-issued
evidence. Classroom sessions, including PIN-authenticated sessions, must not acquire
credential-management authority from their student role or submitted fields. Use a trusted,
verified adult relationship and appropriately scoped proof; entering an email is not
verification. Make legacy sessions fail closed for sensitive changes while preserving
ordinary learning. Cover unauthorized initial binding and replacement, wrong-account /
expired / replayed proof, simultaneous first bindings, and transactional rollback. Failed
attempts must leave credentials and relationships unchanged. Preserve a usable family
setup/recovery experience and update English and Spanish UI copy where affected.
```

## What Claude Code Did

- Backend: `utils/token.ts` adds the `auth` JWT claim (`password` | `class_code` |
  `class_code_pin`); `utils/auth.ts` copies only known claims into `req.user`;
  `routes/classLogin.ts` and `routes/auth.ts` stamp provenance at issuance and throttle the
  Pathways password routes. New `services/homeAccess.ts` + rewritten `routes/homeAccess.ts`:
  owner-sent single-use invite (72 h, SHA-256 hash stored), public accept in one guarded
  transaction, reauthenticated credential changes; the old `/auth/home-access/enable` answers
  410 and `services/enableHomeAccess.ts` is deleted. `utils/mail.ts` reports delivery.
- Schema/migration: `HomeAccessInvite` model in both Prisma schemas and
  `20260906120000_home_access_invites` in both migration trees (generated with
  `prisma migrate diff`).
- Frontend: student settings card (guidance / classroom notice / reauthenticated update
  form), public `/home-access/accept` page, teacher roster "Invite parent" action,
  `utils/sessionAuth.ts`, EN + ES copy under `homeAccess.*` and
  `teacher.classDetail.homeAccess.*`.
- Tests: `homeAccessAuthority.test.ts` (25 cases, real JWTs through the mounted app, mocked
  Prisma/mail) and `homeAccessAuthority.db.test.ts` (7 cases on disposable PostgreSQL:
  never-bound gate, stranger teacher, two simultaneous first bindings, replay, email
  collision rollback, expiry, classroom vs home session on credential changes);
  `HomeAccessCard.test.tsx` (6 cases).
- Tests passed: yes (see PR for exact counts). Build clean: backend and frontend
  `tsc --noEmit`, ESLint on changed files.

## What Worked

Count-guarded `updateMany` on both the invite row and the user row inside one interactive
transaction gives exactly-one-winner semantics on Postgres READ COMMITTED with no extra
locking; the real-database suite confirmed one 200 / one 409 and a single used token.

## What Needed Editing

The pre-implementation Opus review caught that `homeAccessEnabled = false` also describes
email signups and Pathways registrants, so the gate became "never bound" (no email, no
password, flag off). It also caught the mount-order trap: the public accept routes must sit
on the pre-token router or a stale classroom token would 403 the parent's accept page.

The post-commit review found three things the tests had not: the session re-hydration
endpoint (`GET /get-progress`) omitted `homeAccessEnabled`, so the update form vanished after
a reload; class-login echoed the account email, which after binding is half of the family's
credential pair; and the Pathways routes shared the `/login` rate-limit bucket. All three were
fixed in the follow-up commit with tests for the first two. A second pass found that the
locale key for the accept page's validation hint had not actually landed (a shell quoting
failure swallowed the script) and that the same classroom session could still read the home
email through `/profile` and `/get-progress`; both endpoints now withhold `email` for
classroom-provenance sessions (HA-26/27) and the key exists in both languages. Two further
passes found the same value on `/users/:id`, `/edit-profile` and the avatar handlers, so the
fix became structural: `classroomResponseGuard` rewrites every JSON reply to a classroom
session so `email` / `parentEmail` are null at any depth (HA-28/29), with the per-route
nulling kept as defence in depth.

## Lessons

Provenance has to be stamped where the proof is verified (login/class-login), not inferred
later from role or flags; every sensitive route then reads one claim.

## Rating

4/5

---

## Correction pass — 2026-09-07 (PR #913, reviewed head 343e6f30)

### Prompt (excerpt)

```
Invitations must lose authority when their issuing relationship ends. Bind each invitation to the
exact relationship instance (enrollment) that authorized issuance; remove-and-recreate must never
revive an old token. Check issuing authority and relationship validity atomically with invitation
consumption and account binding. Coordinate with enrollment removal, class deletion, ownership
changes and loss of the inviter's teacher role; define acceptance-vs-revocation ordering and prove
both outcomes; never delete established home credentials when an enrollment ends. Already-issued
pending invitations without provenance fail closed. Reproduce through real routes with disposable
PostgreSQL. Ask Opus to challenge the revocation concurrency design first.
```

### Opus design challenge

Model self-report: "Opus 5 (1M context), claude-opus-5[1m]"; the agent stated it found **no
runtime evidence** of its model id — recorded as a self-description, not independent
verification. Material findings and dispositions:

- Deadlock: the class-delete transaction must revoke invitations **after** the enrollment delete
  (acceptance locks Enrollment → Course → User before the invite row) → moved last, with a
  4-round `Promise.all([accept, DELETE course])` probe (DB-872-14).
- A fresh invitation must revoke earlier unused ones (a mis-addressed token otherwise stays live
  for 72 h) → done in the issuing transaction (DB-872-3). An explicit revoke route is recorded as
  not built.
- The claim must be a compare-and-swap against the verified provenance → `enrollmentId` and
  `courseId` added to the invite `updateMany` where-clause.
- `FOR SHARE` on the transaction's own connection (`tx.$queryRaw`) is sufficient; `FOR UPDATE` /
  serializable are not needed; the FK `SET NULL` runs inside the deleting transaction, already
  serialized behind the acceptance's share lock → confirmed, no change.
- Role check: kept as "still the owning teacher" (the authority that issued the token), so a
  promotion to admin also fails closed (DB-872-11); noted as a deliberate divergence from the
  broader read grant in `authorization.ts`.
- 410 `invite_revoked` kept distinct from 404; one code for every failed relationship check.
- Forward migration keeps `enrollmentId` nullable (required by `SET NULL`); fail-closed lives in
  code and in the migration's revoke of provenance-less rows — chosen deliberately, both trees
  identical.
- CI: backend client regenerated after `npm ci`; `REQUIRE_TEST_DATABASE` turns a missing URL into
  a failure; migration trees diffed; `SESSION_SECRET` set explicitly.
- Cross-PR (#913 × #915): home-access binding puts an adult's email on a child's account, which
  #915 must not match against Pathways invitations → fixed on the #915 branch.

### What changed

Schema (both trees) + `20260907090000_home_access_invite_relationship` (courseId, enrollmentId,
revokedAt, FK SetNull, indexes, fail-closed UPDATE); `services/homeAccess.ts`
(`relationshipStillAuthorizes` locked/unlocked, `invite_revoked`, superseding invitations, CAS
claim); `routes/courses.ts` (revocation in the delete transaction); `docs/ops/home-access-credentials.md`;
`docs/agents/rules/40-security.md`; `.github/workflows/ci-cd.yml`; `__tests__/helpers/testDb.ts`.

### Evidence

- Migration proof on a fresh database: a pending invitation inserted under the previous migration
  is `revokedAt`-set by the correction migration; a used one is untouched. Fresh-DB and
  populated-DB `migrate deploy` both succeed; trees byte-identical.
- RED (reviewed-head service + course routes, new suite): 9 of 15 PostgreSQL cases fail — the
  old code binds after enrollment removal, ownership change, role loss, a committed concurrent
  removal, and with provenance-less tokens.
- GREEN: 15/15 PostgreSQL cases (incl. ROLLBACK/COMMIT ordering, 4 race rounds without an error),
  34 mocked cases.

### Rating

4/5 — the first design proved "who wins", not "who may still win".
