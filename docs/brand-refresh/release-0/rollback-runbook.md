> **Canonical for:** production rollback runbook. Last verified against code: 2026-09-03.

# Rollback runbook

Rollback is a Railway redeploy of the previous **verified** SHA plus, when a migration shipped, a data decision. It is rehearsed on staging before it is ever needed (staging runbook B.10).

## Code rollback (no migration in the bad release)

| #   | Action                                                                                                                     | Verify                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | Read `PREV` from the evidence register (recorded in promotion step 1) — never guess it from memory                         | `PREV` is a full SHA                                                                 |
| 2   | Railway → production project → backend service → _Deployments_ → the deployment for `PREV` → **Rollback** (or _Redeploy_)  | Deployment shows `PREV`; `predeploy.sh` log: `migrate deploy succeeded` (no pending) |
| 3   | Same for the frontend service                                                                                              | Deployment shows `PREV`                                                              |
| 4   | `node scripts/verify-deploy-target.mjs --url https://brightboost.org --expect-env production --expect-sha PREV`            | exit 0                                                                               |
| 5   | Cloudflare → Caching → **Purge everything** (the frontend image serves hashed assets, but `index.html` may be edge-cached) | `curl -sSI https://brightboost.org/` shows `cf-cache-status: DYNAMIC` or `MISS`      |
| 6   | Record in the register: bad `SHA`, `PREV`, UTC times, who decided, what failed (finding codes / screenshots)               | Row present                                                                          |
| 7   | Open an issue for the failure with the register row linked; the fix goes through staging and the promotion runbook again   | Issue number in the register                                                         |

Railway keeps previous images, so steps 2–3 take minutes and need no rebuild. `RAILWAY_GIT_COMMIT_SHA` of the redeployed image is `PREV`, so `/api/health.sha` reports `PREV` — this is what step 4 checks.

## Rollback when the bad release included a migration

`prisma migrate deploy` is forward-only. Rolling the **code** back to `PREV` while the schema is at `SHA` is safe only if the migration was additive (new nullable columns/tables). Decide before promotion (promotion step 3):

| Migration shape                                        | Rollback path                                                                                                                                                                                                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Additive (new table / nullable column / new index)     | Code rollback above; leave the schema. Record that the schema is ahead of the code.                                                                                                                                                                 |
| Destructive (drop / rename / not-null without default) | **Restore the database** from the pre-promotion backup (Supabase → Backups → restore to a new project, then repoint `DATABASE_URL`/`DIRECT_URL`) **and** code rollback. Expect data written after the backup to be lost — announce before doing it. |
| Data migration (backfill)                              | Treat as destructive unless the backfill is idempotent and reversible by a documented script                                                                                                                                                        |

The BRAND_R0 decision authorizes **no schema change** for the rebrand; if BRAND_R1 needs one, it lands in its own reviewed PR with a rollback note before promotion.

## Backup and restore proof (staging, once per quarter and before BRAND_R1_BUILD)

1. Supabase staging → _Backups_ → take/download a backup; note the time.
2. Restore into a scratch project (or `pg_restore` into a scratch database whose name contains `test`).
3. Compare: `SELECT count(*) FROM "User";` and `SELECT count(*) FROM "Progress";` on both.
4. Record: backup time, restore duration, counts, who ran it — in the evidence register.
5. Delete the scratch project.

Production restore is never rehearsed against production. The staging rehearsal is the proof that the procedure works.

## Feature-flag kill switch

For anything behind a registered flag (`src/lib/featureFlags.ts`): disable the flag in PostHog — every client falls to `fallback` on its next flag load without a deploy. Record the toggle and the reason. A flag is not a substitute for rollback when the fallback path itself changed in the release.
