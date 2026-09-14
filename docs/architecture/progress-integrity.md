> **Canonical for:** progress writers, completion authority, and the set-lock boundary. Last verified against code: 2026-09-14.

# Progress integrity

`Progress` rows drive rewards, the level formula, avatar backfill and repair, the
specialty gate, module maps, reports and student stats. `Progress.activityId` has
no foreign key to `Activity`, so the writers are the only thing that keeps the
table honest. This page records who may write what, and where enforcement
deliberately stops.

## Writers

| Route                                  | Writes                                       | Must hold before any write                                                                                                                                                                                                  |
| -------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/progress/complete-activity` | `COMPLETED`, rewards, personal best          | Activity exists (404); body `moduleSlug` and `lessonId` match its Lesson → Unit → Module chain (400); BioTrail prerequisite (400/403); `result.gameKey` names the activity's declared game or a registry alias of it (400). |
| `POST /api/progress/checkpoint`        | `IN_PROGRESS` create, `timeSpentS` increment | Self only (#871, 403); `completed: true` refused (400); same chain and BioTrail checks as above.                                                                                                                            |

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

## Follow-up

A real foreign key `Progress.activityId → Activity.id` is the structural fix.
It is deferred to #918 (data cleanup, migration in both trees, and the
delete behaviour for re-seeded curriculum) rather than landed with #876.
