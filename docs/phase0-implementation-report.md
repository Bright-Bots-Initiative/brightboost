# Phase 0 — Implementation Report (Build Plan)

> **No code changed.** This is an actionable plan scoped **only** to the free teacher/parent journey:
> _discover → free signup → create a group (class or home) → add kid(s) → kid makes something → adult sees & encourages._
> Companion: `docs/phase0-diagnosis.md`. Principle: **reuse over rewrite, smallest viable diff.**
> Effort key: **S** ≈ ≤1 day · **M** ≈ 2-4 days · **L** ≈ ≥1 week. All paths are real and cited.

**Central design choice that keeps Phase 0 cheap:** treat a **parent's "home group" as a `Course`** and let parents reuse the **teacher** role. That reuses the entire class/joinCode/enrollment/add-students/dashboard stack instead of building a parallel family system. The only genuinely new surface is the **creative loop** (a `Creation` model + a group gallery + dashboard re-surfacing). Decisions that gate this are in **Decisions Needed**.

---

## Capability 1 — Free adult signup (teacher AND parent)

- **Reuse:** `POST /api/signup/teacher` (`backend/src/routes/auth.ts` ~l.111), `src/pages/TeacherSignup.tsx`, `src/pages/SignupSelection.tsx`, `ProtectedRoute`/`AuthContext` routing. Teacher signup is already open, free, instant.
- **Build (minimum for parent):**
  - Add a `Course.kind` field (`"class" | "home"`, default `"class"`) in **both** `prisma/schema.prisma` and `backend/prisma/schema.prisma` — parents are teachers whose group is a home group. (No new role, no parent auth.)
  - Add a parent-flavored entry to `SignupSelection.tsx` ("I'm a parent / at home") that hits the **same** `signup/teacher` endpoint and lands on a home-group create flow. Copy/i18n keys only (`src/locales/{en,es}/common.json`).
  - Optional: store intent (`User.subject = "home"` or a lightweight `User.accountKind`) so the dashboard can adjust copy. Prefer reusing existing fields over new ones.
- **Effort:** **S** (if parent == teacher role + `Course.kind`). Blocks: none.
- **Risks/unknowns:** Decision needed — distinct parent role vs reuse teacher (recommend **reuse**; a distinct role means touching every `requireRole("teacher")` gate). COPPA: parent is an adult self-signup, low risk; the child-data surface is the gallery (capability 6), not here.

## Capability 2 — Adult → group → kid setup

- **Reuse (almost entirely):** `POST /teacher/courses` + `generateJoinCode()`, `POST /teacher/courses/:id/add-students` (creates `User`+`Enrollment` with emoji/PIN), `GET /teacher/courses/:id/login-cards`, UI `src/pages/TeacherClasses.tsx` / `TeacherClassDetail.tsx`. This already is "adult creates group → adds kids → kids can log in."
- **Build:** branch copy/labels on `Course.kind === "home"` ("Add your child" vs "Add students", "Family code" vs "Class code") — i18n + conditional labels in the existing create dialog and class-detail. No new endpoints. Default a home group to `gradeBand` by the child's grade.
- **Effort:** **S**. Depends on: Cap 1 (`Course.kind`).
- **Risks/unknowns:** Kid auth under a parent — reuse the K-2 emoji/PIN class-login as-is (works for home). Home groups likely have 1-3 kids; the class UI scales down fine.

## Capability 3 — Engine-flip (one game becomes authorable) → **Data Dash: Sort & Discover**

- **Why this game:** `src/components/games/DataDashSortDiscoverGame.tsx` is the only fully **data-driven** game — its card pool (`DATA_DASH_CARDS`), `SORT_RULES`, the hidden `inferRule`, and `chartQuestions` are all plain exported arrays, and scoring (`evaluateSortAssignment`, `buildChartCounts`, `calculateDataDashScore`) is decoupled from content. A challenge = `{ cards, sortRule, chartQuestions }` JSON. No Unity, no rewrite. (Runner-up: `MazeMapsGame` map configs are also data-like but the logic is heavier.)
- **Reuse:** `Activity.content` is already a JSON string blob; `ActivityPlayer.tsx` already injects `config` into the game; `GameShell` unchanged.
- **Build:**
  - Define a `DataDashChallenge` TS type (cards/sortRule/chartQuestions) in `gradeBandContent.ts` or a new `src/components/games/dataDashAuthoring.ts`; make `DataDashSortDiscoverGame` read `config.challenge` when present, else fall back to current defaults.
  - **Authoring storage:** reuse the new `Creation` model (capability 4) with `type: "data_dash_challenge"` and the challenge JSON in its `content` — i.e. an authored challenge *is* a kid/adult creation that others can play. (Avoids a separate table.)
  - A minimal authoring form (React route, e.g. `src/pages/CreateChallenge.tsx`): pick cards, choose a sort rule, write 1-2 chart questions; validate; save via the creations endpoint.
  - In `ActivityPlayer` (or a lightweight `/play/challenge/:id` route), load a saved challenge and render Data Dash with it.
- **Effort:** **M**. Depends on: Cap 4 (storage model).
- **Risks/unknowns:** Validation (every authored challenge must be solvable — the hidden rule must actually partition the cards; reuse the solvability-guard mindset from the maze tests). Keep the authoring schema closed (no free-form code) to limit safety surface.

## Capability 4 — "Work in progress, viewable" status

- **Reuse:** `ProgressStatus` enum pattern; cuid id + `studentId`/`User` relation conventions throughout schema.
- **Build (the foundational new model — capabilities 3/6/7 build on it):**
  ```prisma
  enum CreationStatus { IN_PROGRESS, SHARED, COMPLETE }   // "viewable while unfinished" = SHARED
  model Creation {
    id        String   @id @default(cuid())
    authorId  String                       // the kid (User)
    courseId  String                       // group scope (class or home)
    type      String                       // "data_dash_challenge" | "drawing" | ...
    title     String?
    content   Json                         // artifact payload or challenge config
    status    CreationStatus @default(IN_PROGRESS)
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    author User   @relation(fields:[authorId], references:[id], onDelete: Cascade)
    course Course @relation(fields:[courseId], references:[id], onDelete: Cascade)
    @@index([courseId, status]); @@index([authorId])
  }
  ```
  Mirror into `backend/prisma/schema.prisma`. Endpoints: `POST/PATCH /creations` (author), `GET /creations?courseId=` (group). UI: a status chip ("Still working — shared" vs "Done") on the kid's creation card and in the gallery.
- **Effort:** **M** (model + CRUD + chip). Depends on: nothing (do this **first**).
- **Risks/unknowns:** Keep `status: SHARED` explicit and kid-initiated so unfinished work is shared **only** on purpose. `content` as `Json` is flexible but validate per `type`.

## Capability 5 — Bugs-not-failure reframe → **Boost's Lost Steps (`boost_path_planner`)**

- **Why this game:** `src/components/games/BoostPathPlannerGame.tsx` is a command-sequencing / pathfinding game — the player builds a sequence of moves and runs it. That is *already* a debugging shape: **plan → run → see where the robot went wrong → fix the step → re-run.** It maps to "bugs are normal, iterate" more naturally than any quiz-style game.
- **Reuse:** `GameShell` is already non-punitive (no hard fail; "Keep Trying!"); levels are `BOOST_PATH_LEVELS[band]` arrays.
- **Build (one game only):**
  - **Logic:** on a failed run, instead of a generic miss, highlight the **step index** where the path first diverged/collided, keep the sequence editable, and let the kid re-run (retry counter, not a loss). Track attempts in `GameResult.gameSpecific`.
  - **Copy/i18n:** replace win/lose strings for this game with debug framing — "Found a bug! Fix step 3 and run again" / "Debugged it in N tries!" — keys in `src/locales/{en,es}/common.json` (+ vi/zh-CN TODO).
- **Effort:** **S-M** (scoped to one component + copy). Depends on: none (independent).
- **Risks/unknowns:** Keep the existing scoring/stars intact so dashboards don't break; this is a reframe, not a scoring change. Confirm K-2 readability of "bug/debug" vocabulary (pairs well with the AI/CS strand).

## Capability 6 — Group gallery

- **Reuse:** `FacultyPost` is a working **group-scoped, threaded post+reply** pattern (`backend/src/routes/pd.ts`, UI `TeacherPDHub.tsx`) — copy its read/write shape. `Enrollment`/`Course` give the group-scope check. The new `Creation` model (Cap 4) is the content.
- **Build:**
  - `GET /creations?courseId=` returning `status IN (SHARED, COMPLETE)` for members of that course; authorize via `Enrollment`/`teacherId` membership.
  - Gallery UI (`src/pages/GroupGallery.tsx` or a tab in class/home detail): grid of creation cards (title, author first name, status chip, thumbnail/replay-in-Data-Dash). Adult + enrolled kids of **that group only** can view.
  - Optional encouragement: a minimal reaction (⭐/“Nice!”) or reuse the `parentId` reply pattern for adult comments — keep it adult→kid only at first to limit moderation surface.
- **Effort:** **M**. Depends on: Cap 4 (model). Synergy with Cap 3 (authored challenges show here as playable).
- **Risks/unknowns (child-safety/COPPA — the main one in Phase 0):** strictly **group-scoped** visibility (no cross-group, no public, no discovery); show kid **first name / display name only**; no external sharing/links; consider disabling free-text kid-to-kid comments initially (adult comments only). Default visibility decision below.

## Capability 7 — Adult dashboard reframe

- **Reuse:** `TeacherClassDetail.tsx` + existing endpoints; `Progress` (has `IN_PROGRESS` + `updatedAt` → derive "stuck"); `GamePersonalBest`/`Avatar` (exist but **no teacher endpoint reads them** today); new `Creation` feed.
- **Build:**
  - **"Who's stuck / encourage":** new `GET /teacher/courses/:id/attention` deriving from `Progress` where `status = IN_PROGRESS` and `updatedAt` older than a threshold (no new signal needed). Surface as an "Encourage" list with a one-tap reaction.
  - **"What they made":** embed a recent-`Creation` strip per group (from Cap 6 endpoint).
  - **Copy reframe:** shift headline language from "completion %" to "who needs a nudge / what they made" — i18n keys; keep the existing completion/benchmark widgets available but de-emphasized.
- **Effort:** **M**. Depends on: Cap 4/6 (for "made"); "stuck" is independent.
- **Risks/unknowns:** "Stuck" threshold is a heuristic — make it configurable/sane default (e.g. >3 days in progress). Avoid implying a child is "behind" (tone matters for K-2 parents).

---

## Recommended Build Order (fastest path to a working free-adult vertical slice)

1. **Cap 4 — `Creation` model + CRUD + WIP status.** Foundation for 3/6/7. (M)
2. **Cap 1 — `Course.kind` + parent-as-teacher signup entry.** Unlocks the parent journey cheaply. (S)
3. **Cap 2 — home-group copy/labels over existing class machinery.** Now an adult can sign up → make a home group → add a kid. (S)
4. **Cap 3 — Data Dash authoring** (challenge stored as a `Creation`). First "player becomes maker." (M)
5. **Cap 6 — Group gallery** reading `Creation`s. Now "kid makes → adult/peers see." (M)
6. **Cap 7 — Dashboard reframe** (stuck/encourage/made). Closes the "adult sees & encourages" loop. (M)
7. **Cap 5 — Boost's Lost Steps debug reframe.** Independent; can slot anywhere/parallel. (S-M)

After steps 1-5 you have the **end-to-end slice**: free adult signup → group → kid → kid authors a Data Dash challenge (shareable while WIP) → it appears in the group gallery → adult encourages it. Steps 6-7 deepen the adult side; step 5 is a parallelizable polish.

## Decisions Needed From Me (assumptions I had to make)

1. **Parent role:** reuse the **teacher** role with `Course.kind="home"` (my recommendation, smallest diff) — or create a distinct `parent` role/`userType`? A distinct role touches every `requireRole` gate and `AuthContext` routing.
2. **Kid auth under a parent:** reuse the **K-2 emoji + optional PIN** class-login for home kids (recommended), or give home kids email/password via the existing Home Access flow?
3. **Gallery visibility default:** group-scoped, **first-name-only**, **adult-comments-only** to start (recommended for COPPA) — or allow kid-to-kid reactions/comments in Phase 0?
4. **"Shared while unfinished":** is `status: SHARED` always kid-initiated (recommended), or do adults also get to surface a kid's WIP?
5. **Authoring audience:** in Phase 0 do **kids** author Data Dash challenges, **adults**, or both? (Affects the authoring UI's placement and validation strictness.)
6. **"Stuck" threshold** for the dashboard (default: >3 days `IN_PROGRESS`).

## Explicitly Out of Scope (confirmed excluded)

- **Chatham pilot** logistics, cohort metrics, showcase events — excluded.
- **Payments / plans / entitlements** — none exist and Phase 0 adds none; everything stays free.
- **Full creation tooling (Phase 1+):** rich media authoring, multi-game authoring, public/cross-group sharing, kid social graph, notifications, moderation tooling — out of scope. Phase 0 ships exactly **one** authorable game and **one** group-scoped gallery.
- **Pathways (14-17)** changes — untouched; Phase 0 is K-8 free-adult only.
- **Unity work** — not needed; all target games are React.
