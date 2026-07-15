# Cypress Staging Smoke

This repo includes a minimal Cypress smoke test that verifies:

- The deployed SWA site loads
- The live AWS API is reachable
- Optional: a guarded checkpoint POST works with dev headers enabled

Secrets required (GitHub repository secrets):

- CYPRESS_SWA_URL: SWA site URL (e.g., https://example.azurestaticapps.net)
- VITE_API_BASE: AWS API base (e.g., https://4gjaltqo31.execute-api.us-east-1.amazonaws.com)
- Optional:
  - CYPRESS_ALLOW_DEV_HEADERS=1 to enable the POST checkpoint test
  - CYPRESS_STUDENT_ID and CYPRESS_LESSON_ID (optional; lessonId auto-fetched)

Run locally (spec lives at `cypress/e2e/staging/smoke.cy.ts`):

```bash
CYPRESS_SWA_URL=https://<swa-url> VITE_API_BASE=https://<api-base> npm run test:e2e:staging
```

Missing required env throws via `requireEnv` (never a silent pass). See `docs/ci.md`.

Notes:

- Base URL is read from `CYPRESS_SWA_URL` in `cypress.config.ts` when set; otherwise defaults to `http://localhost:5173` (boot Vite for collection even when tests will throw)
- Cypress picks up both `CYPRESS_*` and process env vars
- Artifact upload from CI is out of scope for #677 (#671/#648)
