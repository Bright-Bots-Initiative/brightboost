> **Canonical for:** production rollback runbook. Last verified against code: 2026-09-03.

# Rollback runbook

Rollback is an exact-SHA redeploy of the previous **verified** commit plus, when a migration shipped, a data decision. It uses the same approval-bound promotion workflow as a release, so a rollback is itself recorded and verified. It is rehearsed on staging before it is ever needed.

## Code rollback (no migration in the bad release)

| #   | Action                                                                                                                                                                                                         | Verify                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Read `PREV` from the evidence register (recorded in promotion step 1) — never guess it from memory                                                                                                             | `PREV` is a full 40-hex SHA on `main`                                                         |
| 2   | GitHub → Actions → **Deploy promote (exact SHA)** → `environment: production`, `commit_sha: PREV` → Run; a second `team-leads` member approves                                                                 | The job deploys BE then FE at `PREV` and its strict verifier passes                           |
| 3   | If the workflow itself is unavailable: Railway → production project → each service → _Deployments_ → the deployment for `PREV` → **Rollback** (Railway keeps the image; `deploymentRollback` needs no rebuild) | Both services show `PREV`; `predeploy.sh` log: `migrate deploy` reports no pending migrations |
| 4   | `node scripts/verify-deploy-target.mjs --url https://brightboost.org --expect-env production --expect-sha PREV --require-declared-env --expect-analytics enabled`                                              | exit 0                                                                                        |
| 5   | Cloudflare → Caching → **Purge everything** (hashed assets are immutable, but `index.html` may be edge-cached)                                                                                                 | `curl -sSI https://brightboost.org/` shows `cf-cache-status: DYNAMIC` or `MISS`               |
| 6   | Record in the register: bad `SHA`, `PREV`, UTC times, approver, what failed (finding codes / screenshots)                                                                                                      | Row present                                                                                   |
| 7   | Open an issue for the failure with the register row linked; the fix goes through staging and the promotion runbook again                                                                                       | Issue number in the register                                                                  |

`RAILWAY_GIT_COMMIT_SHA` of the redeployed image is `PREV`, so `/api/health.sha` and `<meta name="bb-git-sha">` report `PREV` — this is what step 4 checks.

## Rollback when the bad release included a migration

`prisma migrate deploy` is forward-only. Rolling the **code** back to `PREV` while the schema is at `SHA` is safe only if the migration was additive (new nullable columns/tables). Decide before promotion (promotion precondition 7):

| Migration shape                                        | Rollback path                                                                                                                                                                                                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Additive (new table / nullable column / new index)     | Code rollback above; leave the schema. Record that the schema is ahead of the code.                                                                                                                                                                 |
| Destructive (drop / rename / not-null without default) | **Restore the database** from the pre-promotion backup (Supabase → Backups → restore to a new project, then repoint `DATABASE_URL`/`DIRECT_URL`) **and** code rollback. Expect data written after the backup to be lost — announce before doing it. |
| Data migration (backfill)                              | Treat as destructive unless the backfill is idempotent and reversible by a documented script                                                                                                                                                        |

The BRAND_R0 decision authorizes **no schema change** for the rebrand; if BRAND_R1 needs one, it lands in its own reviewed PR with a rollback note before promotion.

## Staging rehearsal (required before the first production promotion, then quarterly)

1. Note staging's live SHA (`/api/health.sha`) — call it `CUR`.
2. Run **Deploy promote** with `environment: staging`, `commit_sha: <a prior known-good SHA on main>`; strict verifier passes at that SHA.
3. Run it again with `commit_sha: CUR`; strict verifier passes; `SELECT count(*) FROM "User"` on staging is unchanged (data continuity — deploys never touch rows).
4. Record both runs (ids, SHAs, UTC times) in the evidence register (row E-42).

## Backup and restore proof (staging, once per quarter and before BRAND_R1_BUILD)

1. Supabase staging (`sduhifvagbznswdkjldw`) → _Backups_ → take/download a backup; note the time. (Backups are a paid-plan feature; on a free-plan staging project use `pg_dump` through the session pooler instead.)
2. Restore into a scratch project (or `pg_restore` into a scratch database whose name contains `test`).
3. Compare: `SELECT count(*) FROM "User";` and `SELECT count(*) FROM "Progress";` on both.
4. Record: backup time, restore duration, counts, who ran it — in the evidence register (row E-34).
5. Delete the scratch project.

Production restore is never rehearsed against production. The staging rehearsal is the proof that the procedure works; the production backup series (daily physical, ~08:15 UTC) is recorded in row E-24.

## Feature-flag kill switch

For anything behind a registered flag (`src/lib/featureFlags.ts`): disable the flag in PostHog — every client falls to `fallback` on its next flag load without a deploy. Record the toggle and the reason. A flag is not a substitute for rollback when the fallback path itself changed in the release.
