> **Canonical for:** BRAND_R0 analytics baseline. Last verified against code: 2026-09-03.

# Analytics baseline (BRAND_R0)

Every row: UTC timestamp, production SHA, source, definition, value, confidence/limitation. Values marked `PENDING_EXTERNAL_READ` need an operator with the named access; do not fill them from memory.

**Production SHA at capture:** `91e4071f0017fa508bb9cf385abc066ede6b07e1` per GitHub deployment record `glorious-friendship / production` (`success`, 2026-09-02T23:09:21Z). Limitation: production exposed no SHA before BRAND_R0; the frontend `index.html` carried `Last-Modified: 2026-09-02T20:18:36Z`, which predates that commit, so the frontend image may be one or two commits older. After BRAND_R0 ships, read `sha` from `/api/health` and `<meta name="bb-git-sha">` instead.

## A. PostHog (project 454866 "Default project", org "BB", US cloud, timezone UTC)

Captured 2026-09-03T01:05–01:15Z through the PostHog MCP (read-only queries). Window `-30d` = 2026-08-04T00:00Z → 2026-09-03T00:00Z.

| Metric                         | Definition (reproduce)                                           | Value                                                                                                                                                                                                                                       | Confidence / limitation                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$pageview` total              | `query-trends` `EventsNode $pageview math total, dateRange -30d` | 21                                                                                                                                                                                                                                          | High; tiny traffic                                                                                                                                                                     |
| `homepage_viewed` total        | same, event `homepage_viewed`                                    | 21                                                                                                                                                                                                                                          | High                                                                                                                                                                                   |
| `login` total                  | same, event `login`                                              | 3                                                                                                                                                                                                                                           | High                                                                                                                                                                                   |
| `signup_clicked` total         | same, event `signup_clicked`                                     | 2                                                                                                                                                                                                                                           | High                                                                                                                                                                                   |
| `game_started` total           | same, event `game_started`                                       | 1                                                                                                                                                                                                                                           | High                                                                                                                                                                                   |
| `$web_vitals` total            | same, event `$web_vitals`                                        | 10                                                                                                                                                                                                                                          | High                                                                                                                                                                                   |
| Unique visitors                | `query-web-overview dateRange -30d` → `visitors`                 | 17                                                                                                                                                                                                                                          | High                                                                                                                                                                                   |
| Views / sessions               | same → `views` / `sessions`                                      | 21 / 18                                                                                                                                                                                                                                     | High                                                                                                                                                                                   |
| Avg session duration           | same → `session duration`                                        | 133.2 s                                                                                                                                                                                                                                     | High                                                                                                                                                                                   |
| Bounce rate                    | same → `bounce rate`                                             | 38.9 %                                                                                                                                                                                                                                      | High                                                                                                                                                                                   |
| Events **not seen** in 30 days | `read-data-schema {kind: events}`                                | `account_registered`, `class_created`, `student_joined_class`, `game_completed`, `quiz_question_answered`, `signup_role_selected`, all five `demo_*`, `plan_page_viewed`, `plan_cta_clicked`, `feedback_*`, `donation_clicked`, `$identify` | High that they are absent; whether absent = never fired or = no traffic is not distinguishable from PostHog alone (six of the twelve launch-funnel events also have known wiring gaps) |
| Feature flags                  | `feature-flag-get-all {}`                                        | 0                                                                                                                                                                                                                                           | High                                                                                                                                                                                   |
| Experiments                    | `experiment-list {}`                                             | 0                                                                                                                                                                                                                                           | High                                                                                                                                                                                   |
| Projects in org                | `projects-get {}`                                                | 1                                                                                                                                                                                                                                           | High — no staging project                                                                                                                                                              |

### Event health per taxonomy row (client / server mirror)

| Event                  | Wired (client)              | Wired (server)       | Seen 30d |
| ---------------------- | --------------------------- | -------------------- | -------- |
| `account_registered`   | signup pages                | `routes/auth.ts`     | no       |
| `login`                | `AuthContext`               | `routes/auth.ts`     | yes (3)  |
| `class_created`        | `TeacherClasses` (per docs) | `routes/courses.ts`  | no       |
| `student_joined_class` | `JoinClass` (per docs)      | `routes/courses.ts`  | no       |
| `game_started`         | `ActivityPlayer`            | —                    | yes (1)  |
| `game_completed`       | `ActivityPlayer`            | `routes/progress.ts` | no       |
| `demo_*` (5)           | `TryDemo`                   | —                    | no       |
| `plan_page_viewed/cta` | `PlanDetail`                | —                    | no       |
| `homepage_viewed`      | `Index`                     | —                    | yes (21) |

### Project settings relevant to privacy and staging (readback `project-get {}`)

| Setting                              | Value                                      | Note                                                                       |
| ------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------- |
| `session_recording_opt_in`           | `true`                                     | Masking is client-side (`maskAllInputs`, `maskTextSelector: "*"`)          |
| `session_recording_retention_period` | `30d`                                      | #794                                                                       |
| `session_recording_masking_config`   | `null` (project level)                     | Client config is the control; verify by replay skim (operator)             |
| `autocapture_exceptions_opt_in`      | `null` (off)                               | #794                                                                       |
| `capture_dead_clicks`                | `false`                                    | #794                                                                       |
| `capture_console_log_opt_in`         | `true`                                     | Console logs are captured in replays — review for PII before BRAND_R1      |
| `autocapture_web_vitals_opt_in`      | `true`                                     | Source of the RUM baseline below                                           |
| `test_account_filters`               | 1 filter: person `id not_in cohort 345214` | Test-user exclusion exists; membership of that cohort is an operator check |
| `anonymize_ips`                      | `false`                                    | Decision for BRAND_R1 privacy review                                       |
| `event_retention_months`             | 12                                         |                                                                            |
| `heatmaps_opt_in`                    | `true`                                     |                                                                            |
| `primary_dashboard`                  | 1671334                                    |                                                                            |

### Real-user web vitals (p75, last 30 days, `query-web-vitals`)

| Metric | Path                                                                | p75 value | Band |
| ------ | ------------------------------------------------------------------- | --------- | ---- |
| LCP    | `/student/modules`                                                  | 925 ms    | good |
| LCP    | `/`                                                                 | 1761 ms   | good |
| CLS    | `/`                                                                 | 0.0094    | good |
| CLS    | `/student/modules/k2-stem-maze-maps/lessons/…/activities/maze-maps` | 0.088     | good |

Limitation: 10 samples total; INP and FCP not captured in this pass (run the same query with `metric: "INP"` / `"FCP"`).

## B. Database-authoritative product metrics — `/admin/metrics`

Endpoint `GET /api/admin/metrics` (`backend/src/routes/adminMetrics.ts`, admin role). Definitions are in `docs/analytics.md` → _The scoreboard_.

| Field                  | Definition                                                        | Value                   |
| ---------------------- | ----------------------------------------------------------------- | ----------------------- |
| `asOf`                 | ISO timestamp of the read                                         | `PENDING_EXTERNAL_READ` |
| `totalAccounts`        | `User` rows with `userType = 'k8'`                                | `PENDING_EXTERNAL_READ` |
| `accountsByRole`       | teacher / student split of the above                              | `PENDING_EXTERNAL_READ` |
| `totalClasses`         | `Course` rows                                                     | `PENDING_EXTERNAL_READ` |
| `avgStudentsPerClass`  | `Enrollment` / `Course`, 1 decimal                                | `PENDING_EXTERNAL_READ` |
| `gamesStarted`         | `Progress` rows                                                   | `PENDING_EXTERNAL_READ` |
| `gamesCompleted`       | `Progress` rows with `status = COMPLETED`                         | `PENDING_EXTERNAL_READ` |
| `completionRate`       | completed / started, 1 decimal %                                  | `PENDING_EXTERNAL_READ` |
| `signupsLast7Days`     | k8 users created in the last 7 days                               | `PENDING_EXTERNAL_READ` |
| `signupsLast30Days`    | k8 users created in the last 30 days                              | `PENDING_EXTERNAL_READ` |
| `activeUsersLast7Days` | distinct `Progress.studentId` with `updatedAt` in the last 7 days | `PENDING_EXTERNAL_READ` |

Operator procedure (production, read-only):

```bash
# 1. Log in as an admin-role account in the app; copy the bb_access_token from localStorage.
# 2. Read the scoreboard and paste the JSON into the row above with the UTC time.
curl -sS -H "Authorization: Bearer $BB_ADMIN_TOKEN" https://brightboost.org/api/admin/metrics
# 3. Record /api/health.sha next to it once BRAND_R0 is deployed.
```

## C. Donation funnel

`VITE_DONATION_URL` is not set in production as far as the bundle shows (`Index.tsx` renders "Donation link coming soon" when unset — verify in the live page). `donation_clicked` has never been seen. No payment provider is integrated in this repository (bounded grep for `stripe|paypal|givebutter|zeffy|donorbox`: no matches). Bright Bots' own donation path lives on `brightbots.org` — `PENDING_EXTERNAL_READ` until section F of the staging runbook is done.

## D. Reproduction

All PostHog rows can be reproduced from the PostHog UI (Insights → Trends / Web analytics) or via the MCP calls named in the Definition column. The `_posthogUrl` links returned by each query are saved in the [evidence register](evidence-register.md).
