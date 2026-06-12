# Grade 3-5 First Set — Audit & Buildout

**Date:** 2026-06-11 · **Verified with:** `jordan@test.com` (grade 4, class GRADE35, band `g3_5`)

## Band assignment (how a student lands in g3_5)

```
Course.gradeBand ("k2" default | "g3_5")
  → student enrollments (GET /api/student/courses)
  → useGradeBand(): highest band across enrolled courses, cached per-user
  → ActivityPlayer injects gradeBand into every game config at render time
  → games call getGradeBand(config) and load banded content
Missing band / API error → silent "k2" fallback (by design).
```

Fixed in this pass:
1. **Class creation now captures the band** — the create-class dialog has a K-2 / Grades 3-5 selector (was: name only, silent k2 default; teachers had to find the switcher in class detail).
2. **Per-user band cache** — `useGradeBand` cached in a module variable with no user key; logout → login as a different student in the same tab served the previous student's band.
3. **Race-safe story overrides** — band resolves async, so banded story/quiz content is applied at render time (`applyG35StoryOverrides` memo in ActivityPlayer), never at parse time.

## Coverage matrix

| Game | Set | Before | After |
|---|---|---|---|
| Bounce & Buds | 1 | ✅ g3_5 rounds wired (9: photosynthesis, xylem, fair tests) | unchanged |
| Gotcha Gears | 1 | ✅ g3_5 rounds wired (8: CPU, loops, validation, APIs) | unchanged |
| Rhyme & Ride | 1 | ❌ data authored but `void (config?.gradeBand)` — 3-5 kids got cat/bat/hat | ✅ 3 worlds × 2 ending-pattern families (-tion/-ment/-ight/-ound/-ence/-ain), 1.25× speed, "Which word ends like" prompt |
| Tank Trek | 1 | ✅ 3 g3_5 levels, solver-proven pars | unchanged |
| Quantum Quest | 1 | ❌ none — counting ⭐⭐⭐ and 2+3 for a fourth-grader | ✅ 3 g3_5 sectors: multiplication, division, patterns, fractions, order of operations |
| Set 1 story-quizzes | 1 | ❌ all 5 modules served K-2 slides/questions to every band | ✅ g3_5 slides + 3 questions × 4 choices per module, en+es (`G35_STORY_QUIZZES`) |
| Maze Maps / Move & Measure / Sky Shield / Fast Lane / Qualify & Race | 2 | ❌ none | backlogged (below) |

**A 3-5 student's first set is now:** the same Set 1 → 2 → 3 progression shell (band-blind by design, "Set 1 of 3" stepper on the dashboard), with all five Set 1 games AND all five story-quizzes serving genuinely upper-elementary content.

## Content bugs caught mechanically

- `RHYME_FAMILIES.g3_5` distractors **"cement"** (-ment) and **"silence"** (-ence) literally end with their family's pattern — an honest answer would be marked wrong. Fixed (→ talent, advance) and now guarded by `RhymeRideBands.test.ts` for all bands: every word must end with the pattern, no distractor may.
- -ight distractors weight/eight/height also end with the literal letters "ight" (though they don't rhyme); since the HUD shows the letter pattern as the cue, they were replaced (→ great, wait, street, point).
- `XP_MULTIPLIER` (g3_5 = 1.2×) was a dead export — XP is computed server-side (`XP_PER_ACTIVITY`, clamped), so the promised boost never happened anywhere. Removed; see backlog if banded XP is wanted for real.

## Backlog (intern-ready briefs)

### B1 — Set 2 banded content (per game, ~1 day each)
Pattern to follow is now established three ways: rounds (`BOUNCE_BUDS_ROUNDS`), levels (`TANK_TREK_G35_LEVELS`), sectors (`QUANTUM_QUEST_G35_SECTORS`) — all in `src/components/games/gradeBandContent.ts`, all band-switched via `getGradeBand(config)` inside the existing component (never fork a component). Each game: author g3_5 data, switch on band, add a data-integrity test mirroring `RhymeRideBands.test.ts` / the QQ decoy guard. Command/level-based games must pass the Tank Trek solvability guard pattern.

### B2 — es/vi/zh-CN for existing en-only round content (~0.5 day)
`GOTCHA_GEARS_CONTENT` and `BOUNCE_BUDS_ROUNDS` (both bands) hold raw English strings. Convert `clueText`/labels to localized records and render via `pickLocale()` (see how `TANK_TREK_G35_LEVELS.names` does it). Update the two game components + their tests. en+es required; vi/zh-CN if possible.

### B3 — ModuleFamily "lab experience" decision (product call, then ~1 week+ each)
`prisma/seed.cjs` seeds 5 designed-but-unbuilt g3_5 lab modules (`moduleFamily`/`moduleVariant` with `contentConfig` specs: Quantum Mission, Motion Mission, Data Dash, Variable Quest, Bridge Lab) feeding `/api/student/assigned-modules`, which has **no student UI**. Decide: build them as the long-term g3_5 experience, or retire the seed data. Until then the in-game banding (this PR) is the g3_5 experience.

### B4 — Banded XP (server-side, touch with care)
If g3_5 should earn more XP, it must happen in `backend/src/routes/progress.ts` (look up the student's course band, scale `xpAward` before the clamp). That code is anti-exploit hardened ("Sentinel" comments) — change it only with a test proving the clamp still holds.

## Test guards added

- `RhymeRideBands.test.ts` — word/distractor pattern integrity, both bands
- `QuantumQuest.test.ts` (extended) — band resolution order + decoy/answer collision guard + skill coverage
- `GradeBandStoryQuizzes.test.ts` — 5 modules × (3 slides + 3 questions × 4 choices), en+es present, K-2 passthrough untouched
- `useGradeBand.test.tsx` — band resolution, user-switch cache isolation, k2 error fallback
