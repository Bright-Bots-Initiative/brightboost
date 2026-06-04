# Bright Boost Analytics

Funnel instrumentation, scoreboard, and tooling notes for the K-8 product.

## Tooling

| What | Where | Used for |
| --- | --- | --- |
| **PostHog Cloud** | https://us.i.posthog.com | product analytics, funnels, retention cohorts, session replay, feature flags |
| **Internal scoreboard** | `/admin/metrics` | DB-source-of-truth totals (admin role required) |

PostHog is the exploration tool — slice events by property, build funnels, run experiments. The scoreboard is the trustworthy headline number ("how many teachers signed up?") because it counts from Postgres directly.

## Environment variables

Set in Railway for production; copy to `.env` locally if you want events to flow during dev.

```
# Frontend (public — safe to ship in the bundle)
VITE_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_POSTHOG_HOST=https://us.i.posthog.com

# Backend (same key)
POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
POSTHOG_HOST=https://us.i.posthog.com
```

When unset, both shims (`src/lib/analytics.ts` and `backend/src/services/analytics.ts`) silently no-op so local dev runs fine without the key. The first call logs a single info-level message so the absence is obvious.

## Privacy rules (COPPA-conscious)

This is a children's product. **These rules are non-negotiable:**

- `distinct_id` is ALWAYS the DB user id (`User.id`). Never email, name, or any PII.
- Session recordings mask all input values (`maskAllInputs: true`) and all rendered text (`maskTextSelector: '*'`). Replays show interaction shape, not content.
- Never track free-text content (homework answers, names typed into fields, messages).
- Track behavior (counts, timings, IDs, enum values) — not content.
- When adding a new event, pass IDs and enums, not personal data.

The comment block at the top of `src/lib/analytics.ts` enforces the same rules in-code so interns adding events will see them.

## Event taxonomy

| Event | When | Properties | Surface |
| --- | --- | --- | --- |
| `account_registered` | Signup success (email or cohort code) | `role`, `signup_method` | client + server |
| `login` | Auth success (any method) | `role` | client + server |
| `class_created` | Teacher creates a class | `class_id`, `grade_band` | client + server |
| `student_joined_class` | Student joins via class code | `class_id`, `join_method` | client + server |
| `game_started` | Activity/game opens | `game_id`, `module_slug`, `activity_id`, `grade_band` | client only |
| `game_completed` | Activity/game finishes (first time per student) | `game_id`, `module_slug`, `activity_id`, `score`, `time_spent_seconds`, `grade_band` | client + server |

`grade_band` values: `k2`, `g3_5`, `g6_8` (whatever the student's class is set to).

### Client-only vs. client+server

Game start is **client-only** by design — it fires when the activity component mounts, which is too early to bother the server with a dedicated event (we don't have an "I opened a game" route, only "I completed it"). Funnel analysis still works: PostHog deduplicates per `distinct_id`.

Everything that maps to a database write is mirrored server-side. The server is the source of truth — if the kid closes their tab right before the network request completes, the server-side capture still goes out (it runs in the same request handler that wrote to Postgres).

## The scoreboard

Endpoint: `GET /api/admin/metrics` — requires `admin` role.

Returns:

```ts
{
  asOf: string;                            // ISO timestamp
  totalAccounts: number;                   // K-8 only (userType === 'k8')
  accountsByRole: { teacher: number; student: number };
  totalClasses: number;
  avgStudentsPerClass: number;             // 1 decimal
  gamesStarted: number;                    // Progress rows
  gamesCompleted: number;                  // Progress rows with status COMPLETED
  completionRate: number;                  // % with 1 decimal
  signupsLast7Days: number;
  signupsLast30Days: number;
  activeUsersLast7Days: number;            // Distinct students with any Progress.updatedAt in window
}
```

The page lives at `/admin/metrics`. It's intentionally plain — function over form, no decorative chrome. It links out to PostHog for funnel exploration.

### Why some metrics live in PostHog instead

| Metric | Where | Why |
| --- | --- | --- |
| Signup → first game rate | PostHog funnel | needs sequential event ordering per user |
| Teacher → class created rate | PostHog funnel | same |
| Week-2 retention | PostHog cohort | retention math is what PostHog is built for |
| Most-played games | PostHog breakdown | `game_started` × `game_id` is a one-click chart in PostHog |
| Headline totals | scoreboard | DB is authoritative for "how many *exist*" |

## PostHog UI setup (manual)

These steps happen in the PostHog dashboard, not in code. Do them once per environment.

1. **Create insights**:
   - Funnel: `account_registered` → `game_started` (conversion %). Break down by `role`.
   - Funnel (teachers): `account_registered` (`role=teacher`) → `class_created` → `student_joined_class`.
   - Trend: `game_started` count by `game_id` (most-played).
   - Trend: completion rate = `game_completed` / `game_started`.
2. **Retention cohort**: weekly retention on `login`.
3. **Dashboard**: pin all of the above on a single "K-8 Funnel" dashboard so reviewers see them at a glance.
4. **Session replay**: keep on. Confirm the masking config in `src/lib/analytics.ts` is taking effect by skimming a recording — all text and inputs should be solid blocks.

## Adding a new event

1. Pick the moment. Fire at the *exact* moment of the action — don't fire on render.
2. Add the event to the `AnalyticsEvent` discriminated union in `src/lib/analytics.ts` so the compiler catches typos.
3. Call `track({ kind: "your_event", ...props })`.
4. If it's scoreboard-critical (i.e. corresponds to a DB write that drives a funnel KPI), also call `trackServer(userId, "your_event", { ... })` in the route handler.
5. Update the **Event taxonomy** table above.
6. Pass only IDs, enums, counts, timings. **Never** email, name, or free-text content.

## Verifying locally

```bash
# Without a key — should print a single info message, no errors
unset VITE_POSTHOG_KEY POSTHOG_KEY
npm run dev

# With a key — events should appear in PostHog Live Events within seconds
echo 'VITE_POSTHOG_KEY=phc_xxx' >> .env.local
npm run dev
# Register a test account, start a game, watch PostHog
```

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

## Where the code lives

| Concern | File |
| --- | --- |
| Frontend shim (init, identify, track, reset) | `src/lib/analytics.ts` |
| Frontend init call | `src/main.tsx` |
| Login + logout identification | `src/contexts/AuthContext.tsx` |
| Signup events | `src/pages/TeacherSignup.tsx`, `src/pages/StudentSignup.tsx`, `src/pages/LoginSelection.tsx` |
| Class lifecycle | `src/pages/TeacherClasses.tsx`, `src/pages/JoinClass.tsx` |
| Game lifecycle | `src/pages/ActivityPlayer.tsx` |
| Backend shim | `backend/src/services/analytics.ts` |
| Server-side mirror calls | `backend/src/routes/auth.ts`, `backend/src/routes/courses.ts`, `backend/src/routes/progress.ts` |
| Scoreboard endpoint | `backend/src/routes/adminMetrics.ts` |
| Scoreboard page | `src/pages/AdminMetrics.tsx` (route in `src/App.tsx`) |
| Graceful shutdown flush | `backend/src/server.ts` (`SIGTERM`/`SIGINT`) |
