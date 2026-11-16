# Bright Boost Analytics

> **Canonical for:** analytics events and capture policy. Last verified against code: 2026-11-13.

Funnel instrumentation, scoreboard, and tooling notes for the K-8 product.

## Tooling

| What                    | Where                    | Used for                                                                     |
| ----------------------- | ------------------------ | ---------------------------------------------------------------------------- |
| **PostHog Cloud**       | https://us.i.posthog.com | product analytics, funnels, retention cohorts, session replay, feature flags |
| **Internal scoreboard** | `/admin/metrics`         | DB-source-of-truth totals (admin role required)                              |

PostHog is the exploration tool — slice events by property, build funnels, run experiments. The scoreboard is the trustworthy headline number ("how many teachers signed up?") because it counts from Postgres directly.

## Environment variables

The owner manages deployed analytics configuration. Do not commit values or paste
credentials, project identifiers, or dashboard/replay links into logs or examples.

| Variable            | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `VITE_POSTHOG_KEY`  | Enables the frontend SDK when supplied at build time           |
| `VITE_POSTHOG_HOST` | HTTPS ingestion origin; defaults to `https://us.i.posthog.com` |
| `POSTHOG_KEY`       | Enables the backend analytics shim                             |
| `POSTHOG_HOST`      | Backend ingestion host                                         |

The frontend accepts an HTTPS origin with an optional root slash, but no user info,
other path, query, or fragment. An invalid host produces one warning naming
`VITE_POSTHOG_HOST`, without its value, and uses the default. Initialization logs
only the accepted origin. An unset host uses the default without a warning.

Without a key, the backend shim silently no-ops and prints an informational log;
the frontend prints one warning and does not initialize the SDK.

### Why the frontend env vars require a Docker rebuild

Vite **inlines `VITE_*` variables at BUILD time, not runtime**. That means:

1. The frontend env vars (`VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`) must be present when `npm run build` runs inside the Docker image — not just at container start.
2. `Dockerfile.frontend` declares them as `ARG` so Railway forwards the service env vars into the build context. If you add a new `VITE_*` variable, add a matching `ARG` + `ENV` line in `Dockerfile.frontend`, OR Vite will substitute `undefined`.
3. After changing a `VITE_*` env var on Railway, you must trigger a **clean rebuild** (the docker layer cache may otherwise keep an old bundle with the old/missing key).

The backend Dockerfile reads `process.env.POSTHOG_KEY` at runtime, so backend env vars take effect on the next container start — no rebuild required.

### Verifying initialization without exposing configuration

Use the origin-only initialization log and the ready log to distinguish an enabled
SDK from the missing-key warning. Do not search for or print a deployed key from a
bundle. Tests use a noncredential in-memory marker and a mocked SDK.

## Privacy rules (COPPA-conscious)

This is a children's product. **These rules are non-negotiable:**

- Anonymous events use the SDK's browser identifier. After `identifyUser`, the
  identifier is the DB user ID (`User.id`), never an email or name. PostHog can
  associate earlier anonymous events with that later identified user.
- Replay starts disabled (`disable_session_recording: true`). Only
  `identifyUser` with the role `teacher` or `admin` starts recording. Anonymous
  visitors, students, and parents are not recorded. Persisted SDK identity alone
  does not enable recording on a new page load.
- Identifying a student or parent stops recording before changing identity.
  `resetAnalytics()` stops recording before resetting to an anonymous identity.
  Calls made during SDK loading are applied after loading; reset cancels a
  pending identification so a previous teacher cannot start a delayed recording.
- Permitted recordings mask all input values (`maskAllInputs: true`) and rendered
  text (`maskTextSelector: '*'`). Console capture is disabled for every role
  (`enable_recording_console_log: false`).
- Heatmaps (`capture_heatmaps: false`), dead-click capture
  (`capture_dead_clicks: false`), and surveys (`disable_surveys: true`) are disabled
  in the client configuration. These names were checked against the installed
  `posthog-js` 1.379.3 types; `capture_heatmaps` is its primary heatmap control.
- Anonymous pageviews, page-leave events, and explicit demo funnel events remain
  enabled. Performance measurements may also be enabled by the provider's remote
  configuration. Demo completion includes game ID, score, stars, and elapsed
  seconds. The demo does not ask for a name or require an account. This is not a
  promise that the browser makes no third-party requests.
- Never track free-text content (homework answers, names typed into fields, messages).
- Track behavior (counts, timings, IDs, enum values) — not content.
- When adding a new event, pass IDs and enums, not personal data.

The comment block at the top of `src/lib/analytics.ts` enforces the same rules in-code so interns adding events will see them.

## Event taxonomy

| Event                                       | When                                                                                                                                                                                                           | Properties                                                                                                                        | Surface         |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `account_registered`                        | Signup success (email or cohort code)                                                                                                                                                                          | `role`, `signup_method`                                                                                                           | client + server |
| `login`                                     | Auth success (any method)                                                                                                                                                                                      | `role`                                                                                                                            | client + server |
| `class_created`                             | Teacher creates a class                                                                                                                                                                                        | `class_id`, `grade_band`                                                                                                          | client + server |
| `student_joined_class`                      | Student joins via class code                                                                                                                                                                                   | `class_id`, `join_method`                                                                                                         | client + server |
| `game_started`                              | One authorized curriculum activity opens (one per play).                                                                                                                                                       | `attempt_id`, `game_id`, `module_slug`, `activity_id`, `grade_band`                                                               | client only     |
| `game_completed`                            | First committed completion per (student, activity).                                                                                                                                                            | `progress_id`, `attempt_id` (when supplied), `game_id`, `module_slug`, `activity_id`, `score`, `time_spent_seconds`, `grade_band` | server only     |
| `game_attempt_completed`                    | One saved finish per (progress row, attempt ID); includes first plays and replays.                                                                                                                             | Same as `game_completed`, plus `is_replay`                                                                                        | server only     |
| `pvp_match_started` / `pvp_match_completed` | Standalone Spacewar arena opens / a match ends; outside curriculum metrics.                                                                                                                                    | `game_id=spacewar_pvp`; finishes include `score`, `time_spent_seconds`                                                            | client only     |
| `demo_page_viewed`                          | Public `/try` route mounts                                                                                                                                                                                     | `source`                                                                                                                          | client only     |
| `demo_game_started`                         | First interaction inside the demo game area (the Start Mission tap in practice)                                                                                                                                | `game_id`                                                                                                                         | client only     |
| `demo_game_completed`                       | Demo game finished (GameShell results → Finish)                                                                                                                                                                | `game_id`, `score`, `stars`, `time_spent_seconds`                                                                                 | client only     |
| `demo_replayed`                             | "Play again" on the demo conversion screen (GameShell-internal replays on its results screen are not observable without modifying GameShell — known undercount, event-based sessions still visible in PostHog) | `game_id`                                                                                                                         | client only     |
| `demo_signup_cta_clicked`                   | Conversion CTA tapped on `/try`                                                                                                                                                                                | `placement` (`results` \| `hero_teacher_whisper`)                                                                                 | client only     |
| `experiment_previewed`                      | Safe Exploration controls enter `preview` (older band only)                                                                                                                                                    | `surface_id`, `band`, `attempt`                                                                                                   | client only     |
| `experiment_tried`                          | A Safe Exploration run finishes with a learner outcome                                                                                                                                                         | `surface_id`, `band`, `attempt`                                                                                                   | client only     |
| `experiment_kept`                           | Learner keeps the experiment (the one consequential action)                                                                                                                                                    | `surface_id`, `band`, `attempt`                                                                                                   | client only     |
| `experiment_restored`                       | Learner returns to the preserved baseline ("Go back" / "Restore")                                                                                                                                              | `surface_id`, `band`, `attempt`                                                                                                   | client only     |
| `experiment_branched`                       | Learner saves the experiment as a new version, original untouched (older band only)                                                                                                                            | `surface_id`, `band`, `attempt`                                                                                                   | client only     |
| `experiment_failed`                         | A Safe Exploration handler reports or throws an infrastructure failure                                                                                                                                         | `surface_id`, `band`, `attempt`, `error_kind` (`recoverable` \| `unexpected`)                                                     | client only     |
| `guided_alternatives_opened`                | Modules page: learner opens "Try a different game"                                                                                                                                                             | `pool_size`                                                                                                                       | client only     |
| `guided_revisit_opened`                     | Modules page: learner opens "Play one again"                                                                                                                                                                   | `pool_size`                                                                                                                       | client only     |
| `guided_surprise_offered`                   | "Surprise me" discloses a destination — **before** any navigation                                                                                                                                              | `module_slug`, `why_available`, `pool_size`, `reroll_count`, `date_bucket`                                                        | client only     |
| `guided_surprise_rerolled`                  | Learner asks for a different destination ("Show me a different one")                                                                                                                                           | `module_slug`, `why_available`, `pool_size`, `reroll_count`, `date_bucket`                                                        | client only     |
| `guided_surprise_accepted`                  | Learner accepts the disclosed destination and is navigated to it                                                                                                                                               | `module_slug`, `why_available`, `pool_size`, `reroll_count`, `date_bucket`                                                        | client only     |
| `guided_surprise_cancelled`                 | Learner declines the surprise; nothing was navigated to                                                                                                                                                        | `pool_size`                                                                                                                       | client only     |
| `guided_surprise_empty`                     | "Surprise me" had nothing to offer — a safe state, not a failure                                                                                                                                               | —                                                                                                                                 | client only     |

`grade_band` values: `k2`, `g3_5`, `g6_8` (whatever the student's class is set to).

The `guided_*` family (#842) describes **process** only: which of the Modules
page's four navigation choices a learner reached for, and — for the surprise —
which destination was disclosed and whether they took it. `why_available` is
`progression` or `teacher_assignment`. `reroll_count` and `date_bucket` are the
seed parts, recorded so a disclosed pick can be reproduced exactly (design
principle 9 / `docs/safe-exploration-accessibility.md` §5), never to rank
anyone. No score, mastery, XP, accuracy or unlock signal rides on any of them,
because chance may not touch access or assessment.

`band` values (the `experiment_*` family only): `k2`, `older` — the Safe
Exploration controls (#838) distinguish only those two banded expressions.
`attempt` counts runs on that surface since mount: a **process** measure
(revisions), never a score, accuracy, or mastery signal. `experiment_failed`
exists so an infrastructure failure stays countable and distinct from a learner
outcome (Safe Exploration accessibility contract §6) instead of being swallowed.

### Demo-funnel privacy note

`/try` visitors are anonymous by design — no `identifyUser()` call fires on
the demo path. PostHog assigns an anonymous ID and automatically stitches
the demo session to the real identity if the visitor later signs up (when
`identifyUser()` fires post-registration). That's what makes the
demo → signup funnel measurable end-to-end without collecting anything
about the visitor.

### Counting curriculum play

`game_started` creates a new attempt ID when the authorized activity opens. A play
ends when Finish saves it. Practice rounds and an in-game reset before saving
are part of the same attempt. Leaving without submitting counts only as a start.
Demo and standalone PvP events have separate names.

Only the server emits finishes, after committing progress. `game_completed`
identifies the first completion by `progress_id`. `game_attempt_completed`
identifies each saved play by `(progress_id, attempt_id)`; `is_replay` means
the activity had already been completed. A retried POST with the same ID adds
no receipt or event, even when the first tab closed without receiving its
response. Older clients without attempt IDs still save progress and may emit
a first completion, but cannot supply a measurable play attempt.

Use post-rollout events for these insights; older events were emitted by both
client and server and were not rewritten. Analytics delivery is best effort.
Persisted Progress rows and finish receipts are the source for reconciliation.

## The scoreboard

Endpoint: `GET /api/admin/metrics` — requires `admin` role.

Returns:

```ts
{
  asOf: string; // ISO timestamp
  totalAccounts: number; // K-8 only (userType === 'k8')
  accountsByRole: {
    teacher: number;
    student: number;
  }
  totalClasses: number;
  avgStudentsPerClass: number; // 1 decimal
  gamesStarted: number; // Progress rows
  gamesCompleted: number; // Progress rows with status COMPLETED
  completionRate: number; // % with 1 decimal
  signupsLast7Days: number;
  signupsLast30Days: number;
  activeUsersLast7Days: number; // Distinct students with any Progress.updatedAt in window
}
```

The page lives at `/admin/metrics`. It's intentionally plain — function over form, no decorative chrome. It links out to PostHog for funnel exploration.

### Why some metrics live in PostHog instead

| Metric                       | Where             | Why                                                        |
| ---------------------------- | ----------------- | ---------------------------------------------------------- |
| Signup → first game rate     | PostHog funnel    | needs sequential event ordering per user                   |
| Teacher → class created rate | PostHog funnel    | same                                                       |
| Week-2 retention             | PostHog cohort    | retention math is what PostHog is built for                |
| Most-played games            | PostHog breakdown | `game_started` × `game_id` is a one-click chart in PostHog |
| Headline totals              | scoreboard        | DB is authoritative for "how many _exist_"                 |

## PostHog UI setup (manual)

These steps happen in the PostHog dashboard, not in code. Do them once per environment.

1. **Create insights**:
   - Funnel: `account_registered` → `game_started` (conversion %). Break down by `role`.
   - Funnel (teachers): `account_registered` (`role=teacher`) → `class_created` → `student_joined_class`.
   - Most played: count distinct started attempts by `game_id`.
   - Attempt completion rate: select starts in the reporting window; divide the number
     of distinct `(distinct_id, attempt_id)` from that cohort with a matching
     `game_attempt_completed` by the number of distinct started pairs. Allow
     finishes after the window up to the reporting cutoff. An unobserved start
     cannot enter either side of the ratio.
   - First completions: count distinct `progress_id` on `game_completed`.
     Saved replays: count distinct finished attempts with `is_replay=true`.
     The admin scoreboard counts completed Progress rows / all Progress rows;
     that is a learner–activity metric, not an attempt rate.
   - **Demo funnel (the homepage growth lever):** `demo_page_viewed` →
     `demo_game_started` → `demo_game_completed` → `demo_signup_cta_clicked`
     → `account_registered`. The headline acquisition number is
     `$pageview` (on `/`) → `account_registered`; this funnel diagnoses
     WHERE the demo path leaks.
2. **Retention cohort**: weekly retention on `login`.
3. **Dashboard**: pin all of the above on a single "K-8 Funnel" dashboard so reviewers see them at a glance.
4. **Session replay**: the client permits it only after teacher/admin identification. Confirm permitted recordings mask text and inputs. Anonymous/student replay, heatmaps, console capture, dead-click capture, and surveys must stay disabled by the client policy above. Project settings remain owner-managed.

## Adding a new event

1. Pick the moment. Fire at the _exact_ moment of the action — don't fire on render.
2. Add the event to the `AnalyticsEvent` discriminated union in `src/lib/analytics.ts` so the compiler catches typos.
3. Call `track({ kind: "your_event", ...props })`.
4. If it's scoreboard-critical (i.e. corresponds to a DB write that drives a funnel KPI), also call `trackServer(userId, "your_event", { ... })` in the route handler.
5. Update the **Event taxonomy** table above.
6. Pass only IDs, enums, counts, timings. **Never** email, name, or free-text content.

## Verifying locally

Run `npm run test:unit -- src/lib/__tests__/analytics.test.ts`. The suite checks
host validation and sanitized logs, enabled-SDK anonymous/student behavior,
teacher/admin recording, role transitions, delayed loading, reset ordering, and
the retained anonymous demo payload. Its SDK mock makes no provider requests and
uses no real key. No environment file or deployed configuration needs editing.

Browser entry checks permit the disclosed provider hosts and reject session-replay
requests on anonymous visits. A keyless browser build alone is not proof of the
enabled analytics policy; use the enabled-SDK tests as well.

## Baseline

Capture the headline numbers the day analytics go live. Future progress is measured against this row.

> **Baseline (TODO once deployed)**: pull `/api/admin/metrics` on the day this PR lands. Write the row here.

```
Date:              YYYY-MM-DD
totalAccounts:
teachers / students:
totalClasses:
gamesStarted:
gamesCompleted:
completionRate:
```

## Triage runbook — "PostHog events aren't firing in production"

Work through the layers in order — most of these failures fail silently, so don't trust any single signal.

1. **Bundle inlining (most common).** Open DevTools → Console on the live site. If you see:
   - `[analytics] DISABLED — VITE_POSTHOG_KEY is not present in the built bundle` → the key didn't make it into the build. Check `Dockerfile.frontend` declares `ARG VITE_POSTHOG_KEY` (and `_HOST`), confirm Railway's **frontend** service has the variable set (it must be a Railway **service** variable so it's available as a build arg), then trigger a clean rebuild from Railway (the docker layer cache may otherwise reuse the previous bundle).
   - `[analytics] Initializing PostHog → https://us.i.posthog.com` followed by `[analytics] PostHog ready` → init is working; move to step 2.
   - Initializing line but no "ready" line within a second → posthog-js failed to load. Network tab → look for blocked posthog.js requests (ad blockers / CSP / region typo).
2. **Region/host.** PostHog projects are pinned to a region. US project ↔ `https://us.i.posthog.com`, EU project ↔ `https://eu.i.posthog.com`. Events sent to the wrong region succeed silently and vanish. Check the PostHog project URL (us.posthog.com vs eu.posthog.com).
3. **Network.** Network tab → filter `posthog`. Fire an event (sign up, complete a module). Expected: POSTs returning 200. 401/403 = wrong project key. 4xx to a host you don't recognize = region/host wrong.
4. **Project mismatch.** Confirm the PostHog project you're viewing matches the API key in Railway. Each PostHog project has its own `phc_*` key. The team has more than one PostHog project? Easy to look at the wrong one.
5. **Idempotency trap for `game_completed`.** Only the server emits this event, once per `(studentId, activityId)`. Re-completing an already-completed activity skips the event — by design. Use a fresh activity on a fresh account for the test.
6. **Backend events.** The backend reads `process.env.POSTHOG_KEY` at runtime, not build time — set it on the Railway **backend** service. Check backend logs for the `[analytics]` info line at startup. If you see `[analytics] No POSTHOG_KEY set …`, the backend env var is missing.

## Where the code lives

| Concern                                      | File                                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Frontend shim (init, identify, track, reset) | `src/lib/analytics.ts`                                                                          |
| Frontend init call                           | `src/main.tsx`                                                                                  |
| Login + logout identification                | `src/contexts/AuthContext.tsx`                                                                  |
| Signup events                                | `src/pages/TeacherSignup.tsx`, `src/pages/StudentSignup.tsx`, `src/pages/LoginSelection.tsx`    |
| Class lifecycle                              | `src/pages/TeacherClasses.tsx`, `src/pages/JoinClass.tsx`                                       |
| Game lifecycle                               | `src/pages/ActivityPlayer.tsx`                                                                  |
| Backend shim                                 | `backend/src/services/analytics.ts`                                                             |
| Server capture calls                         | `backend/src/routes/auth.ts`, `backend/src/routes/courses.ts`, `backend/src/routes/progress.ts` |
| Scoreboard endpoint                          | `backend/src/routes/adminMetrics.ts`                                                            |
| Scoreboard page                              | `src/pages/AdminMetrics.tsx` (route in `src/App.tsx`)                                           |
| Graceful shutdown flush                      | `backend/src/server.ts` (`SIGTERM`/`SIGINT`)                                                    |
