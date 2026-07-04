# Phase 0 — Diagnosis (Current-State Map)

> **Read-only analysis.** No code changed. Scope: the free-adult (teacher **or** parent) journey
> _discover → free signup → create a group → add kid(s) → kid makes something → adult sees & encourages._
> Where the code disagrees with assumptions, the code wins and it's noted.
> Source of truth read first: `CLAUDE.md`, `README.md`, `prisma/schema.prisma`.

---

## 1. Stack & Structure

| Layer | Tech | Evidence |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite; Tailwind + shadcn/ui + Framer Motion; React Router v6; i18next | `package.json`, `vite.config.ts`, `src/` |
| Backend | Node 20 + Express + TypeScript; Prisma ORM | `backend/src/server.ts`, `backend/package.json` |
| DB | PostgreSQL (Supabase in prod) | `prisma/schema.prisma` datasource (`DATABASE_URL`/`DIRECT_URL`) |
| Deploy | **Railway** (frontend = Vite build served by nginx via `Dockerfile.frontend`; backend via `Dockerfile.backend`). `/api` proxied to backend by `docs/nginx.conf`. | `README.md` prod table, `Dockerfile.frontend`, `docs/nginx.conf` |

- **Monorepo layout:** root is the frontend + the **canonical** `prisma/schema.prisma`; `backend/` holds the Express API + a **secondary** `backend/prisma/schema.prisma` (must be kept in sync — see schema header lines 1-5).
- **Frontend API base:** defaults to `/api` (`src/services/api.ts` `resolveApiBase()`, `Dockerfile.frontend ARG VITE_API_BASE=/api`); same-origin via nginx in prod, Vite proxy in dev.
- Vercel config was just removed (vestigial); deploy path is Railway only.

## 2. Auth & User Roles

- **Roles (`User.role`, free-text string):** `"teacher"`, `"student"`, `"admin"` (admin is seeded/manual, not self-serve). Type alias in `backend/src/utils/auth.ts`. **`userType`:** `"k8"` (default) | `"pathways"`.
- **No parent/guardian login role exists.** Grep across `src/` + `backend/src/` finds parent only as (a) a **feedback** submitter label (`Feedback.role`, schema l.552) and (b) the **Home Access** flags below. There is no parent account, parent login, or parent dashboard.
- **Self-serve free signup EXISTS today (no sales/pilot gate):**
  - Teacher: `POST /api/signup/teacher` → `backend/src/routes/auth.ts` (~l.111). Frontend `src/pages/TeacherSignup.tsx`, chooser `src/pages/SignupSelection.tsx`.
  - Student (email): `POST /api/signup/student` (~l.53), sets `accountMode: "EMAIL_ONLY"`. Frontend `src/pages/StudentSignup.tsx`.
  - **No email verification** on either; account is active immediately. Password reset works (`POST /api/forgot-password` + `/reset-password`, `PasswordResetToken`, `backend/src/utils/mail.ts` — no-ops without SMTP).
- **Login flows:** email+password (`POST /api/login`, JWT `{id, role}` 7-day); K-2 class-code emoji+optional-PIN (`GET /api/classes/by-code/:code` → `POST /api/auth/class-login`, `backend/src/routes/classLogin.ts`); Pathways cohort-code register/login (`/api/auth/register-pathways`, `/pathways-code-login`).
- **Home Access (the closest thing to "parent"):** a **student** attaches email/password for home login via `POST /auth/home-access/enable` (`backend/src/routes/homeAccess.ts`, `services/enableHomeAccess.ts`, UI `src/components/student/HomeAccessCard.tsx`). Sets `homeAccessEnabled`, optional `managedByParent` + `parentEmail`, and bumps `accountMode` to `CLASS_CODE_PLUS_HOME_ACCESS`/`EMAIL_ONLY`. **These flags are written but NOT enforced** anywhere in route-gating — there is no parent-owns-child relationship.
- **Gating:** backend `requireAuth` / `requireRole("teacher"|"student"|"admin")` (admin bypasses). Frontend `src/components/ProtectedRoute.tsx` (`requiredRole`). Post-login routing in `src/contexts/AuthContext.tsx`. Token in `localStorage["bb_access_token"]`.

## 3. Group Model

- **The only group abstraction is `Course`** (a teacher's class): `joinCode` (unique, 6-char via `generateJoinCode()`), `teacherId`, `gradeBand` (`k2`|`g3_5`), `defaultLanguage`. Kid↔adult link is **only** `Course.teacherId` + `Enrollment(studentId, courseId)` (unique pair).
- **Create class:** `POST /teacher/courses` (`backend/src/routes/courses.ts` ~l.67). UI `src/pages/TeacherClasses.tsx` (create dialog: name + grade band).
- **Add kids:** teacher creates K-2 students directly (`POST /teacher/courses/:id/add-students` → makes `User` rows with `loginIcon`/`loginPin`, `accountMode CLASS_CODE_ONLY` + `Enrollment`); or older students self-join by code (`POST /student/join-course`). Printable login cards: `GET /teacher/courses/:id/login-cards`.
- **No family / home / household / guardian group concept exists** — confirmed by repo-wide search. Missing for a parent journey: no family group model, no parent signup/login, no parent→multiple-children link, no parent dashboard.

## 4. Free Tier / Billing

- **No billing system of any kind.** No Stripe/PayPal/Square deps in either `package.json`; no `Subscription`/`Plan`/`Payment`/`Entitlement` models; no paywall/feature-gating routes. **Everything is free to any authenticated user today.** (`User.accountMode` is login-type, not a paid tier.)

## 5. Games / Activities System

- **Pipeline:** `src/pages/ActivityPlayer.tsx` resolves module→lesson→activity; for `kind === "INTERACT"` it reads `content.gameKey`, looks it up in the **registry** `src/components/games/gameRegistry.ts` (`GAME_COMPONENTS`), and renders the React component with `config = {...content, gradeBand}` + `onComplete`. `gradeBand` from `useGradeBand()`.
- **All 15 registry games are React components.** Unity WebGL builds exist under `public/games/{bounce-buds,gotcha-gears,rhyme-ride,spacewar}/Build/` but are **legacy/unused** — the live registry maps those keys to React reimplementations; the old `src/components/activities/*UnityActivity.tsx` wrappers are **not** wired into `ActivityPlayer`. **This matters for Phase 0: no Unity dependency blocks the engine-flip.**

| Game (key) | File | Engine |
|---|---|---|
| Boost's Lost Steps (`boost_path_planner`) | `BoostPathPlannerGame.tsx` | React |
| Rhyme & Ride (`rhymo_rhyme_rocket`) | `RhymeRideGame.tsx` | React (Unity build unused) |
| Bounce & Buds (`buddy_garden_sort`) | `BounceBudsGame.tsx` | React (Unity build unused) |
| Gotcha Gears (`gotcha_gears_unity`) | `GotchaGearsGame.tsx` | React (Unity build unused) |
| Tank Trek / Quantum Quest | `TankTrekGame.tsx` / `QuantumQuestGame.tsx` | React |
| **Data Dash: Sort & Discover (`data_dash_sort_discover`)** | `DataDashSortDiscoverGame.tsx` | React (fully data-driven) |
| Maze Maps / Move & Measure / Sky Shield / Fast Lane / Qualify-Tune-Race | `MazeMapsGame.tsx` … | React |

- **Completion / win-lose:** shared `src/components/games/shared/GameShell.tsx` (briefing → playing → results). `GameResult` type (score/total/streakMax/roundsCompleted/starsEarned…). Star thresholds default `[30,60,90]`. **Framing is already encouraging, not punitive** ("Amazing!/Great Job!/Keep Trying!"), no forced fail/restart — but it's still **outcome/score**-shaped, not an explicit "your attempt had a bug → fix it → re-run" loop.
- **XP/streaks/badges:** XP fires on `POST /progress/complete-activity` (`backend/src/routes/progress.ts`): pro-rata `XP_PER_ACTIVITY` (50) → updates `Avatar`, `checkUnlocks()` (`backend/src/services/game.ts`) unlocks **abilities** for SPECIALIZED avatars; upserts `GamePersonalBest`. **K-8 badges (`Badge`/`UserBadge`) are legacy and NOT wired** to completion. Streaks/badges only run on the **Pathways** side (`backend/src/services/gamification.ts`).

## 6. Any Creation / User-Generated Content

- **K-8 side: none.** Students have progress/answers only (`Progress`, `BenchmarkAttempt`, `PulseResponse`) — no saved, kid-authored artifact model.
- **Pathways side (14-17): limited, facilitator-only.** `PathwayLabAttempt.output` (JSON artifact, e.g. password policy / "Red Flag Field Guide") and `PathwayMilestone.homeworkResponse` (text). `PathwayMilestone.artifacts` (JSON) is **declared but unused**. None of it is peer-visible.
- **There is no model for a kid's saved creation/submission on the K-8 side** — this is the central gap for "a kid makes something."

## 7. Sharing / Display Primitives

- **Only peer-visible primitive is teacher↔teacher:** `FacultyPost` (`title/content/isPinned/parentId` self-referential replies) — `backend/src/routes/pd.ts` (`/teacher/faculty-board` + `/reply`), UI `src/pages/TeacherPDHub.tsx`. It's a usable **feed+threaded-comment shape** but scoped to teachers, text-only.
- **No student-facing gallery, feed, peer profile, or leaderboard.** `GamePersonalBest` exists but has **no** leaderboard endpoint. A "leaderboard" string exists in locale files with no UI.

## 8. Adult-Facing Dashboard

- Pages: `src/pages/TeacherDashboard.tsx` (lists courses) → `src/pages/TeacherClassDetail.tsx` (per-class). **It is completion/score/assessment-centric.** Surfaced today:
  - **Sessions launched** (count of `Assignment`), **Avg completion %** (`Progress.COMPLETED` ÷ assignments×roster), **Avg time** (`Progress.timeSpentS`) — `GET /teacher/courses/:id/assignments`.
  - **Confidence lift** (`PulseResponse` PRE/POST delta) — `/pulse/summary`.
  - **Benchmark scores & growth** (`BenchmarkAttempt`, per-student/per-skill) — `/benchmarks`, `/benchmarks/growth`.
  - **Roster** (name/email/enrolledAt) + K-2 icon setup + login cards.
- **NOT surfaced (relevant to Phase 0):** "who's stuck" (no `IN_PROGRESS` + staleness query), per-kid encouragement signals (Avatar/XP/`GamePersonalBest` exist but **no teacher endpoint reads them**), `WeeklySnapshot` (model exists, unqueried), and **anything a kid made** (no creations exist yet).

## 9. Data Model (Phase-0-relevant Prisma models)

- **Identity/group:** `User` (role, userType, accountMode + home-access flags, xp/level/streak), `Course`, `Enrollment`, `AccountMode` enum.
- **Content/progress:** `Module`/`Unit`/`Lesson`/`Activity` (`ActivityKind = INFO|INTERACT`, `content` JSON/HTML string), `Progress` (`ProgressStatus = IN_PROGRESS|COMPLETED`), `WeeklySnapshot`, `GamePersonalBest`.
- **Gamification:** `Avatar`/`Ability`/`UnlockedAbility`/`Match*`; legacy `Badge`/`UserBadge`.
- **Catalog:** `ModuleFamily`/`ModuleVariant`/`ClassModuleAssignment` (grade-banded content config, `contentConfig` JSON).
- **Sharing-ish:** `FacultyPost` (teacher forum). **Pathways:** `PathwayLabAttempt.output`, `PathwayMilestone.artifacts/homeworkResponse`.
- **No models for:** family/home group, parent, kid creation/submission, gallery post, or billing.

## 10. i18n

- `src/i18n.ts`: i18next + react-i18next; languages `en, es, vi, zh-CN`; `en` fallback; `vi`/`zh-CN` lazy-loaded; `common.json` + `pathways.json` merged into one `translation` namespace; preference in `localStorage["preferredLanguage"]`.
- Files: `src/locales/{en,es,vi,zh-CN}/{common,pathways}.json`. **`en` + `es` fully translated; `vi`/`zh-CN` largely English placeholders** (explicit `_comment` stub notice). Usage: `useTranslation()` → `t("dot.key")`.
- **Cost to add adult-facing copy:** add key to `en` + `es` (required), `vi`/`zh-CN` best-effort with `// TODO: translate`; reference via `t()`. Low cost, no infra change.

---

## Gaps vs Phase 0

| Phase 0 capability | Foundation status | Why |
|---|---|---|
| 1. Free adult signup (teacher **and** parent) | **Partially exists** | Teacher self-serve signup ✅ done. **Parent** = missing (no parent role, no parent signup, no home group). Cheapest path: parents reuse the **teacher** role + a "home group" = a `Course`. |
| 2. Adult → group → kid setup | **Partially exists** | Full class+joinCode+enrollment+add-students machinery exists (`courses.ts`). Reusable as-is for the family case; only labeling/copy + a "home group" affordance missing. |
| 3. Engine-flip (one game authorable) | **Partially exists** | Games are data-driven React + `Activity.content` is a JSON blob; **no authoring UI** and `ActivityPlayer` only renders seeded content. `DataDashSortDiscoverGame` is fully parameterizable (cards/rules/questions arrays) — best candidate. |
| 4. "Work in progress, viewable" status | **Missing** | No kid-creation model at all; `ProgressStatus` only has `IN_PROGRESS|COMPLETED` and isn't an artifact. Needs a new model + status field. |
| 5. Bugs-not-failure reframe | **Partially exists** | `GameShell` already non-punitive, but no explicit attempt→inspect-failure→retry **debug loop**. `BoostPathPlannerGame` (command sequencing) is the natural fit. Copy + per-game logic change. |
| 6. Group gallery | **Missing** (one reusable pattern) | No student gallery/feed. `FacultyPost` proves the threaded-post pattern; needs a new group-scoped, kid-creation-backed model + visibility rules. |
| 7. Adult dashboard reframe | **Partially exists** | Rich data + dashboard exist but are completion/score-centric. Needs new "stuck/encourage/made" surfaces; "stuck" derivable from existing `Progress`, "made" depends on capability 4/6, "encourage" can reuse `GamePersonalBest`/Avatar (currently unqueried by teacher routes). |

**One-line takeaway:** the **adult-signup + group + add-kid** spine already exists (just teacher-shaped); the **creative loop** (kid makes → WIP status → group gallery → encourage) is greenfield but small, and **nothing is blocked by Unity or billing**.
