# Bright Boost — Claude Code Project Brief

> This file is read by Claude Code on every turn. Keep it current.
> Last updated: 2026-04-08

---

## Product

Bright Boost is a multilingual (English/Spanish/Vietnamese/Chinese) K–8 STEM learning platform
with a secondary-age program layer called **Pathways** (ages 14-17).
Current rollout priority is **K–2**. Architecture and copy must support K–8 and Pathways.
Long-term pathway emphasis: AI, quantum, and biotech.

### Core Users

| User | What they care about |
|------|---------------------|
| Students (K–2 first) | Fun, readable, clear instructions, gamified learning |
| Students (Pathways, 14-17) | Career-connected learning, cybersecurity, real skills |
| Teachers (K–8) | Dashboard quality, evidence of progress, demo readiness |
| Facilitators (Pathways) | Cohort management, learner progress, partner readiness |
| School/community partners | Pilot readiness, measurable outcomes, bilingual access |

### Product Priorities (ranked)

1. K–2 usability and readability
2. Teacher dashboard quality and progress evidence
3. Bilingual English/Spanish consistency
4. Gamified learning that stays educational, structured, measurable
5. Pilot/demo readiness for schools and partners
6. Clean, minimal regression risk in every change

---

## Source of Truth Order

When repository information conflicts, resolve using this order:

1. **Actual code** — imports, runtime behavior, component trees
2. **package.json** — scripts, engines, dependencies
3. **prisma/schema.prisma** — data model
4. **Root README.md**
5. **Current passing tests**
6. **Other docs** in active use
7. **Legacy docs** — only if code proves they are still active

### Known Conflicts

- `package.json` declares Node 20.x; `frontend/CONTRIBUTING.md` may reference Node 18.
- `backend/README.md` may reference AWS Lambda/Aurora — this is stale. Production is Railway/Supabase.
- If you find a new conflict, **flag it explicitly** in your response. Do not silently choose one side.

---

## Tech Stack

### Frontend
- React 18, TypeScript, Vite
- Tailwind CSS, shadcn/ui, Framer Motion
- React Router v6
- i18next / react-i18next (en, es, vi, zh-CN)

### Backend
- Node.js 20.x, Express, TypeScript
- Prisma ORM → PostgreSQL / Supabase

### Infrastructure
- Hosting: Railway
- DB: Supabase (PostgreSQL)

### Testing & Quality
- Vitest (unit)
- Cypress (e2e)
- Storybook (component dev)
- ESLint + Prettier

---

## Commands

```bash
# Install
npm install

# Dev servers
npm run dev                # frontend
cd backend && npm run dev  # backend

# Quality
npm run lint
npm run test
npm run typecheck
npm run storybook

# Database
npm run db:init
npx prisma migrate dev
npx prisma generate
```

---

## Repo Rules

### Code Style
- Functional React components and hooks only — no class components
- Follow existing folder conventions and patterns before inventing new ones
- TypeScript strict mode — no `any` unless absolutely necessary and commented

### Change Philosophy
- **Minimal diff over broad refactor** — always
- Do not rewrite unrelated files
- Do not change architecture unless the task explicitly requires it
- Prefer narrow, production-safe edits
- Reuse existing components, hooks, utilities, and patterns

### Multilingual / i18n
- Never hardcode English strings in UI — use translation keys via `useTranslation()`
- When adding new copy, add keys to `en.json` and `es.json` at minimum; also `vi.json` and `zh-CN.json` if possible
- Locale files: `src/locales/{en,es,vi,zh-CN}/common.json`
- If a translation is uncertain, add the English value with a `// TODO: translate` comment
- Use `pickLocale()` from `src/utils/localizedContent.ts` for game content data (non-UI strings)
- Use `translateContentName()` for database-sourced module/activity names

### Educational Intent
- Do not replace Bright Boost's learning intent with generic gameplay
- Preserve the educational objective, pacing, readability, and instructional clarity
- If recreating older game concepts in React, keep the original learning goal and feel intact
- K–2 content must use simple vocabulary, large tap targets, clear visual hierarchy

### UX Consistency
- Keep teacher and student flows consistent with existing app patterns
- Maintain onboarding and instruction clarity inside games/activities
- Prioritize readability for K–2 over visual complexity

---

## Workflow — How to Execute Every Task

### Before Coding
1. **Inspect** — Read relevant files, adjacent components, services, tests, translation files, and route patterns
2. **Explain current behavior** — What does the app do right now?
3. **Explain proposed approach** — What will you change and why?
4. **Identify risks and assumptions** — What could break? What are you guessing about?

### When Coding
1. Make the smallest viable change
2. Match existing patterns — check adjacent files first
3. Avoid unrelated refactors
4. Add translation keys, not hardcoded strings
5. Preserve educational intent

### Before Finishing
1. Run `npm run lint`, `npm run test`, `npm run typecheck` when possible
2. List every file changed
3. Summarize what changed and why it fits Bright Boost
4. Note any follow-up work or risks

---

## Task Spec Template

Use this structure for every task:

```
## Intent
[One sentence: what needs to be built/fixed]

## Context
[Why this matters for Bright Boost, who it affects, where it sits in the product]

## Relevant Areas
[Likely files, routes, components, services, schema, or tests]

## Current Behavior
[What the app does now]

## Desired Behavior
[What it should do after the change]

## Acceptance Tests
- [ ] specific behavior 1
- [ ] specific behavior 2
- [ ] specific behavior 3

## Edge Cases
- edge case 1
- edge case 2

## Constraints
- Preserve bilingual support
- Keep K–2 readability
- Avoid unrelated regressions
- Match current code patterns
- Do not change architecture unless necessary
```

---

## Quality Definition

"Good" for Bright Boost means ALL of these, not just clean code:

- ✅ K–2 clarity — simple words, large UI, clear flow
- ✅ Educational intent preserved — learning goal intact
- ✅ Bilingual consistency — both languages work, keys not hardcoded
- ✅ Teacher demo readiness — dashboards show real progress
- ✅ Minimal regression risk — small diff, existing patterns reused
- ✅ Matches existing conventions — not a new architecture opinion

---

## Anti-Patterns — Never Do These

- ❌ Silently choose one side of a doc conflict without flagging it
- ❌ Hardcode English strings in JSX
- ❌ Broad refactor when a narrow fix works
- ❌ Replace educational game logic with generic gameplay
- ❌ Introduce new architectural patterns without being asked
- ❌ Assume AWS/Lambda/Aurora docs are current
- ❌ Skip inspecting adjacent files before writing code
- ❌ Optimize for code elegance at the expense of K–2 usability

---

## Bright Boost Defaults (quick reference)

```
K–2 first, K–8 aware
English + Spanish always (also vi + zh-CN)
Minimal diff over broad refactor
Teacher + student flow consistency
Educational clarity over flashy complexity
Preserve original game/module intent
Trust current code over stale docs
Flag conflicts, don't hide them
```

---

## Game Architecture

### Set 1 — Foundation (5 K-2 STEM games)

| Game | File | Game Key | Activity ID |
|------|------|----------|-------------|
| Bounce & Buds | `src/components/games/BounceBudsGame.tsx` | `buddy_garden_sort` | `bounce-buds` |
| Gotcha Gears | `src/components/games/GotchaGearsGame.tsx` | `gotcha_gears_unity` | `gotcha-gears` |
| Fix the Order (Lost Steps) | `src/components/games/BoostPathPlannerGame.tsx` | `boost_path_planner` | `lost-steps` |
| Rhyme & Ride | `src/components/games/RhymeRideGame.tsx` | `rhymo_rhyme_rocket` | `rhyme-ride` |
| Tank Trek | `src/components/games/TankTrekGame.tsx` | `tank_trek` | `tank-trek` |

Additional K-2 module (not in Set 1 gating):
- Quantum Quest: `src/components/games/QuantumQuestGame.tsx` (`quantum_quest`, `quantum-quest`)

### Set 2 — Exploration (5 K-2 STEM games, unlocked after Set 1 complete)

| Game | File | Game Key | Activity ID | Strand |
|------|------|----------|-------------|--------|
| Maze Maps & Smart Paths | `src/components/games/MazeMapsGame.tsx` | `maze_maps` | `maze-maps` | AI |
| Move, Measure & Improve | `src/components/games/MoveMeasureGame.tsx` | `move_measure` | `move-measure` | Biotech |
| Sky Shield Patterns | `src/components/games/SkyShieldGame.tsx` | `sky_shield` | `sky-shield` | Quantum |
| Fast Lane Signals | `src/components/games/FastLaneGame.tsx` | `fast_lane` | `fast-lane` | AI + Biotech |
| Qualify, Tune, Race | `src/components/games/QualifyTuneRaceGame.tsx` | `qualify_tune_race` | `qualify-tune-race` | Capstone |

### Set 3 — Mastery (placeholder, gates specialization)

Status: placeholder IDs only (`set3-game-1` through `set3-game-5`). No game components or seed data exist yet.

### Progression

- Each set has its own ID array in `src/constants/stemSets.ts`
- Set 1 (5 games) → Set 2 (5 games) → Set 3 (5 games) → Archetype unlock
- Set completion = all IDs in the set have `COMPLETED` progress records
- Set 2 unlocks when all Set 1 IDs are completed
- Set 3 completion gates specialization (AI / Quantum / Biotech archetype)
- Game registry: `src/components/games/gameRegistry.ts`

### Grade Bands

- **K-2** (`k2`): default band, all current games target this
- **Grades 3-5** (`g3_5`): content variants built for Bounce & Buds and Gotcha Gears. Content loaded via `gradeBandContent.ts` based on `config.gradeBand`. Other games fall back to K-2 content.
- Band is set per-class via `Course.gradeBand` field
- Teacher can switch band in class detail page
- ActivityPlayer injects `gradeBand` from student's enrolled course into game config
- `useGradeBand()` hook (`src/hooks/useGradeBand.ts`) fetches student's class band

### Test Accounts (All)

| Email | Password | Type | Role | Notes |
|-------|----------|------|------|-------|
| teacher@school.com | password123 | K-8 | Teacher | Demo class owner |
| student@test.com | password | K-8 | Student | Incomplete Set 1 |
| explorer@test.com | explore123 | K-8 | Student | Set 1 complete, Set 2 unlocked |
| jordan@test.com | jordan123 | K-8 | Student | Grade 3-5 class, fresh |
| facilitator@test.com | pathway123 | Pathways | Facilitator | ETO cohort manager |
| marcus@test.com | marcus123 | Pathways | Student (Launch) | 3/7 Cyber Launch done |
| aisha@test.com | aisha123 | Pathways | Student (Explorer) | Fresh, 0 completions |

---

## Removed Features

### Build-a-Bot

- **Removed from canon** on 2026-04-07
- Was in **Set 1** as the 5th game (activity ID: `build-a-bot`)
- All references stripped: constants, localized content, seed data, docs
- Seed now auto-cleans up any existing Build-a-Bot activity data
- **Replaced by Tank Trek** as Set 1's 5th game — Set 1 is back to 5 games
- Completion logic uses each set's actual array length (not hardcoded)

---

## Current Audit Status

**Date: 2026-04-08**

### Set 1 Games (5 games) — with pathway strand labels
- Bounce & Buds (Biotech) — ✅ K-2 + g3_5 content via `gradeBandContent.ts`
- Gotcha Gears (Quantum) — ✅ K-2 + g3_5 content via `gradeBandContent.ts`
- Fix the Order (AI) — ✅ K-2 + g3_5 levels via `gradeBandContent.ts` (wired into BoostPathPlannerGame)
- Rhyme & Ride (AI + Biotech) — ✅ K-2 (g3_5 config.gradeBand available, word family integration pending)
- Tank Trek (Quantum + AI) — ✅ K-2 + g3_5 chapters appended via `TANK_TREK_G35_LEVELS`

### Set 2 Games (5 games) — with pathway strand labels
- Maze Maps (AI) — ✅ Implemented, registered, seeded, tests pass
- Move & Measure (Biotech) — ✅ Implemented and registered
- Sky Shield (Quantum) — ✅ Implemented and registered
- Fast Lane (AI + Biotech) — ✅ Implemented and registered
- Qualify & Race (Capstone) — ✅ Implemented and registered

### Hidden/Archived Modules
- `stem-1-intro` ("Quantum Explorers") — hidden via `HIDDEN_MODULE_SLUGS` in `stemSets.ts`

### Grade 3-5 Content Pipeline
- `gradeBandContent.ts` — ✅ Central content registry with K-2 and g3_5 variants
- `useGradeBand()` hook — ✅ Fetches student's class band from API
- ActivityPlayer — ✅ Injects `gradeBand` into game config
- BounceBudsGame — ✅ Wired (reads gradeBand, loads g3_5 rounds)
- GotchaGearsGame — ✅ Wired (reads gradeBand, loads g3_5 rounds)
- BoostPathPlannerGame — ✅ Wired (uses BOOST_PATH_LEVELS[band])
- TankTrekGame — ✅ Wired (appends g3_5 chapters)
- RhymeRideGame — ⚠️ config.gradeBand available but word family integration pending
- Jordan test student — ✅ Seeded in g3_5 class

### Pathways Facilitator Resources
- Program Overview — ✅ What is Pathways, bands, how it works, facilitation tips
- Session Guide — ✅ 6-week pacing table for Cyber Launch
- Printable Resources — ✅ Overview, discussion questions, progress tracker (with Print button)
- Route: `/pathways/facilitator/resources`

### Action Items
- [ ] Wire g3_5 word families into RhymeRideGame (data exists in gradeBandContent, game integration pending)
- [ ] Build g3_5 content variants for Set 2 games (future sprint)
- [ ] Add student-facing "Assigned This Week" UI consuming `/api/student/assigned-modules`
- [ ] Add teacher module assignment UI (catalog browse + assign/reorder via existing CRUD routes)
- [ ] Add es/vi/zh-CN translations for g3_5 game content in `gradeBandContent.ts`
- [ ] Add es/vi/zh-CN translations for Set 2 game i18n keys (currently using `defaultValue` fallbacks)

---

## Pathways (Secondary-Age Program Layer)

Bright Boost Pathways is a separate program experience for 14-17 year olds, running alongside the K-8 platform in the same codebase. It has its own routing, layout, data models, and visual design.

### Architecture
- **Bands**: Explorer (14-15) and Launch (16-17)
- **Tracks**: 5 career-connected learning tracks, each with multiple modules
- **Cohorts**: Facilitator-created groups of learners, with join codes
- **Active track**: Cyber Launch (cybersecurity) — fully playable with 7 modules
- **Coming soon**: Build Your Own Lane, Money Moves, Future Tech Lab, Creative Media Lab

### Routes
```
/pathways/about         — public landing page (no auth)
/pathways               — student home (authenticated)
/pathways/tracks        — all tracks browse
/pathways/tracks/:slug  — track detail + module list
/pathways/tracks/:trackSlug/:moduleSlug — module player
/pathways/profile       — learner profile + portfolio
/pathways/facilitator   — facilitator dashboard + cohort management
```

### Data Models (additive to existing schema)
- `PathwayCohort` — facilitator-created group with band, site partner, join code, active tracks
- `PathwayEnrollment` — links users to cohorts (unique per user+cohort)
- `PathwayMilestone` — per-user progress through track modules (unique per user+track+module)
- `User` extended with: `userType` ("k8" | "pathways"), `ageBand` ("explorer" | "launch"), `birthYear`

### Key Files
- `src/constants/pathwayTracks.ts` — track + module registry
- `src/components/pathways/PathwaysLayout.tsx` — dark-mode sidebar layout
- `src/components/pathways/PathwaysHome.tsx` — student home
- `src/components/pathways/TracksOverview.tsx` — all tracks browse
- `src/components/pathways/TrackDetail.tsx` — module timeline
- `src/components/pathways/ModulePlayer.tsx` — module wrapper
- `src/components/pathways/modules/CyberLaunchModules.tsx` — 7 Cyber Launch modules
- `src/components/pathways/FacilitatorDashboard.tsx` — cohort management
- `src/components/pathways/PathwaysAbout.tsx` — public landing
- `backend/src/routes/pathways.ts` — all Pathways API routes

### Cohort
- Name: "ETO Spring 2026 — Cyber Cohort"
- Join code: `ETO2026`
- Site partner: Escape The Odds

### Design Principles
- Dark mode default (indigo/teal/slate palette)
- No mascots, no cartoons — clean modern UI
- Direct, empowering language for teens
- Separate visual identity from K-2/K-8 experience
- Same auth system, same Prisma DB, different routes and layout

---

## Authentication & Login Flow

The app has a **unified login page** at `/login` (`src/pages/LoginSelection.tsx`) supporting two entry methods:

### Email + Password Login
- Works for: K-8 teachers, K-8 students with email, Pathways facilitators, Pathways students with email
- POST `/api/login` → JWT token + user object
- Post-login routing by `user.userType` + `user.role`:
  - `k8` + `teacher` → `/teacher/dashboard`
  - `k8` + `student` → `/student/dashboard`
  - `pathways` + `teacher` → `/pathways/facilitator`
  - `pathways` + `student` → `/pathways`
- Logic lives in `src/contexts/AuthContext.tsx` redirect effect

### Join Code Entry
- Works for: K-8 class codes AND Pathways cohort codes
- POST `/api/auth/lookup-code` → returns `{ type: "k8_class" | "pathways_cohort" }`
- K-8 class code → redirects to `/class-login` (existing emoji picker flow)
- Pathways cohort code → shows registration form (name, optional email, password, birth year)

### Pathways Registration
- POST `/api/auth/register-pathways` — creates user with `userType: "pathways"`, derives `ageBand` from `birthYear`
- If no email provided, auto-generates `student_XXXXXX@brightboost.local`
- Enrolls in cohort, returns JWT token

### Returning Pathways Students
- Students with email → use email login (Option A)
- Students without email → enter cohort code → pick name from roster → enter password
- GET `/api/auth/cohort-roster/:code` → list of enrolled student names
- POST `/api/auth/pathways-code-login` → login with cohort code + userId + password

### Token Storage
- JWT stored in `localStorage` under `bb_access_token`
- User object in `localStorage` under `user`
- Token expiry: 7 days
- Session validation on app load via `/api/get-progress`

### Schema Sync Warning
- Both `prisma/schema.prisma` (root) and `backend/prisma/schema.prisma` must be kept in sync
- The backend Docker build generates Prisma client from the backend copy
- If models are added to root but not backend → backend `tsc` fails → deployment breaks silently
