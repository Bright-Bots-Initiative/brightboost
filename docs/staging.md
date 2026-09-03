# Staging

There is **no staging host yet** (verified 2026-09-03). Until BRAND_R0's operator work lands, the only deployed environment is production on Railway behind Cloudflare (`https://brightboost.org`).

- Building the staging environment (Railway, Supabase, PostHog, Cloudflare, GitHub): [`docs/brand-refresh/release-0/staging-runbook.md`](brand-refresh/release-0/staging-runbook.md)
- What each environment may touch and how they are told apart: [`docs/brand-refresh/release-0/environment-matrix.md`](brand-refresh/release-0/environment-matrix.md)
- Running the staging smoke once a host exists: [`docs/staging-smoke.md`](staging-smoke.md) (`npm run test:e2e:staging`) and `node scripts/verify-deploy-target.mjs --url <host> --expect-env staging --expect-sha <sha>`
- Production URLs and variables: [`DEPLOYMENT.md`](../DEPLOYMENT.md)

## Testing against production (read-only)

```bash
curl -sS https://brightboost.org/api/health
# Expected after BRAND_R0 deploys: {"status":"ok",…,"env":"production","sha":"<commit>","noindex":false,"analytics":"enabled"}
curl -sS https://brightboost.org/api/login -X POST -H "Content-Type: application/json" -d '{}'
# Expected: 400 (validation error = API is up)
```

`cypress-staging.yml` still points at the fossil `cypress/e2e/pilot-smoke.cy.ts` path (see `docs/ops/ci.md`); re-pointing it at `test:e2e:staging` is a follow-up once a staging URL exists.
