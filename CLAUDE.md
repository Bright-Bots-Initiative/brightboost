# Bright Boost — Claude Code Project Brief

> This file is read by Claude Code on every turn. Keep it current.
> Last updated: 2026-04-07

---

## Product

Bright Boost is a multilingual (English/Spanish/Vietnamese/Chinese) K–8 STEM learning platform.
Current rollout priority is **K–2**. Architecture and copy must support K–8.
Long-term pathway emphasis: AI, quantum, and biotech.

### Core Users

| User | What they care about |
|------|---------------------|
| Students (K–2 first) | Fun, readable, clear instructions, gamified learning |
| Teachers | Dashboard quality, evidence of progress, demo readiness |
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
- i18next / react-i18next (bilingual)

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

### Bilingual / i18n
- Never hardcode English strings in UI — use translation keys via `useTranslation()`
- When adding new copy, add keys to both `en.json` and `es.json`
- If Spanish translation is uncertain, add the English value with a `// TODO: translate` comment in the JSON

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

### Set 1 — Foundation (4 K-2 STEM games)

| Game | File | Game Key | Activity ID |
|------|------|----------|-------------|
| Bounce & Buds | `src/components/games/BounceBudsGame.tsx` | `buddy_garden_sort` | `bounce-buds` |
| Gotcha Gears | `src/components/games/GotchaGearsGame.tsx` | `gotcha_gears_unity` | `gotcha-gears` |
| Fix the Order (Lost Steps) | `src/components/games/BoostPathPlannerGame.tsx` | `boost_path_planner` | `lost-steps` |
| Rhyme & Ride | `src/components/games/RhymeRideGame.tsx` | `rhymo_rhyme_rocket` | `rhyme-ride` |

Additional K-2 modules (not in Set 1 gating):
- Tank Trek: `src/components/games/TankTrekGame.tsx` (`tank_trek`)
- Quantum Quest: `src/components/games/QuantumQuestGame.tsx` (`quantum_quest`)

### Set 2 — Exploration (5 K-2 STEM games, unlocked after Set 1 complete)

| Game | File | Game Key | Activity ID | Strand |
|------|------|----------|-------------|--------|
| Maze Maps & Smart Paths | `src/components/games/MazeMapsGame.tsx` | `maze_maps` | `maze-maps` | AI |
| Move, Measure & Improve | *(not yet implemented)* | `move_measure` | `move-measure` | Biotech |
| Sky Shield Patterns | *(not yet implemented)* | `sky_shield` | `sky-shield` | Quantum |
| Fast Lane Signals | *(not yet implemented)* | `fast_lane` | `fast-lane` | AI + Biotech |
| Qualify, Tune, Race | *(not yet implemented)* | `qualify_tune_race` | `qualify-tune-race` | Capstone |

### Set 3 — Mastery (placeholder, gates specialization)

Status: placeholder IDs only (`set3-game-1` through `set3-game-5`). No game components or seed data exist yet.

### Progression

- Each set has its own ID array in `src/constants/stemSets.ts`
- Set 1 (4 games) → Set 2 (5 games) → Set 3 (5 games) → Archetype unlock
- Set completion = all IDs in the set have `COMPLETED` progress records
- Set 2 unlocks when all Set 1 IDs are completed
- Set 3 completion gates specialization (AI / Quantum / Biotech archetype)
- Game registry: `src/components/games/gameRegistry.ts`

### Grade Bands

- **K-2** (`k2`): default band, all current games target this
- **Grades 3-5** (`g3_5`): infrastructure exists (ModuleFamily/ModuleVariant schema, API routes, seed data) but no game components are built yet
- Band is set per-class via `Course.gradeBand` field
- Teacher can switch band in class detail page
- 5 module families with g3_5 content configs are seeded but need React implementations

---

## Removed Features

### Build-a-Bot

- **Removed from canon** on 2026-04-07
- Was in **Set 1** as the 5th game (activity ID: `build-a-bot`)
- All references stripped: constants, localized content, seed data, docs
- Seed now auto-cleans up any existing Build-a-Bot activity data
- **Set 1 now has 4 games** — a 5th replacement game is needed to restore the original 5-per-set structure
- Completion logic updated to use each set's actual array length (not hardcoded 5)

---

## Current Audit Status

**Date: 2026-04-07**

### Set 2 Games Audit

- Maze Maps & Smart Paths — ✅ Implemented, registered, seeded, tests pass
- Move, Measure & Improve — ⚠️ Seeded in DB but no game component (falls through to ActivityPlayer unsupported fallback)
- Sky Shield Patterns — ⚠️ Seeded in DB but no game component
- Fast Lane Signals — ⚠️ Seeded in DB but no game component
- Qualify, Tune, Race — ⚠️ Seeded in DB but no game component
- Set 2 unlock gating: ✅ Works correctly (checks all Set 1 IDs completed)
- Set 2 locked UI: ✅ Shows locked cards with message until Set 1 complete
- Set 2 strand badges: ✅ Render on module cards

### Grade 3-5 Upgrades Audit (Set 1)

- Infrastructure: ✅ Schema (ModuleFamily, ModuleVariant, ClassModuleAssignment), API routes, seed data all present
- Bounce & Buds 3-5 ("Data Dash: Sort & Discover"): ⚠️ Content config seeded, no game component
- Gotcha Gears 3-5 ("Variable Quest: Fair Test Lab"): ⚠️ Content config seeded, no game component
- Lost Steps 3-5 ("Bug Lab: Sequence & Debug"): ⚠️ Content config seeded, no game component
- Rhyme & Ride 3-5 ("Motion Mission: Force Lab"): ⚠️ Content config seeded, no game component
- Tank Trek 3-5 ("Design Under Pressure: Bridge Lab"): ⚠️ Content config seeded, no game component
- Teacher band selector: ✅ Works in class detail page
- Student visibility by band: ✅ API exists (`/api/student/assigned-modules`), no frontend consumer yet

### Action Items

- [ ] Build 4 remaining Set 2 game components (move_measure, sky_shield, fast_lane, qualify_tune_race)
- [ ] Add a 5th game to Set 1 to replace Build-a-Bot (or promote Tank Trek / Quantum Quest)
- [ ] Build g3_5 game variants for the 5 module families
- [ ] Add student-facing UI for class-assigned modules (`/api/student/assigned-modules`)
- [ ] Add teacher module assignment UI (catalog browse + assign/reorder)
- [ ] Add i18n keys for Set 2 game content (currently using defaultValue fallbacks)
