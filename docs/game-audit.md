# Bright Boost Game Component Audit

Date: April 27, 2026
Scope: React game components currently wired through `src/components/games/gameRegistry.ts` and game activity player integration.

## 1) Game component inventory and related files

### Registry-backed games (canonical keys)

| Game key | Component | Primary related files | Current tests |
|---|---|---|---|
| `boost_path_planner` | `BoostPathPlannerGame.tsx` | `gradeBandContent.ts`, `shared/LearningGameFrame.tsx`, `gameRegistry.ts` | `BoostPathPlanner.test.ts` |
| `rhymo_rhyme_rocket` | `RhymeRideGame.tsx` | `shared/GameShell.tsx`, `gameRegistry.ts` | Legacy tests under `RhymoRhymeRocket.test.ts` |
| `buddy_garden_sort` | `BounceBudsGame.tsx` | `gradeBandContent.ts`, `shared/GameShell.tsx`, `gameRegistry.ts` | `BounceBuds.test.ts` |
| `gotcha_gears_unity` | `GotchaGearsGame.tsx` | `gradeBandContent.ts`, `shared/GameShell.tsx`, `gameRegistry.ts` | no dedicated game-unit tests found |
| `tank_trek` | `TankTrekGame.tsx` | `gradeBandContent.ts`, `shared/GameShell.tsx`, `gameRegistry.ts` | no dedicated game-unit tests found |
| `quantum_quest` | `QuantumQuestGame.tsx` | `shared/GameShell.tsx`, `gameRegistry.ts` | no dedicated game-unit tests found |
| `data_dash_sort_discover` | `DataDashSortDiscoverGame.tsx` | `shared/GameShell.tsx`, `gameRegistry.ts` | `DataDashSortDiscover.test.ts` |
| `maze_maps` | `MazeMapsGame.tsx` | `shared/GameShell.tsx`, `gameRegistry.ts` | `MazeMaps.test.ts` |
| `move_measure` | `MoveMeasureGame.tsx` | `shared/GameShell.tsx`, `gameRegistry.ts` | no dedicated game-unit tests found |
| `sky_shield` | `SkyShieldGame.tsx` | `shared/GameShell.tsx`, `gameRegistry.ts` | no dedicated game-unit tests found |
| `fast_lane` | `FastLaneGame.tsx` | `shared/GameShell.tsx`, `gameRegistry.ts` | no dedicated game-unit tests found |
| `qualify_tune_race` | `QualifyTuneRaceGame.tsx` | `shared/GameShell.tsx`, `gameRegistry.ts` | no dedicated game-unit tests found |

### Aliases/wrappers and activity integration

- Alias keys in registry: `sequence_drag_drop`, `rhyme_ride_unity`, `bounce_buds_unity`.
- Legacy compatibility wrappers: `LostStepsGame.tsx`, `BuddyGardenSortGame.tsx`, `RhymoRhymeRocketGame.tsx`.
- Player integration: `src/pages/ActivityPlayer.tsx` resolves game keys from content and `GAME_COMPONENTS`.
- Shared game frame infrastructure: `src/components/games/shared/GameShell.tsx`, `src/components/games/shared/LearningGameFrame.tsx`, `src/components/games/shared/game-effects.css`.

## 2) Per-game audit report and scoring

Scoring scale: 1 (poor) to 5 (excellent). Scores are based on static code review and existing tests, not full playtest telemetry.

### Boost Path Planner
- Scores: UX **4**, Engagement **4**, Performance **4**, Accessibility **3**, Mobile **3**, Educational integration **5**.
- Strengths: clear objective framing and level progression; tied to grade-band content.
- Risks/issues: keyboard and screen-reader affordances are less explicit than larger arcade-style games.
- Improvements: add dedicated ARIA labels and explicit keyboard instructions in-game.

### Rhyme & Ride (`RhymeRideGame`)
- Scores: UX **5**, Engagement **5**, Performance **4**, Accessibility **4**, Mobile **4**, Educational integration **5**.
- Strengths: strong pacing, lane interaction model, multilingual content hooks.
- Risks/issues: heavy animation intensity could overwhelm low-power devices.
- Improvements: expose explicit “reduced effects” toggle in addition to passive reduced-motion handling.

### Bounce & Buds (`BounceBudsGame`)
- Scores: UX **4**, Engagement **5**, Performance **3**, Accessibility **3**, Mobile **4**, Educational integration **5**.
- Strengths: tactile interactions; clear clue → gate loop.
- Risks/issues: physics loop and frequent state updates can be expensive on weaker devices.
- Improvements: batch non-visual state updates into refs where possible and profile RAF cadence.

### Gotcha Gears
- Scores: UX **4**, Engagement **4**, Performance **3**, Accessibility **3**, Mobile **4**, Educational integration **4**.
- Strengths: quick round loops and clue matching are easy to understand.
- Risks/issues: no dedicated game test file; catch/miss timing edge cases likely under-tested.
- Improvements: add tests for miss penalties and clue/answer mapping fallback fields.

### Tank Trek
- Scores: UX **5**, Engagement **4**, Performance **4**, Accessibility **3**, Mobile **3**, Educational integration **5**.
- Strengths: high instructional alignment (planning and debugging steps) and chapter progression.
- Risks/issues: command-heavy UI may be dense on small phones.
- Improvements: add compact mobile command tray and larger tap targets.

### Quantum Quest
- Scores: UX **4**, Engagement **5**, Performance **3**, Accessibility **3**, Mobile **3**, Educational integration **4**.
- Strengths: strong motivation loop and rich feedback.
- Risks/issues: many simultaneous animated targets can impact frame rate.
- Improvements: cap active entities by device capability and lazy-disable particle effects.

### Data Dash: Sort & Discover
- Scores: UX **4**, Engagement **4**, Performance **4**, Accessibility **4**, Mobile **4**, Educational integration **5**.
- Strengths: evidence-based reasoning and charting support learning goals.
- Risks/issues: rule-inference feedback could be more specific when wrong.
- Improvements: provide targeted hint text based on the selected wrong rule.

### Maze Maps & Smart Paths
- Scores: UX **4**, Engagement **4**, Performance **4**, Accessibility **3**, Mobile **4**, Educational integration **5**.
- Strengths: deterministic sweeper patterns build good prediction practice.
- Risks/issues: no dedicated keyboard tutorial assertability in tests.
- Improvements: add test coverage for collision hint triggers and wait action.

### Move, Measure & Improve
- Scores: UX **4**, Engagement **4**, Performance **4**, Accessibility **3**, Mobile **4**, Educational integration **5**.
- Strengths: clear compare/improve loop and formative feedback.
- Risks/issues: lacks dedicated tests for phase transitions and scoring.
- Improvements: add pure helper exports for scoring to enable stable unit testing.

### Sky Shield Patterns
- Scores: UX **4**, Engagement **4**, Performance **4**, Accessibility **3**, Mobile **4**, Educational integration **4**.
- Strengths: predictable pattern scaffolding with non-violent language.
- Risks/issues: mystery-light logic currently has limited explicit test coverage.
- Improvements: add tests around challenge generation constraints.

### Fast Lane Signals
- Scores: UX **4**, Engagement **4**, Performance **4**, Accessibility **3**, Mobile **4**, Educational integration **4**.
- Strengths: phased progression from simple to look-ahead reasoning.
- Risks/issues: randomness can produce inconsistent perceived fairness.
- Improvements: introduce seeded random option for deterministic classroom mode + tests.

### Qualify, Tune, Race
- Scores: UX **4**, Engagement **5**, Performance **3**, Accessibility **3**, Mobile **3**, Educational integration **4**.
- Strengths: strong experiment/compare framing and capstone feel.
- Risks/issues: high animation + collision checks can be expensive; small lane controls on phones.
- Improvements: expose low-motion mode and larger swipe-friendly lane controls.

## 3) Cross-cutting issues found

1. **Missing tests in multiple games**: several core games have no dedicated unit test file (Gotcha Gears, Tank Trek, Quantum Quest, Move Measure, Sky Shield, Fast Lane, Qualify Tune Race).
2. **Accessibility opportunities**: status updates and progress badges were not consistently announced by assistive tech in shared wrappers.
3. **Minor render jank risk**: `GameShell` results sparkle positions were regenerated on each render, causing visual jitter and unnecessary random recomputation.
4. **Defensive safety gap**: `RhymoRhymeRocketGame` assumed round existence and could theoretically crash if state drifted out of bounds.

## 4) Safe incremental improvements implemented

1. **Improved shared accessibility semantics** in `LearningGameFrame`:
   - uses a labeled section landmark;
   - progress and feedback now expose `role="status"` with `aria-live="polite"`.
2. **Reduced unnecessary re-randomization** in `GameShell` results sparkle effects by memoizing sparkle layout once per results view.
3. **Added defensive guard** in `RhymoRhymeRocketGame` for undefined rounds and improved choice button labeling.
4. **Added/updated tests**:
   - new `LearningGameFrame` test coverage for live regions and vocabulary rendering;
   - existing Rhymo helper tests retained and re-run.

## 5) Remaining recommendations (next increments)

1. Add deterministic unit tests for untested games via pure scoring/transition helpers.
2. Add keyboard instruction banners and explicit focus management in each game intro.
3. Add low-performance graphics mode shared flag across all RAF-heavy games.
4. Add automated a11y checks for game views (axe + keyboard path smoke tests).
5. Add mobile snapshot tests for command-heavy games (Tank Trek / Qualify Tune Race).

