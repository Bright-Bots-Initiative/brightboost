# Bright Boost — Claude Code Project Brief

> Read by Claude Code on every turn. Keep it current; every stale line misleads a future session.
> Last verified against code: 2026-07-01

---

## What this is

Bright Boost is a multilingual (English/Spanish/Vietnamese/Chinese) K–8 STEM learning platform with a
secondary-age program layer, **Pathways** (ages 14–17, cybersecurity-first). Current rollout priority is
**K–2**; architecture and copy must support K–8 and Pathways. Long-term strand emphasis: AI, quantum, biotech.

Ranked product priorities: (1) K–2 usability/readability, (2) teacher-dashboard quality and progress
evidence, (3) EN/ES consistency, (4) gamified learning that stays educational and measurable,
(5) pilot/demo readiness for schools and partners, (6) minimal regression risk in every change.

---

## Commands (verified 2026-07-01)

```bash
npm install                    # root; backend deps are separate: cd backend && npm install
npm run dev                    # vite on http://localhost:5173 (strictPort; proxies /api -> localhost:3000)
cd backend && npm run dev      # ts-node src/server.ts on port 3000; needs DATABASE_URL + DIRECT_URL in backend/.env
npm run lint                   # eslint, zero-warnings policy (~25s)
npm run typecheck              # tsc --noEmit — FRONTEND ONLY (src/); backend: cd backend && npm run typecheck
npm run test                   # vitest run --mode=ci: unit project (jsdom, incl. backend tests) + storybook
                               #   browser project (needs playwright chromium) — ~1 min total
npm run test:unit              # unit project only (no browser needed) — the light/fast option
npm run test:e2e               # cypress run (needs the app running); cy:open for interactive
npm run storybook              # storybook dev on port 6006
npm run db:init                # prisma migrate deploy (ROOT schema) + seed — read Migrations gotcha first
npx prisma generate            # root schema dual-generates BOTH clients (frontend + backend)
```

Traps:
- `npm run start` runs a **build**, not a server (deploy artifact; misleading name).
- Root `npm run typecheck` gives false confidence for backend changes — backend TS errors only surface
  via `cd backend && npm run typecheck` (this is the schema-drift failure mode below).
- `npm run test` fails without playwright browsers installed; fall back to `test:unit`.

Node: **20.x** (`package.json` engines + `.nvmrc`). `frontend/CONTRIBUTING.md` still says Node 18 — stale.

---

## Environment gotchas (these burn sessions)

### CI: `db-check` is red on every PR — expected
The `db-check` job (`.github/workflows/ci-cd.yml`: postgres service → `prisma migrate deploy` →
`npm run test:db`) **fails on every PR** until the migration-baseline bug **#646** lands, because the
committed migration history cannot build the schema from scratch (~13 tables incl. Avatar never CREATEd).
A red db-check is not a signal about your change. **Never make db-check a required check** until #646 is
fixed. (Verified failing on open PRs #662, #663.)

### Migrations: two trees, broken history — do not "fix" ad hoc
- Migrations exist in BOTH `prisma/migrations/` (root) and `backend/prisma/migrations/`. The **root
  schema/migrations are authoritative for deploys**: `backend/scripts/predeploy.sh` and backend
  `db:migrate`/`db:generate` prefer `../prisma/schema.prisma`. The two trees are supposed to stay in
  sync but are **currently diverged** (root has 24 migration dirs, backend 14) pending #646.
- `prisma migrate dev` / `migrate deploy` against a **fresh** DB fails at the known-broken history.
  Don't patch the history ad hoc — that's #646's job. `predeploy.sh` deliberately tolerates the failure
  and boots on the existing schema; the old `db push --accept-data-loss` fallback was intentionally
  removed (it risked silent data loss). See the comments in `backend/scripts/predeploy.sh`.

### Schema sync: root vs backend copy
`prisma/schema.prisma` (root, dual generators) and `backend/prisma/schema.prisma` must be kept in sync.
The backend **Docker build** generates its Prisma client from the **root** schema
(`backend/Dockerfile:16-17`), as do predeploy and the backend `db:*` scripts — the backend-local copy is
a sync mirror; keep it matching so local backend workflows and deploys see the same models.

### Test accounts (seeded by `prisma/seed.cjs`)
Seed is find-or-create and **always refreshes password hashes**, so these plaintext values always work:

| Email | Password | Role | Notes |
|-------|----------|------|-------|
| teacher@school.com | password123 | K-8 Teacher (Ms. Frizzle) | Demo class owner |
| student@test.com | password | K-8 Student | Incomplete Set 1 |
| explorer@test.com | explore123 | K-8 Student | Set 1 complete, Set 2 unlocked |
| jordan@test.com | jordan123 | K-8 Student | Grade 3-5 class (`GRADE35`), fresh |
| facilitator@test.com | pathway123 | Pathways Facilitator (Coach Davis) | ETO cohort manager |
| marcus@test.com | marcus123 | Pathways Student (Launch) | 3/7 Cyber Launch done |
| aisha@test.com | aisha123 | Pathways Student (Explorer) | Fresh, 0 completions |

Class join codes seeded: `STARS1` (K-2 emoji-login demo class "Ms. Frizzle's Star Class", band k2,
with 3 emoji students: Nova ⭐ / Comet 🚀 / Luna 🌙, no PIN), `GRADE35` and `UPPER35` (both grade
3-5). Pathways cohort code: `ETO2026` ("ETO Spring 2026 — Cyber Cohort", partner "Escape The Odds
— South Side"; ended pilot: `ETO2025F`).

### Misc
- Slack notifications are optional — without `SLACK_WEBHOOK_URL` they silently no-op (`backend/src/utils/slack.ts`).
- Docker postgres (docker-compose-pg.yml) runs on port **5435**.

---

## Conventions

- `main` is protected: no direct pushes, **1 approving review** (pod lead or Nathaniel; authors can't
  approve their own PR; cross-pod PRs get both leads), **linear history** — squash merge preferred.
- Branches: `your-name/short-description`. Conventional commits (`feat:`/`fix:`/`docs:`/...).
- Log significant Claude Code prompts in `prompts/`. Intern guide: `docs/prompting-guide.md`.
- Full workflow: `CONTRIBUTING.md` (pod leads: Alice Lin — Build, Catarina Lucas Herrera — Experience).
- Labels, priority (`P0`/`P1`/`P2`) & delegation: canonical in `docs/team-workflow.md`.

### Code style
- Functional React components + hooks only; TypeScript strict, no `any` unless commented.
- **Minimal diff over broad refactor, always.** Match adjacent files' patterns before inventing new ones.
  Reuse existing components/hooks/utils. No architecture changes unless the task requires it.

### i18n (never hardcode UI English)
- UI strings via `useTranslation()` keys. New copy goes to `en.json` + `es.json` at minimum (also
  `vi`/`zh-CN` when possible); uncertain translations get English + `// TODO: translate`.
- Locale files: `src/locales/{en,es,vi,zh-CN}/{common,pathways}.json` — one `translation` namespace,
  merged at boot. Architecture + backlog: `docs/i18n.md`.
- Game/content data (non-UI): `pickLocale()` from `src/utils/localizedContent.ts`. DB-sourced
  module/activity names: `translateContentName()`. Glossary content lives in locale JSON under
  `pathways.glossary.terms.<slug>.*`; `src/data/glossary.ts` holds slug + category only.

### Educational intent & K-2 bar
- Preserve each game's learning goal, pacing, and instructional clarity — never swap in generic gameplay.
- K–2: simple vocabulary, large tap targets, clear visual hierarchy; readability beats visual complexity.
- Keep teacher and student flows consistent with existing app patterns.

### Definition of "good"
K–2 clarity ✓ educational intent intact ✓ bilingual keys (not hardcoded) ✓ teacher-demo-ready ✓
small diff, existing patterns ✓.

---

## Design Principles (canonical — see `docs/design-principles.md`)
Bright Boost is built on the *Lifelong Kindergarten* creative-learning model. Every activity should:
- **Creators, not consumers** — kids make/author something with many valid solutions, not just respond (match/pick/choose); a kid should walk away with something they made.
- **Creative spiral as the spine** — Imagine → Create → Play → Share → Reflect, as visible UI moments.
- **Low floor, high ceiling, wide walls — by grade/level** — K–2 is more structured/scaffolded (a *supported* low floor, never a blank void); later grades and higher levels open up toward more open-ended creation. Structure early, openness later.
- **Playground, not playpen** — safe experimentation and "breaking" things; mascot/adult is curious, never corrective.
- **Measure creation, not completion** — things built, iterations, shares, remixes; not completion/badges.
- **Adult as guide** — Catalyst / Connector / Consultant / Collaborator, not proctor.
- **Screen use, not screen time; localizable + culturally grounded from day one.**

New activities are checked against these (and the review checklist) before building. Full articulation: `docs/design-principles.md`.

---

## Team workflow (canonical — see `docs/team-workflow.md`)
Label taxonomy (five axes: Pod / Size / Audience / Topic / State) plus the priority axis
(`P0 — now` / `P1 — this week` / `P2 — when free`), lead delegation, and the team-up protocol
for collaborating on someone else's ticket. Full framework: `docs/team-workflow.md`.

---

## Source of truth

When repository information conflicts, resolve in this order:
1. **Actual code** (imports, runtime behavior) → 2. **package.json** → 3. **prisma/schema.prisma** →
4. **Root README.md** → 5. **Current passing tests** → 6. **Docs in active use** → 7. **Legacy docs**.

Pointers, not copies:
- `docs/design-principles.md` — **canonical** design principles (merged #664).
- `docs/team-workflow.md` — **canonical** label taxonomy, priority axis, delegation & team-up protocol.
- `docs/roadmap-notes.md` — strategic/directional notes (not commitments).
- `docs/i18n.md` — i18n architecture, deferred-component backlog, intern tickets.
- `docs/audits/g35-first-set-audit.md` — grade 3-5 audit + Set 2 variant briefs.

Known conflicts (flag new ones explicitly — never silently pick a side):
- `frontend/CONTRIBUTING.md` says Node 18; truth is Node 20 (engines + `.nvmrc`).
- `backend/README.md` describes retired AWS Lambda/Aurora and self-flags as stale; production is
  **Railway + Supabase (PostgreSQL)**.

---

## Tech stack

React 18 + TypeScript + Vite · Tailwind + shadcn/ui + Framer Motion · React Router v6 ·
i18next (en/es/vi/zh-CN) · Node 20 Express + Prisma → Supabase PostgreSQL · Hosted on Railway ·
Vitest / Cypress / Storybook / ESLint + Prettier.

---

## Game architecture (K-8)

Registry: `src/components/games/gameRegistry.ts`. Set ID arrays + `HIDDEN_MODULE_SLUGS` + completion
logic (`isSetComplete`, Set 2 unlocks when all Set 1 IDs have `COMPLETED` records):
`src/constants/stemSets.ts`. All 10 games below are implemented, registered, and seeded with story slides.

### Set 1 — Foundation
| Game | File (src/components/games/) | Game key | Activity ID | Strand | g3_5 |
|------|------------------------------|----------|-------------|--------|------|
| Bounce & Buds | BounceBudsGame.tsx | `buddy_garden_sort` | `bounce-buds` | Biotech | ✅ |
| Gotcha Gears | GotchaGearsGame.tsx | `gotcha_gears_unity` | `gotcha-gears` | Quantum | ✅ |
| Rhyme & Ride | RhymeRideGame.tsx | `rhymo_rhyme_rocket` | `rhyme-ride` | AI + Biotech | ✅ (banded worlds, 1.25×) |
| Tank Trek | TankTrekGame.tsx | `tank_trek` | `tank-trek` | Quantum + AI | ✅ (appended chapters) |
| Quantum Quest | QuantumQuestGame.tsx | `quantum_quest` | `quantum-quest` | Quantum | ✅ (g3_5 math sectors) |

### Set 2 — Exploration (unlocks after Set 1)
| Game | File | Game key | Activity ID | Strand | g3_5 |
|------|------|----------|-------------|--------|------|
| Maze Maps | MazeMapsGame.tsx | `maze_maps` | `maze-maps` | AI | ✅ (#654) |
| Move & Measure | MoveMeasureGame.tsx | `move_measure` | `move-measure` | Biotech | K-2 only |
| Sky Shield | SkyShieldGame.tsx | `sky_shield` | `sky-shield` | Quantum | K-2 only |
| Fast Lane | FastLaneGame.tsx | `fast_lane` | `fast-lane` | AI + Biotech | K-2 only |
| Qualify & Race | QualifyTuneRaceGame.tsx | `qualify_tune_race` | `qualify-tune-race` | Capstone | K-2 only |

### Set 3 — Mastery
Placeholder IDs only (`set3-game-1`..`set3-game-5`); no components or seed data. Specialization
(AI/Quantum/Biotech archetype) gating on Set 3 is planned, **not implemented**.

### Grade bands
- `Course.gradeBand`: `k2` (default) | `g3_5`; teacher sets it at class creation and in class detail.
- Content variants live in `src/components/games/gradeBandContent.ts` (central registry; K-2 + g3_5).
  Games read the band from config; ActivityPlayer injects it from the student's enrolled course and
  applies Set 1 story-quiz overrides at render time (`applyG35StoryOverrides`).
  `useGradeBand()` (`src/hooks/useGradeBand.ts`) fetches the student's class band.

### Removed / hidden (don't resurrect)
- **Build-a-Bot** — removed 2026-04-07 (files fully deleted); Tank Trek → Quantum Quest replaced it.
- **Fix the Order / Lost Steps** (`k2-stem-sequencing`, keys `boost_path_planner` + `sequence_drag_drop`) —
  hidden 2026-04-09 via `HIDDEN_MODULE_SLUGS`; component `BoostPathPlannerGame.tsx` still exists.
- `stem-1-intro` ("Quantum Explorers") — hidden via `HIDDEN_MODULE_SLUGS`.

---

## Pathways (secondary program, ages 14-17)

Same codebase/auth/DB as K-8; separate routes, dark-mode layout, own visual identity (indigo/teal/slate,
no mascots, direct empowering language for teens).

- **Bands:** Explorer (14-15), Launch (16-17). **Tracks:** 5 in `src/constants/pathwayTracks.ts` —
  Cyber Launch is active with 7 modules (`src/components/pathways/modules/CyberLaunchModules.tsx`);
  Build Your Own Lane / Money Moves / Future Tech Lab / Creative Media Lab are `coming_soon`.
- **Models** (additive): `PathwayCohort` (join code, band, site partner, active tracks),
  `PathwayEnrollment` (unique user+cohort), `PathwayMilestone` (unique user+track+module);
  `User.userType` ("k8"|"pathways"), `User.ageBand`, `User.birthYear`.
- **Routes:** `/pathways/about` (public) · `/pathways` (student home) · `/pathways/tracks[/:slug]` ·
  `/pathways/tracks/:trackSlug/:moduleSlug` · `/pathways/profile` · `/pathways/facilitator` ·
  `/pathways/facilitator/resources` (program overview, 6-week session guide, printable worksheets).
- **Layout/UI:** `src/components/pathways/` (PathwaysLayout, PathwaysHome, TracksOverview, TrackDetail,
  ModulePlayer, FacilitatorDashboard, PathwaysAbout). **API:** `backend/src/routes/pathways.ts`.

---

## Authentication & login

Unified login page `src/pages/LoginSelection.tsx` at **`/student-login`** (`/login` redirects there):
- **Email + password:** POST `/api/login` → JWT. Redirect by `userType`+`role`
  (`src/contexts/AuthContext.tsx`): k8 teacher → `/teacher/dashboard`; k8 student → `/student/dashboard`;
  pathways teacher → `/pathways/facilitator`; pathways student → `/pathways`.
- **Join code:** POST `/api/auth/lookup-code` → `k8_class` (→ `/class-login` emoji-picker flow) or
  `pathways_cohort` (→ registration form).
- **Pathways registration:** POST `/api/auth/register-pathways` (derives `ageBand` from `birthYear`;
  auto-generates `student_XXXXXX@brightboost.local` if no email; enrolls in cohort).
- **Returning no-email Pathways students:** GET `/api/auth/cohort-roster/:code` → pick name →
  POST `/api/auth/pathways-code-login`.
- **Tokens:** JWT in localStorage `bb_access_token` (7-day expiry), user object under `user`;
  session validated on load via `/api/get-progress`. Auth routes: `backend/src/routes/auth.ts`.

---

## Workflow for every task

1. **Before coding:** read the relevant files + adjacent components, tests, and locale files; state
   current behavior, proposed change, and risks/assumptions.
2. **While coding:** smallest viable change; match adjacent patterns; translation keys, not literals;
   preserve educational intent.
3. **Before finishing:** run `npm run lint && npm run test && npm run typecheck` (plus backend
   typecheck if backend changed); list every file changed; note follow-ups and risks.

Anti-patterns: silently resolving doc conflicts · hardcoded English in JSX · broad refactors for narrow
fixes · replacing educational logic with generic gameplay · new architectural patterns unasked ·
trusting AWS-era docs · coding before reading adjacent files.

---

## Open work (verified 2026-07-01)

- Set 2 g3_5 content variants — briefs in `docs/audits/g35-first-set-audit.md`.
- Student "Assigned This Week" UI — API `/api/student/assigned-modules` exists; no UI consumes it yet.
- Teacher module-assignment UI — CRUD routes exist; UI is a known gap (see comment in `PlanDetail.tsx`).
- es/vi/zh-CN translations: g3_5 content in `gradeBandContent.ts` (TODOs in file) and Set 2 games
  (currently `defaultValue` fallbacks).
- #646 migration baseline (unblocks db-check + fresh-DB installs).
- PR #663 (creative loop: Creation model, authoring, gallery, game reframes) is **in flight — not on
  `main`**; don't describe those features as existing until it merges.
