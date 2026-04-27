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

## 6) Reduced-effects mode rollout (April 27, 2026)

A shared reduced-effects system is now implemented for React game wrappers.

- Shared hook: `useReducedGameEffects` reads OS/browser `prefers-reduced-motion`, supports manual override, and persists selection in localStorage key `brightboost.reducedGameEffects`.
- Shared UI: `ReducedEffectsToggle` appears in both `GameShell` and `LearningGameFrame` with accessible wording:
  - **Label**: “Reduced effects”
  - **Description**: “Reduces motion, particles, and visual intensity for smoother play.”
- Shared DOM state: wrappers expose `data-reduced-effects="true|false"` so games inherit consistent animation reductions via shared CSS.
- Shared CSS behavior: decorative animations (`sparkle`, `streak-fire`, shake/bounce/pulse, etc.) are reduced/disabled under reduced-effects mode while preserving core game feedback.

### Priority game coverage delivered

- **Bounce & Buds (`buddy_garden_sort`)**: decorative sparkle bursts are disabled in reduced-effects mode; scoring/physics unchanged.
- **Quantum Quest (`quantum_quest`)**: decorative starfield and hit-burst effects are reduced/disabled; gameplay logic unchanged.
- **Qualify, Tune, Race (`qualify_tune_race`)**: wobble/shake impact visuals are reduced in reduced-effects mode; collision/scoring unchanged.
- **Rhyme & Ride (`rhymo_rhyme_rocket`)**: now consumes shared reduced-effects state rather than only system media query, keeping behavior consistent with manual toggle and persistence.

### Light-touch inheritance checks

Games already using shared wrappers (including Fast Lane, Sky Shield, Maze Maps, and Data Dash) inherit wrapper-level reduced-effects behavior via shared CSS without learning/scoring changes.

## 7) Keyboard instructions + focus management rollout (April 27, 2026)

Shared game wrappers now include a reusable keyboard/control banner and safer, predictable focus flow.

- Added a shared `ControlInstructions` component and control-instruction model used across wrappers and priority games.
- `GameShell` now supports control instructions in mission briefings and game view, with default fallback instructions when a game does not provide custom guidance.
- `LearningGameFrame` now supports control instructions and links the game area to the instruction region for assistive technology context.
- Focus behavior now follows a stable intro → game → results path:
  - Intro/briefing focuses the primary Start action.
  - Game start focuses the labeled game area region.
  - Results focus the results heading without stealing focus during normal in-round feedback.
- Initial priority game guidance covered in this rollout:
  - Boost Path Planner
  - Tank Trek
  - Maze Maps
  - Qualify, Tune, Race
  - Rhyme & Ride
  - Data Dash

### Remaining future work

- Add deeper game-by-game keyboard-path tests for complex in-round control surfaces.
- Add axe-based integration checks for live game views and command-heavy mobile layouts.

## 8) Bright Rally co-op prototype rollout (April 27, 2026)

- `Play Hub` co-op tab now launches **Bright Rally: Pickleball Co-op Quest** instead of the placeholder.
- Scope for this release is **local single-device co-op simulation** (no real-time online multiplayer yet).
- Gameplay includes intro/instructions, rally play loop, team meter + boosts, and a results summary.
- Learning-powered boosts are unlocked from completed canonical STEM activity IDs (Set 1).
- Real-time co-op (invites/rooms/sync) remains future work.

## 9) Bright Rally polish pass (April 27, 2026)

- Controls tuned for fairer rallies:
  - gentler opening ball speed;
  - capped acceleration and vertical deflection to reduce chaotic misses;
  - explicit keyboard scroll prevention for rally keys.
- Difficulty curve now ramps in stages by rally count (early easy → medium → challenge) instead of abrupt jumps.
- CPU helper behavior for Player 2 is now intentional and deterministic when no right-side input is detected for a short window while the ball approaches.
- Teamwork feedback upgraded:
  - clearer Team Rally Meter percentage and near-ready messaging;
  - stronger Team Boost active/ready/filling text;
  - clearer streak status messaging.
- Upgrade clarity improved with child-friendly descriptions and an explicit unlocked-boost list.
- Friendly fallback shown when no boosts are unlocked: “Complete STEM games to unlock boosts...”.
- Court visuals polished with cleaner pickleball-style court lines and team side labels while keeping Bright Boost classroom-safe styling.
- Reduced-effects support and focus flow preserved.
- Added deterministic test coverage for:
  - difficulty progression helper;
  - CPU-helper fallback decision logic;
  - rally result payload shape;
  - reduced-effects DOM state;
  - progress-fetch failure resilience;
  - Play Hub co-op tab Bright Rally rendering.
