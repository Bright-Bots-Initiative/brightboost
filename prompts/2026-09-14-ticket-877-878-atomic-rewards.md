# Tickets #877 + #878 — One transaction for the completion claim and every reward

**Author:** Claude Code (Fable 5.1)
**Date:** 2026-09-14
**Sprint:** Audit remediation (tracker #870); folds in #849
**Pod:** Build

## Intent

Close DATA-01 (a transient failure after the completion claim left the row
`COMPLETED` with its rewards permanently skipped) and DATA-02 (two different
activities crossing one level boundary both awarded the bonus and overwrote
each other's stat changes), and make the avatar repair path safe against the
same race.

## Prompt

```text
PR B — #877/#878: make the entire authoritative reward operation atomic. Keep
the transaction covering the completion claim, base rewards, stat changes,
level transition, and ability grants; every database operation within that
boundary must use tx, including inside checkUnlocks. Calculate rewards from
the locked current avatar; calculate response deltas against the locked
pre-reward snapshot. Preserve avatar creation/backfill, the reward-free
replay and personal-best contracts; run analytics and personal-best
reconciliation after commit. Account for the avatar repair writer with a
locked reread or conditional update. Qualify the "never deadlock" claim and
document locking assumptions. Use controlled interleavings with real
PostgreSQL transactions; cover failure after base rewards, during ability
grants, two completions crossing one boundary, capped stat gains, same-
activity duplicates, missing-avatar races, the repair race, and exactly-once
after retry. D3: roll back and permit an idempotent retry. D4: fold #849 with
justified settings and pool-pressure evidence, and address its personal-best
scope.
```

## What Claude Code Did

- `backend/src/routes/progress.ts`: the claim and every reward run in one
  `prisma.$transaction`: `createMany` (ensure, never completes) → predicated
  `updateMany` (claim) → `SELECT … FOR UPDATE` on the Avatar row → base
  reward from the locked row → `checkUnlocks(…, tx)` → `findUniqueOrThrow`.
  A lost claim answers as a replay; a throw rolls everything back and answers 500. Deltas are computed against the locked snapshot. Analytics and the
  personal best run after commit. The personal-best catch names P2024/P2028
  distinctly (#849).
- `backend/src/services/game.ts`: `checkUnlocks` takes a database handle; the
  level transition is a guarded `updateMany` claim followed by a re-read;
  ability grants use `skipDuplicates`.
- `backend/src/routes/avatar.ts`: the repair write is a conditional
  `updateMany` on `xp = 0` at the observed level.
- `backend/src/utils/prisma.ts`: `transactionOptions { maxWait: 5000,
timeout: 5000 }` with the measured justification (#849).
- Tests: `progressRewards.db.test.ts` (real PostgreSQL; lock-holding
  interleavings and scoped triggers: boundary contested once, three fault
  boundaries with exactly-once retry, same-activity duplicate, missing-avatar
  race, repair race), `progressRewardsPool.db.test.ts` (connection_limit=2:
  30 concurrent completions; a 3 s row hold that fails 7 of 8 under the
  default maxWait and passes under 5 s), `avatarRepair.test.ts`,
  `personalBestPoolLimit.test.ts`, `GameShellRetry.test.tsx` (the results
  screen keeps the result and Finish after a failed save); nine existing
  suites re-armed for the new call shape with their properties unchanged.
- Docs: `docs/architecture/progress-integrity.md` gained the transaction,
  lock order, deadlock qualification and the other Avatar writers.
- Tests passed: yes. Build clean: yes.

## What Worked

Holding the Avatar row from a test transaction and proving the requests are
still pending before releasing it turned "run it ten times" into a genuine
contested execution. Scoped triggers gave deterministic faults at each
boundary without any test-only seam in production code.

## What Needed Editing

A helper that both mutated a shared string and returned a value silently
dropped two edits (once in PR A, once here); every replacement is now
asserted. Leftover rows from a failed teardown produced a wrong ability
count until the teardown order respected the RESTRICT relations.

## Lessons

Make the post-claim read a distinct call (`findUniqueOrThrow`) from the
pre-transaction probe (`findUnique`): it is semantically right (the row must
exist) and it keeps mocked suites re-armable without per-test surgery.

## Rating

4/5.
