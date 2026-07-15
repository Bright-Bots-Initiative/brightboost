# Cypress Staging Smoke

This repo includes a minimal Cypress smoke test that verifies:

- The deployed SWA site loads
- The live AWS API is reachable
- Optional: a guarded checkpoint POST works with dev headers enabled

Secrets / env required (see `docs/ci.md` for the full table):

- `CYPRESS_SWA_URL`: deployed staging / SWA URL (e.g. `https://brightboost-staging.up.railway.app`)
- `VITE_API_BASE`: API base (same host as SWA in the Railway single-service setup)
- Optional:
  - `CYPRESS_ALLOW_DEV_HEADERS=1` to enable the POST checkpoint test
  - `CYPRESS_STUDENT_ID` and `CYPRESS_LESSON_ID` (optional; lessonId auto-fetched)

Run locally (spec lives at `cypress/e2e/staging/smoke.cy.ts`):

```bash
CYPRESS_SWA_URL=https://<swa-url> VITE_API_BASE=https://<api-base> npm run test:e2e:staging
```

Missing required env throws via `requireEnv` (never a silent pass). See `docs/ci.md`.

Notes:

- Base URL is read from `CYPRESS_SWA_URL` in `cypress.config.ts` when set; otherwise defaults to `http://localhost:5173` (boot Vite for collection even when tests will throw)
- Cypress picks up both `CYPRESS_*` and process env vars
- Artifact upload from CI is out of scope for #677 (#671/#648)
