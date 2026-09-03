> **Canonical for:** production promotion runbook (exact SHA). Last verified against code: 2026-09-03.

# Promotion runbook — staging → production

Applies once the [staging runbook](staging-runbook.md) is terminal (production auto-deploy disabled, Wait for CI on, one Railway project). Until then, production still deploys on every push to `main` and this runbook is the target state, not the current one.

## Preconditions

1. The candidate is a merge commit on `main` (squash merge, linear history) — call it `SHA`.
2. Required checks green on `SHA`: `gh api repos/Bright-Bots-Initiative/brightboost/commits/SHA/check-runs --jq '.check_runs[] | "\(.name)\t\(.conclusion)"'` shows `build-and-test`, `db-check`, `e2e-flows` = `success`.
3. Staging auto-deployed `SHA` and passes:

```bash
node scripts/verify-deploy-target.mjs --url https://staging.brightboost.org --expect-env staging --expect-sha SHA
CYPRESS_SWA_URL=https://staging.brightboost.org VITE_API_BASE=https://staging.brightboost.org npm run test:e2e:staging
```

4. For BRAND_R1 changes only: the visual/functional walkthrough in the evidence register is signed by a second person (Chrome attached for this step only).
5. No open `P1` defect on the surfaces the change touches.

## Steps

| #   | Action                                                                                                                                                                                   | Verify                                                                                                                | Owner    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Record the current production SHA: `curl -sS https://brightboost.org/api/health` → `sha` (call it `PREV`)                                                                                | `PREV` written in the evidence register with UTC time                                                                 | OWN      |
| 2   | Confirm a database backup newer than the last schema change exists (Supabase → Backups)                                                                                                  | Backup timestamp recorded                                                                                             | OWN      |
| 3   | If `SHA` contains a migration (`prisma/migrations/` changed since `PREV`): read it; confirm it is additive or has a rollback note                                                        | Migration reviewed; note in the register                                                                              | OWN      |
| 4   | GitHub → Actions → **Deploy verify (exact SHA)** → `environment: production`, `base_url: https://brightboost.org`, `expected_sha: PREV`                                                  | Run passes (production still healthy at `PREV`); the required reviewer approves the run — this is the approval record | Reviewer |
| 5   | Railway → production project → backend service → **Deploy → `SHA`** (dashboard "deploy specific commit", or `railway up --ci` from a checkout at `SHA`); repeat for the frontend service | Both deployments show `SHA`; `predeploy.sh` log shows `migrate deploy succeeded` and `skipping seed`                  | OWN      |
| 6   | Wait for both services to be _Active_; then `node scripts/verify-deploy-target.mjs --url https://brightboost.org --expect-env production --expect-sha SHA`                               | exit 0; no `DT-` finding                                                                                              | OWN      |
| 7   | Run the same command against `https://fe-production-3552.up.railway.app` (the origin) — Cloudflare must not change the verdict                                                           | exit 0                                                                                                                | OWN      |
| 8   | Smoke the login path: `curl -sS -X POST https://brightboost.org/api/login -H 'content-type: application/json' -d '{}'` → `400`                                                           | `400` (validation), not `5xx`                                                                                         | OWN      |
| 9   | PostHog (production project): Live events show `$pageview` from the new build within 5 minutes; no `[analytics] REFUSED` in Railway logs                                                 | Screenshot or event id in the register                                                                                | OWN      |
| 10  | Re-run **Deploy verify** with `expected_sha: SHA` — the approved, timestamped record that `SHA` is live                                                                                  | Run passes; link recorded                                                                                             | Reviewer |
| 11  | Post in `#deployments` (the backend already posts on boot with `RAILWAY_GIT_COMMIT_SHA`): `SHA`, `PREV`, verification run link                                                           | Message posted                                                                                                        | OWN      |

## If step 6–9 fails

Go straight to the [rollback runbook](rollback-runbook.md) with `PREV`. Do not fix forward on production.

## Scope reminder

BRAND_R1 visual changes ride this runbook. No gameplay, scoring, progression, auth, or schema change is authorized by the brand decision; such a change must have its own owning issue and review before it enters `SHA`.
