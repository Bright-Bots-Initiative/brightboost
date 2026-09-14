# Ticket #876 — Checkpoints can no longer manufacture completion

**Author:** Claude Code (Fable 5.1)
**Date:** 2026-09-14
**Sprint:** Audit remediation (tracker #870)
**Pod:** Build

## Intent

Close the audit's PROG-01 finding: the checkpoint endpoint accepted any bounded
activity id with `completed: true` and wrote `COMPLETED` directly, so five
self-checkpoints (three of them reserved Set 3 placeholders with no Activity
row) unlocked specialization. Make completion the job of exactly one writer,
validate the curriculum chain for both writers, and bind a submitted game
result to the activity's declared game.

## Prompt

```text
PR A — #876: close the checkpoint bypass and clarify the remaining boundaries.
Keep checkpoints in-progress only, preserve completed status on subsequent
checkpoints, and validate the Activity → Lesson → Unit → Module relationship
for both writers. Persist canonical curriculum identifiers. The eligibility
helper preserves BioTrail's existing restriction; broader backend enforcement
of set locks was deferred in #856 — document that boundary and preserve the
teacher-assignment policy. Keep the five-slot Set 3 gate and reserved
placeholders unchanged. Address #876's requested result semantics: validate
result.gameKey compatibility with the activity's game contract, preserving
legitimate aliases and existing scoring units; do not impose score <= total.
D1: reject completed: true with 400 and make sure Zod does not strip the field.
D2: defer the foreign key to a follow-up.
```

## What Claude Code Did

- `backend/src/services/progress.ts`: `ProgressWriteError`,
  `resolveActivityForWrite` (chain lookup; 404 for no Activity row, 400 for a
  module slug or lesson id that is not the activity's own; returns the chain's
  identifiers), `assertAdvancedEligibility` (the BioTrail block moved out of the
  route, now shared by both writers), and `upsertCheckpoint` that creates
  `IN_PROGRESS` and only ever increments time.
- `backend/src/validation/gameSpecific.ts`: `GAME_KEY_ALIASES`,
  `isCompatibleGameKey`, `declaredGameKey`.
- `backend/src/routes/progress.ts`: both writers resolve the activity first and
  persist canonical identifiers; complete-activity refuses a `result.gameKey`
  that does not name the declared game; the checkpoint route refuses
  `completed: true` with 400 and is wrapped by `answerAsyncErrors`.
- `backend/src/validation/schemas.ts`: the `completed` field stays declared so
  Zod does not strip it.
- Tests: `checkpointIntegrity.test.ts` (15 mocked cases),
  `checkpointIntegrity.db.test.ts` (the audit's reproduction on real
  PostgreSQL: five Set 3 checkpoints write nothing, the specialty gate stays
  closed, selection is 403; wrong chain refused; checkpoints accumulate time
  and keep `COMPLETED`), `gameKeyAliases.test.ts` (backend alias table equals
  the frontend registry's alias groups). Ten existing suites gained the chain
  on their mocked activity; `services/progress.test.ts` now falsifies the old
  `completed → COMPLETED` write.
- Docs: `docs/architecture/progress-integrity.md` (writers, readers, result
  semantics, the #856 boundary, the FK follow-up).
- Tests passed: yes (backend 388 passed / 55 skipped; the three real-database
  cases pass against Docker Postgres).
- Build clean: yes (lint, backend and frontend typecheck).

## What Worked

Writing the three suites first and running them against the untouched tree
gave the exact RED the audit described (checkpoint 200 → specialty unlocked →
BIOTECH 200) before any production code changed. Mirroring the frontend
registry's alias groups instead of inventing a new allowlist kept every
legitimate client key working.

## What Needed Editing

The first fixture script silently dropped two edits in one suite (a closure
bug in the helper), which showed up as 17 unexplained 400s; re-applying the two
edits fixed it. The database suite's teardown had to delete `GamePersonalBest`
before the user because that relation is RESTRICT (#831).

## Lessons

Every writer of an authoritative status should share one guard module; the
audit found the gap precisely because the two writers had drifted. A real-DB
reproduction of the audit's own steps is cheap with the existing harness and is
far more convincing than the mocked cases alone.

## Rating

4/5 — the fix is mechanical once the boundary is stated; the value was in
stating it.
