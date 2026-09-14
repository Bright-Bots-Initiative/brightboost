> **Canonical for:** progress writers, completion authority, and the set-lock boundary. Last verified against code: 2026-09-14 (#876, #877/#878).

# Progress integrity

`Progress` rows drive rewards, the level formula, avatar backfill and repair, the
specialty gate, module maps, reports and student stats. `Progress.activityId` has
no foreign key to `Activity`, so the writers are the only thing that keeps the
table honest. This page records who may write what, and where enforcement
deliberately stops.

## Writers

| Route                                  | Writes                                                                       | Must hold before any write                                                                                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/progress/complete-activity` | `COMPLETED`, rewards, level, abilities (one transaction), then personal best | Activity exists (404); body `moduleSlug` and `lessonId` match its Lesson → Unit → Module chain (400); BioTrail prerequisite (400/403); `result.gameKey` names the activity's declared game or a registry alias of it (400). |
| `POST /api/progress/checkpoint`        | `IN_PROGRESS` create, `timeSpentS` increment                                 | Self only (#871, 403); `completed: true` refused (400); same chain and BioTrail checks as above.                                                                                                                            |

Both writers persist the chain's own `moduleSlug` and `lessonId`, never the
body's, and both go through `resolveActivityForWrite` and
`assertAdvancedEligibility` in `backend/src/services/progress.ts` (#876).

A checkpoint never writes `status`. A row that complete-activity has marked
`COMPLETED` stays so through any number of later checkpoints. Completion has
exactly one writer because everything downstream trusts the status:

| Reader                                                          | Trusts                                   |
| --------------------------------------------------------------- | ---------------------------------------- |
| `checkUnlocks` (level = 1 + ⌊completed / 2⌋)                    | count of `COMPLETED` rows                |
| `ensureAvatarWithBackfill`, `GET /avatar/me` repair             | count of `COMPLETED` rows                |
| `GET /avatar/specialty-status`, `POST /avatar/select-archetype` | `COMPLETED` ids against `STEM_SET_3_IDS` |
| Module map, reports, student stats, assignments                 | `moduleSlug` / `lessonId` / status       |

## Result semantics

`result.gameKey` selects telemetry validation (`GAME_SPECIFIC_SCHEMAS`) and the
`GamePersonalBest` row. It must name the game the activity declares in
`Activity.content.gameKey`, or a legacy alias the frontend registry routes to
the same implementation (`GAME_KEY_ALIASES` in
`backend/src/validation/gameSpecific.ts`; a parity test fails when the two
drift). An activity that declares no game accepts no `result.gameKey`.

Score units stay the game's own. Nothing compares `score` with `total`, and the
other result fields are bounded but not validated per game; a per-game result
schema is separate work (see #876).

## What the backend does not enforce

- **Set 1 / 2 / 3 locks are presentation-only** (#856, owner-deferred). Direct
  completion of a locked set's activity is accepted server-side. The only
  learner-progress prerequisite the backend enforces is BioTrail's: the matching
  earned specialty plus a complete Set 3.
- **Teacher assignments may target any module.** The assignment surface applies
  no visibility rules (#856); completion still goes through complete-activity
  and its checks.
- **The five-slot Set 3 gate and its reserved placeholders are unchanged.**
  `set3-game-2`, `set3-game-4` and `set3-game-5` have no Activity row, so no
  writer can produce a row for them; specialization stays locked until each
  placeholder is replaced by a shipped game (`shared/progression/stemSetIds.ts`).

## The reward transaction and its locks (#877 / #878)

A completion's authoritative rewards are one interactive transaction in
`POST /api/progress/complete-activity`:

1. Ensure the Progress row exists as `IN_PROGRESS` (`INSERT … ON CONFLICT DO
NOTHING`); this never completes anything.
2. Claim the transition with a predicated `updateMany` (status not
   `COMPLETED`). Zero rows means a racing completion owns it: nothing has
   been written and the request answers as a replay.
3. Lock the learner's Avatar row with `SELECT … FOR UPDATE`. Every stat
   below is computed from that locked row, never from the pre-transaction
   read, and the response deltas are taken against it.
4. Base reward (XP increment, clamped energy/HP/speed/control/focus).
5. Level: `checkUnlocks` runs on the same transaction, counts completed rows
   (which now include this claim), and claims the transition with a guarded
   `updateMany` (`level < computed`), so the bonus and any ability grants
   happen once per boundary.
6. Commit. Analytics and the personal best (`GamePersonalBest`, a record, not
   a reward) run afterwards and never join this transaction.

Any throw inside rolls back the claim together with the rewards; the request
answers a JSON 500 and the client's retry re-claims and awards exactly once.
Nothing partial is ever answered as success.

**Response deltas.** `xpDelta` / `levelDelta` are the transaction's own change
against the locked snapshot. When the request also created the learner's
avatar (backfill from historical completions), the XP and levels that backfill
created are added on top; the level delta is never derived from the final
level, because another completion may cross a boundary between the backfill
and this request's lock, and that level belongs to the other reply.

**Lock order and deadlocks.** Every completion takes the Progress row (step 2)
and then the Avatar row (step 3), then inserts into `UnlockedAbility`. Two
completions therefore never wait on each other in a cycle: the same activity
serialises on the Progress row and the loser claims nothing; different
activities serialise on the Avatar row. Should PostgreSQL ever detect a
deadlock with another writer (40P01), or the pool or transaction limits trip
(P2024 / P2028, see `backend/src/utils/prisma.ts`), the transaction is
rolled back, the request answers 500 and the retry is idempotent.

**Other Avatar writers, and what each assumes.**

| Writer                                    | Discipline                                                                                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| complete-activity reward transaction      | Row lock for the transaction; deltas from the locked snapshot.                                                                                                       |
| `GET /avatar/me` repair                   | Conditional `updateMany` (`xp = 0` at the observed level): a reward committed between read and write makes it match nothing.                                         |
| `ensureAvatarWithBackfill` (first avatar) | Create; a P2002 loser re-reads the winner's row and reports no backfill.                                                                                             |
| `POST /avatar/select-archetype` (#888)    | Not changed here: still an unconditional update plus grants; its own ticket owns the GENERAL → SPECIALIZED claim. The Avatar row lock above is the pattern to reuse. |

## Follow-up

A real foreign key `Progress.activityId → Activity.id` is the structural fix.
It is deferred to #918 (data cleanup, migration in both trees, and the
delete behaviour for re-seeded curriculum) rather than landed with #876.
