# K-2 STEM Set 2 Expansion

## Overview

Set 2 adds 5 new K-2 STEM modules that unlock after a student completes all 5 Set 1 modules. Once unlocked, all 5 Set 2 modules are available simultaneously (no internal sequential gating).

## Set 2 Modules

| # | Module | Slug | Activity ID | Game Key | Strand |
|---|--------|------|-------------|----------|--------|
| 6 | Maze Maps & Smart Paths | k2-stem-maze-maps | maze-maps | maze_maps | AI |
| 7 | Move, Measure & Improve | k2-stem-move-measure | move-measure | move_measure | Biotech |
| 8 | Sky Shield Patterns | k2-stem-sky-shield | sky-shield | sky_shield | Quantum |
| 9 | Fast Lane Signals | k2-stem-fast-lane | fast-lane | fast_lane | AI + Biotech |
| 10 | Qualify, Tune, Race | k2-stem-qualify-tune-race | qualify-tune-race | qualify_tune_race | Capstone |

## Gating Rules

- **Set 1 complete** = all 5 Set 1 activity IDs have status `COMPLETED` in the Progress table
- Set 1 IDs: `bounce-buds`, `gotcha-gears`, `lost-steps`, `rhyme-ride`, `build-a-bot`
- Once Set 1 is complete, all 5 Set 2 modules unlock at once
- No sequential lock inside Set 2
- "Visited" is not "completed" - completion requires finishing the main challenge activity

## Architecture

### Data Model

No schema changes required. Set 2 uses the existing Module -> Unit -> Lesson -> Activity hierarchy. Each Set 2 module has:
- 1 Story activity (kind: INFO)
- 1 Game activity (kind: INTERACT)

### Gating Logic

- `src/constants/stemSets.ts` — canonical Set 2 IDs, names, strands, perks, and `isSet2Locked()` / `isSet1Complete()` utilities
- `src/lib/moduleAccess.ts` — `isSet2ModuleSlug()` and `checkSet2Locked()` for UI gating
- `src/pages/Modules.tsx` — renders locked cards for Set 2 when Set 1 is incomplete

### Seed Data

- `prisma/seed.cjs` — seeds all 5 Set 2 modules with story slides, quiz questions, and game content references

## Key Files Changed

| File | Change |
|------|--------|
| `src/constants/stemSets.ts` | Real Set 2 IDs, names, strands, perks, gating utils |
| `src/lib/moduleAccess.ts` | `isSet2ModuleSlug()`, `checkSet2Locked()` |
| `src/pages/Modules.tsx` | Split into Set 1 / Set 2 sections, locked card UI, strand badges |
| `src/utils/localizedContent.ts` | Set 2 module name translations (es/vi/zh-CN) |
| `src/locales/*/common.json` | `modules.locked`, `modules.set1Label`, `modules.set2Label`, `modules.set2LockedMessage` |
| `prisma/seed.cjs` | 5 Set 2 module/unit/lesson/activity records |

## How to Seed / Test

```bash
# Seed the database with Set 2 modules
npx prisma db seed

# Verify Set 2 appears locked
# 1. Log in as a student who hasn't completed all Set 1 modules
# 2. Navigate to /student/modules
# 3. Set 2 section should show with lock icons and "Complete your first 5 STEM Games..." message

# Verify Set 2 unlocks
# 1. Complete all 5 Set 1 game activities
# 2. Refresh /student/modules
# 3. Set 2 cards should be fully interactive with strand badges
```

## Follow-Up Items

1. **Game implementations** — The 5 Set 2 game components need to be built. Currently they fall through to ActivityPlayer's "unsupported" fallback. Each needs a React game component registered in `gameRegistry.ts`.
2. **Upper-elementary (g3-5) expansion** — The `gradeBand` field on Course and band-filtered module variants are designed but not yet implemented. Infrastructure is ready.
3. **Analytics events** — Add `pack_2_locked_viewed`, `pack_2_unlocked`, `module_started`, `module_completed` events when an analytics system is adopted.
4. **Teacher preview** — Allow teachers to preview Set 2 modules regardless of their own progress (role-based override).
5. **Feature flag** — Wrap Set 2 behind `brightboost_k2_set2` flag once a flag system is added.
6. **Set 3 activation** — Replace Set 3 placeholder IDs with real modules when ready.
