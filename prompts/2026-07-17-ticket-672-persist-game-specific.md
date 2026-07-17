# Persist gameSpecific on activity complete (Issue #672)

**Author:** Jack
**Date:** 2026-07-17
**Sprint:** —
**Pod:** Build

## Intent

Persist validated per-game telemetry (`gameSpecific`) from `POST /progress/complete-activity` onto `Progress`, without changing scoring/XP and without exposing kid-authored JSON on existing progress responses.

## Prompt

```
Followed the ticket spec and drove work in Cursor in a few passes — inventory
what games already send, add a strict per-game validation registry, wire it into
complete-activity, persist on Progress with an additive migration, align the
client result type, and cover it with colocated unit/route tests plus coverage
thresholds.

Before PR, ran lint, both typechecks, unit tests, coverage, and build, then
drafted the PR description and this prompt log.
```

## What Claude Code Did

- Files created/modified: `backend/src/validation/gameSpecific.ts`, `backend/src/validation/schemas.ts`, `backend/src/routes/progress.ts`, `prisma/schema.prisma`, `backend/prisma/schema.prisma`, `prisma/migrations/20260716015000_add_progress_game_specific/`, `src/services/api.ts`, colocated validation/route tests, `vitest.config.ts`, `package.json`
- Tests passed: lint ✓, root + backend typecheck ✓, `test:unit` 528 passed ✓, `test:coverage:gamespecific` (gameSpecific.ts 100%) ✓, `build` ✓

## What Worked

- Registry + `superRefine` + handler re-parse pattern kept validation pure and testable
- Colocated backend tests under the existing root Vitest unit project
- Keeping games read-only and fixing only the persistence / type path

## What Needed Editing

- Strip `gameSpecific` from complete-activity responses and pin `GET /progress` select so v1 does not change API shapes
- Narrow unregistered-`gameKey` warn to the 400 path (schema-derived key, no payload echo)
- Raise `qualify_tune_race` run `time` cap to 24h (wall-clock) so AFK mid-lap cannot 400 a completion

## Lessons

- Declaring a field as `z.unknown()` is what stops zod from stripping it; `superRefine` validates but does not transform — persist only after re-parse
- “Store but do not expose” needs both response stripping and explicit selects on list endpoints when Prisma would otherwise return new Json columns
- One prompt log at ticket close; keep Prompt vague and cite product paths only

## Rating

4/5 — AI carried implementation and tests; review still needed on the 400-vs-tolerate trade-off and the GPB.meta rationale.
