# K-8 Engagement Audit — Games, Reading, App-Wide Priorities

> Audit date: 2026-06-10 · Auditor: Claude Code session (pre-intern Polish phase)
> Method: full code inspection of all 10 game components, the shared game
> infrastructure, the ActivityPlayer reading/quiz surfaces, and seeded module
> content. **Scores derive from code + content reading, not live play-testing**
> — the audit environment cannot drive a browser. Where a score depends on
> feel (animation timing, audio absence), it is marked ⚠️ for a human
> play-test pass. Treat ⚠️ items as the first thing interns verify by hand.

---

## 1. Architecture summary — how games actually work

**All 10 active games are React components.** No iframes, no Unity in the
active path. The `_unity` suffixes in `gameRegistry.ts` are legacy aliases
pointing at React implementations (`gotcha_gears_unity → GotchaGearsGame`).
Unity wrapper components still exist under `src/components/activities/`
(`BounceBudsUnityActivity` etc.) but nothing in the registry routes to them.

| Layer | File | Role |
| --- | --- | --- |
| Registry | `src/components/games/gameRegistry.ts` | `gameKey → component` map incl. legacy aliases |
| Shared shell | `src/components/games/shared/GameShell.tsx` | Briefing → playing → results phases; stars, count-up, achievements, personal best, reduced-effects |
| Learning frame | `src/components/games/shared/LearningGameFrame.tsx` | Lighter wrapper (title/objective/vocabulary/control instructions) used by some games |
| Player | `src/pages/ActivityPlayer.tsx` | Routes INFO (story slides + quiz) vs INTERACT (game); injects `gradeBand`; fires `game_started`/`game_completed`; completion celebration card; break-time interstitial every 3 completions |
| Band content | `src/components/games/gradeBandContent.ts` | K-2 vs G3-5 rounds for BounceBuds/GotchaGears/+ |
| Reading content | `prisma/seed.cjs` activity `content` JSON | Story slides (1-3 sentences each, en+es), quiz questions with hints |

Flow: module page → activity → `ActivityPlayer` → (INFO: slides → quiz →
completion card with XP/level-up) or (INTERACT: GameShell briefing → game →
star results → completion card). Analytics fire in ActivityPlayer
(`game_started` on activity load, `game_completed` in `handleComplete`),
**not** in the games — so game-internal changes can't break tracking.

---

## 2. Scorecards

Scale 1–5 (5 = excellent). Justifications cite the file. ⚠️ = needs human
play-test confirmation.

### Set 1 — K-2 band

#### Bounce & Buds (`BounceBudsGame.tsx`, 830 lines)
| Criterion | Score | Why |
| --- | --- | --- |
| Text load | 4 | Briefing 2 sentences + 3 short tips; clue-driven rounds; no walls |
| Feedback immediacy | 4 | Sparkle burst on correct (8 particles), per-round feedback banner, streak counter |
| Touch targets & forgiveness | 4 | Drag-to-aim + tap-to-launch (`DRAG_THRESHOLD=12px`) is precision-light; ball docks to paddle |
| Visual energy | 4 ⚠️ | Emerald theme, sparkles, animated ball; no mascot presence in-game |
| Session shape | 4 | Rounds bounded by `BOUNCE_BUDS_ROUNDS[band]`; GameShell stars finish |
| Failure handling | **2** | **Lives system** — wrong gate = `lives - 1`; `newLives <= 0` ends the game early. A struggling 6-year-old gets a shortened session and a 💪 "Keep trying" screen instead of finishing |
**Biggest gap:** lives punish the exact kids who most need practice. → Backlog T2-1.

#### Gotcha Gears (`GotchaGearsGame.tsx`, 372 lines)
| Criterion | Score | Why |
| --- | --- | --- |
| Text load | 4 | 1-sentence story; clue + gear labels only |
| Feedback immediacy | 4 ⚠️ | Catch feedback + lives hearts row renders (line 309) |
| Touch targets & forgiveness | 3 ⚠️ | Lane-tap movement; gear fall speed from config (`speed: 2.5`) may demand timing precision — play-test |
| Visual energy | 4 | Falling gears, Gearbot framing |
| Session shape | 4 | Config-bounded rounds |
| Failure handling | **2** | Same lives pattern (`maxLives = 3`, kid-mode flags exist in config — `kidModeWrongNoLife` — but defaults need checking per-seed) |
**Biggest gap:** lives; mitigated if `kidModeWrongNoLife` is actually seeded true — verify seeds. → Backlog T2-1.

#### Rhyme & Ride (`RhymeRideGame.tsx`, 948 lines — largest game)
| Criterion | Score | Why |
| --- | --- | --- |
| Text load | 4 | i18n briefing (`games.rhymeRide.briefingStory`); word-family lanes |
| Feedback immediacy | 4 ⚠️ | Lane feedback present |
| Touch targets & forgiveness | 4 | Lane-based (3 big zones), not pixel targets |
| Visual energy | 5 | Bike-ride theme, most elaborate visual treatment of Set 1 |
| Session shape | 4 | Round-bounded |
| Failure handling | **2** | Lives (8 refs) |
**Biggest gap:** lives + G3-5 word-family content still unwired (CLAUDE.md known item).

#### Tank Trek (`TankTrekGame.tsx`, 656 lines)
| Criterion | Score | Why |
| --- | --- | --- |
| Text load | 4 | Bilingual briefing via `pickLocale`; program-the-robot steps are icon-driven |
| Feedback immediacy | 4 | Step-by-step execution playback |
| Touch targets & forgiveness | 5 | **No lives** — retry-friendly programming model; mistakes are information |
| Visual energy | 4 | Maze + robot movement |
| Session shape | 4 | Chapter structure (K-2 + appended G3-5 chapters) |
| Failure handling | **5** | Cannot dead-end; rerun freely |
**Set 1 gold standard for failure handling.** Biggest gap: none structural; polish only.

#### Quantum Quest (`QuantumQuestGame.tsx`, 650 lines)
| Criterion | Score | Why |
| --- | --- | --- |
| Text load | 4 | Bilingual briefing; math prompts short |
| Feedback immediacy | 5 | Hit effects at coordinates, streaks, shield/power-up feedback |
| Touch targets & forgiveness | 3 ⚠️ | Tap floating targets — moving-target precision for 5-year-olds needs play-test |
| Visual energy | 5 | Space theme, power-ups, sector progression — richest Set 1 game |
| Session shape | 4 | Sectors with life regen between (`Math.min(l + 1, 5)`) |
| Failure handling | 3 | Lives end game at 0 (`setGameOver(true)`) BUT shields save you and lives regenerate per sector — softened, not solved |
**Biggest gap:** moving-target precision at K-2 motor skill level ⚠️.

### Set 2 — Grades 3-5 band

**Headline: zero lives systems in Set 2** — every game is mastery-loop
shaped, which fits the band.

#### Maze Maps (`MazeMapsGame.tsx`, 671 lines)
| Criterion | Score | Why |
| --- | --- | --- |
| Challenge curve | 4 ⚠️ | Sweepers add planning pressure progressively |
| Agency & choice | 5 | Path choice is the entire mechanic |
| Progress visibility | **2** | Only 1 progress/streak ref vs 8 score refs — no visible round progress or streak UI during play |
| Light competition/mastery | 4 | GameShell personal best + replay |
| Humor & personality | 3 | "Byte Bot" naming; copy is functional, not funny |
| Clarity of goal | 5 | Collect orbs, avoid sweepers — instantly legible |
**Biggest gap:** in-game progress visibility.

#### Move & Measure (`MoveMeasureGame.tsx`, 438 lines)
| Criterion | Score | Why |
| --- | --- | --- |
| Challenge curve | 4 | Test → tune → retest structure is self-calibrating |
| Agency & choice | 5 | Player picks what to change |
| Progress visibility | 4 | 43 score refs — heavy measurement UI (it's the theme) |
| Light competition/mastery | 5 | "Beat your own measurement" is the loop |
| Humor & personality | 4 | "Test your body's superpowers!" |
| Clarity of goal | 4 | Multi-phase but each phase labeled |
**Strongest Set 2 game.** Gap: none structural.

#### Sky Shield (`SkyShieldGame.tsx`, 341 lines)
| Criterion | Score | Why |
| --- | --- | --- |
| Challenge curve | 4 ⚠️ | Pattern length ramps |
| Agency & choice | 3 | Placement only; pattern is dictated |
| Progress visibility | 4 | 15 round/streak refs |
| Light competition/mastery | 4 | Replay + best |
| Humor & personality | 3 | Functional copy |
| Clarity of goal | 5 | Watch pattern → place shield |
**Gap:** agency — consider shield-type choice (T3).

#### Fast Lane (`FastLaneGame.tsx`, 361 lines)
| Criterion | Score | Why |
| --- | --- | --- |
| Challenge curve | 4 ⚠️ | Signal complexity ramps |
| Agency & choice | 4 | Lane decisions under time |
| Progress visibility | 5 | 31 progress refs — best-instrumented Set 2 game |
| Light competition/mastery | 4 | Replay loop |
| Humor & personality | 3 | Functional |
| Clarity of goal | 5 | Read signal → pick lane |
**Gap:** none structural.

#### Qualify, Tune, Race (`QualifyTuneRaceGame.tsx`, 499 lines)
| Criterion | Score | Why |
| --- | --- | --- |
| Challenge curve | 4 | Capstone three-phase structure |
| Agency & choice | 5 | "Change one thing and see what happens" = the scientific method as a mechanic |
| Progress visibility | **3** | Only 3 progress refs; phase transitions could be more visible |
| Light competition/mastery | 5 | Race-again loop is the design |
| Humor & personality | 4 | Energetic briefing |
| Clarity of goal | 4 | Three phases need the briefing read |
**Gap:** phase-progress visibility (T2).

### Reading components (ActivityPlayer INFO mode — used by both bands)

| Criterion | Score (pre-Tier-1) | Why |
| --- | --- | --- |
| Reading level | 4 | Seeded slides are 1-3 short sentences, en+es (`prisma/seed.cjs` lines 326+) |
| Chunking | 5 | One thought per slide by construction |
| Interactivity | 3 | Linear slides → quiz at end; no checks woven between slides |
| Visual support | 3 | Icon or single image per slide; images decorative more than meaning-bearing |
| Typography | **3 → 4 after Tier 1** | Was `text-xl` centered; nav buttons 40px. Now `text-2xl leading-relaxed max-w-prose`, 44px nav, dot progress |
| "Why It Matters" hook | n/a | **Finding:** the 6-section "Why It Matters → Reading → …" structure named in the mission brief is the *Pathways* module structure, not K-8. K-8 is Module → Unit → Lesson → Activity(INFO/INTERACT). The K-8 INFO slides serve the Reading role; there is no per-module hook section to audit. Flagged so the intern backlog doesn't chase a phantom surface. |

**Quiz sub-surface (pre-Tier-1):** all questions on one scroll, 40px choice
buttons that clip long text (`justify-start` without wrap), Reset button
visually equal to Submit (accidental answer-wipe risk for K-2). Hints on
wrong answers ✓, gentle retry ✓, no per-question instant feedback ✗
(submit-all-at-once model — wrong shape for K-2; see Part 2 brief #2).

### Most common gap across everything
1. **Lives systems in 4 of 5 K-2 games** (Tank Trek the exception) — punishes the band that most needs forgiveness.
2. **40px default tap targets** anywhere the default `Button` is used (fixed in the player surfaces by Tier 1; per-game audit for in-game buttons remains).
3. **No audio support anywhere** — every K-2 instruction assumes a reader. ⚠️ Biggest structural gap for pre-readers; large effort (T3).

---

## 3. Tier 1 changes implemented (this PR)

All in `src/pages/ActivityPlayer.tsx` — the shared surface every reading and
quiz session crosses. Games were left untouched: GameShell already provides
briefing/stars/achievements/personal-best celebrations, briefing copy is
already short and energetic, and the remaining game gaps are logic-level
(Tier 2/3 below).

1. **Visual progress dots on story slides** — pre-readers can't parse
   "Slide 2 of 5"; filled/active/hollow dots they can. (Pattern mirrored
   from the Pathways welcome flow.)
2. **Slide text: `text-xl` → `text-2xl leading-relaxed max-w-prose`** —
   developing-reader comfort on the most-read student surface.
3. **44px+ tap targets** on slide nav (Back/Next/Start Quiz), quiz choices,
   Submit/Reset, fallback-INFO buttons, story-mode Back.
4. **Quiz choices wrap instead of clip** (`h-auto whitespace-normal py-3
   text-left`) — long answer options were truncating at `h-10`.
5. **Quiz prompt `text-lg`**.
6. **Submit/Reset hierarchy** — Submit is the hero (first, larger); Reset
   demoted to `variant="ghost"` so a K-2 student reaching for the primary
   action can't accidentally wipe every answer.
7. **Directional arrows** on Next/Start Quiz (icon affordance for
   pre-readers).
8. **Fallback INFO path** (legacy free-text activities): reading-comfort
   typography + two hardcoded "Back" strings replaced with the existing
   `activityPlayer.back` i18n key (was an i18n-rule violation).

Verification: lint ✅ typecheck ✅ `npm run build` ✅ (12.0s — first local
Windows build post-#601) · vitest **278 passed / 0 failed / 19 skipped** —
identical to the green baseline.

---

## 4. Prioritized backlog (intern-ready)

### Tier 2 — logic changes, well-bounded

**T2-1 · K-2 no-fail mode (lives → encouragement)** — *the highest-value item in this backlog*
- **Problem:** BounceBuds, GotchaGears, RhymeRide, QuantumQuest end the game when lives hit 0. K-2 rubric: mistakes should mean retry, never a shortened session.
- **Fix sketch:** for `gradeBand === "k2"`, replace life-loss with a gentle "try that one again" repeat of the same round (cap repeats at 2, then auto-advance with the answer shown). Keep lives for g3_5 where stakes-lite challenge fits. GotchaGears already has `kidModeWrongNoLife` config flags — extend that pattern to the other three.
- **Files:** the four game components + `gradeBandContent.ts` defaults; verify seeds set kid-mode flags.
- **Effort:** M (2-4 days). **Metric:** `game_completed`/`game_started` ratio for K-2 cohorts (completion rate target >50%).

**T2-2 · Per-question instant feedback in INFO quiz (K-2)** — see Part 2 brief #2.

**T2-3 · Set 2 in-game progress HUD (MazeMaps, QualifyTuneRace)**
- **Problem:** MazeMaps shows no round/streak progress during play (1 ref); QTR phase progress is weak (3 refs). The 3-5 rubric wants progress you can watch grow.
- **Fix sketch:** small top-bar HUD: round dots + streak flame, reusing the dot pattern now in ActivityPlayer. Pure presentational state already exists in both games.
- **Files:** `MazeMapsGame.tsx`, `QualifyTuneRaceGame.tsx`. **Effort:** S (1-2 days each). **Metric:** replay rate (repeat `game_started` same game_id per user).

**T2-4 · Reading interactivity: inline check-slides**
- **Problem:** INFO is read-5-slides-then-quiz; no checks woven in (interactivity 3/5).
- **Fix sketch:** support a `check` slide type in the content JSON (one question mid-deck, instant feedback, no scoring). ActivityPlayer renders it between story slides. Seed one per existing module.
- **Files:** `ActivityPlayer.tsx`, `prisma/seed.cjs` (+ backend mirror). **Effort:** M. **Metric:** INFO completion rate.

**T2-5 · Quiz: per-band question pagination** — one question per screen for K-2 (chunking), all-on-one for 3-5. **Files:** `ActivityPlayer.tsx`. **Effort:** S-M.

### Tier 3 — structural / new capability

**T3-1 · Audio instruction support for K-2** — speaker icon on every slide/briefing/quiz prompt; pre-recorded or TTS. The single biggest pre-reader gap; touches content pipeline. **Effort:** L (1-2 weeks incl. content).
**T3-2 · Mascot presence in games** — BrightBoostRobot reacts to correct/wrong from a corner anchor (visual energy + brand glue). **Effort:** M-L.
**T3-3 · Sky Shield shield-choice variant** (agency 3→4). **Effort:** M.
**T3-4 · G3-5 content for Set 2 + RhymeRide word families** (existing CLAUDE.md items). **Effort:** M-L.
**T3-5 · es/vi/zh-CN keys for Set 2 briefings** — currently hardcoded English (MazeMaps etc.), violating the i18n rule; Set 1 uses `pickLocale`/i18n correctly. **Effort:** S-M.

### Bugs found (not fixed here)

| Severity | Bug | Where |
| --- | --- | --- |
| Low | Hardcoded "Back" strings bypassed i18n (2 sites) | `ActivityPlayer.tsx` — **fixed in Tier 1** since trivial + in-scope |
| Low | `GameShell` builds Tailwind classes dynamically (`from-${tc}-500`) — works only because the themes used are in the safelist/content scan; a new themeColor would silently render unstyled | `GameShell.tsx` lines 334-376 |
| Info | Legacy Unity wrapper components + tests still in tree but unreachable from registry | `src/components/activities/*UnityActivity.tsx` |

---

## 5. Part 2 — Top-3 value/effort briefs

Candidates evaluated (10): teacher assignment UI, student assigned-panel,
K-2 quiz instant feedback, K-2 no-fail mode, teacher weekly evidence digest,
CSV roster import (already exists — `CSVImportModal.tsx`, excluded),
class-code login polish (already strong, excluded), Set-2 es translations,
printable student certificates, K-2 audio support.

Runner-up table:

| Candidate | Serves | Effort | Why not top-3 |
| --- | --- | --- | --- |
| K-2 no-fail mode | Students | M | High value but game-logic risk; sequenced after quiz feedback proves the pattern (it's backlog T2-1, do it 4th) |
| Set-2 es translations | Bilingual priority | S-M | Important, but moves no funnel metric directly |
| Printable certificates | Parents | M | Parent-visible artifact is real value but unproven demand; revisit post-1,000 |
| K-2 audio | Students | L | Biggest gap, wrong effort class for summer interns |

### Brief #1 — Close the assignment loop (teacher assigns → student sees)
- **Problem:** The backend already has module-assignment CRUD (`moduleCatalog.ts` — 5 routes incl. `GET /student/assigned-modules`, line 250) and the `ClassModuleAssignment` model, but **neither side has UI**. Teachers can't direct what their class plays; students see an undifferentiated catalog. Teacher direction is the core classroom loop — its absence is why a teacher demo stalls after class creation.
- **Change:** (a) Teacher class-detail page: "Assign modules" tab — catalog browse, assign/unassign, drag-reorder (routes exist). (b) Student dashboard: "Assigned this week" panel above the free-choice catalog, consuming the existing endpoint.
- **Files:** `TeacherClassDetail.tsx`, `StudentDashboard.tsx`, new `AssignedModulesPanel`; zero backend.
- **Metric:** `class_created → game_started` per-class funnel (PostHog); secondary `student_joined_class → game_completed` time-to-first-completion.
- **Effort:** M (3-5 days). **Risk:** low — additive UI on existing routes.

### Brief #2 — Per-question instant feedback in the K-2 quiz
- **Problem:** `ActivityPlayer.tsx` quiz is submit-all-at-once: a 6-year-old answers 3-5 questions blind, taps Submit, then gets told which were wrong. The feedback-immediacy rubric scores this 2/5 for K-2; hints only surface after a failed full submit.
- **Change:** for `gradeBand === "k2"`, check each answer on tap — correct locks in with a ✓ pop; wrong shakes gently and reveals the hint immediately; Submit becomes "Finish" enabled when all are green. Keep current model for 3-5.
- **Files:** `ActivityPlayer.tsx` only (gradeBand already injected). Tests: extend the quarantined `ActivityPlayerA11y` suite while un-skipping it.
- **Metric:** INFO-activity `game_completed`/`game_started` ratio for K-2; quiz reset-button usage (instrument later if needed).
- **Effort:** S-M (2-3 days). **Risk:** low-medium — completion logic untouched, only the gating UX.

### Brief #3 — Teacher weekly evidence digest on the dashboard
- **Problem:** Teachers drive adoption, and CLAUDE.md priority #2 is "dashboard quality and progress evidence" — but the dashboard shows activity lists, not evidence. The data already exists: `WeeklySnapshot` model (per-student weekly stats JSON), `PulseResponse` (pre/post), `Progress` rows, plus `reports.ts` routes. ShowcaseMode proves the appetite (it presents avgPreScore 2.8 → avgPostScore 4.1 — but with hardcoded numbers).
- **Change:** "This week in your class" card at the top of TeacherDashboard: activities completed, most-played game, students-needing-attention (no completions this week), pre→post movement where pulse data exists. Real queries, replacing ShowcaseMode's hardcoded story over time.
- **Files:** `TeacherDashboard.tsx` / `MainContent`, possibly one aggregate endpoint in `reports.ts` (extend, don't create new patterns).
- **Metric:** teacher week-2 retention (`login` retention cohort, role=teacher) — the headline adoption metric; secondary: teacher sessions/week.
- **Effort:** M (4-6 days incl. backend aggregate). **Risk:** medium (query cost — bound by class size).

**Why these three:** #1 and #3 are teacher-side (teachers drive the
1,000-account goal — weight doubled), both build on shipped-but-unsurfaced
backend, so effort is concentrated in UI where interns are strongest. #2 is
the highest student-engagement return per line of code in the audit and
de-risks the bigger T2-1 no-fail work by proving the instant-feedback
pattern in one file first.

---

## 6. Part 3 — The biggest homepage change for acquisition

**Recommendation: instant playable demo — one K-2 game playable on a public
route, one tap from the homepage hero. No signup, no auth.**

### The brief
- **Problem:** The landing page makes claims ("playful learning," "build
  STEM confidence") but offers no proof. A teacher arriving from a
  colleague's recommendation, on a phone, with 60 seconds, must currently
  sign up (form + terms) before seeing a single game — the product's whole
  pitch is *visible student engagement*, and the homepage shows none of it.
- **Change:** Public route `/try` rendering one game (Quantum Quest or
  Gotcha Gears — both run from a `config` prop with no API dependency)
  with a hardcoded 3-round K-2 config inside the existing GameShell
  (briefing → play → stars). The results screen gets one extra CTA:
  "Want to save your stars? Sign up free →" → `/signup`. Homepage hero gains
  a third, visually-primary button: **"▶ Try a game — no signup"**. Fire
  `demo_game_started` / `demo_game_completed` (two new typed union variants)
  client-side only — no DB writes, no auth, no backend.
- **Files:** new `src/pages/TryDemo.tsx` (~100 lines, mostly config), route
  in `App.tsx`, hero button in `Index.tsx`, 2 union variants in
  `analytics.ts`. **Effort:** M (2-3 days). **Risk:** low — fully isolated
  route; games are already self-contained components (verified: registry
  components take `config`/`onComplete` props only).
- **Metric:** headline funnel `$pageview → account_registered` conversion;
  diagnostic funnel `$pageview → demo_game_started → demo_game_completed →
  account_registered`.

### Why it beats the alternatives
- **vs. teacher-first proof (tour/video):** a playable game IS the tour, and
  it's the only version a teacher can forward to a colleague with "tap this,
  watch your kids' faces." Production video ≠ intern-codebase work.
- **vs. social-proof counter ("X of 1,000"):** needs a public count endpoint
  (deliberately avoided in the analytics phase) and has a cold-start trap —
  "41 of 1,000" reads as emptiness, not momentum. Revisit at ~600+.
- **vs. friction kill:** the big friction wins already shipped (PRs
  #598/#599 — signup entry points + form polish). The remaining friction is
  the existence of signup itself, which the demo bypasses *for evaluation*
  while keeping registration for value (saving progress).
- **vs. artifact showcase:** current artifacts (XP, badges) are not yet
  distinctive enough to carry the homepage; certificates don't exist yet.
- **Word-of-mouth fit:** the share unit becomes a *playable link*, not a
  brochure — that compounds organically in exactly the way the growth model
  requires.

---

## Appendix — verification log

- `npm run lint` clean · `npm run typecheck` clean · `npm run build` ✅ 12.0s
- `npx vitest run --exclude '**/*.stories.tsx'` → 278 passed / 19 skipped / 0 failed (baseline preserved)
- Analytics untouched: `game_started`/`game_completed` fire from
  `ActivityPlayer` load/`handleComplete`, which this PR did not modify
  (verified by diff — only JSX/classes around them changed)
