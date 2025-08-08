Staging configuration for Pilot Smoke

Environment
- VITE_API_BASE: Base URL of the staging API (no trailing slash), example:
  VITE_API_BASE=https://your-staging-host

GitHub Secrets required for CI (Cypress staging workflow)
- VITE_API_BASE: same value as above
- CYPRESS_TEACHER_EMAIL: teacher test account email on staging
- CYPRESS_TEACHER_PASSWORD: teacher test account password
- CYPRESS_STUDENT_EMAIL: student test account email
- CYPRESS_STUDENT_PASSWORD: student test account password
- Optional:
  - CYPRESS_STUDENT_ID: explicit student id if required by APIs
  - CYPRESS_LESSON_ID: a valid lesson id under STEM-1 if you want to force a checkpoint post

Notes
- No credentials or secrets should be committed to the repo.
- You can create the above test accounts via the normal signup flow on staging if they do not exist yet.
- To run locally against staging:
  1) Create a .env.local in the repo root with:
     VITE_API_BASE=https://your-staging-host
  2) npm run dev
  3) The app will use VITE_API_BASE for all API calls.

Cypress Smoke (pilot)
- Spec: cypress/e2e/pilot-smoke.cy.ts
- Runs on GitHub Actions when PR is labeled: pilot-smoke
- Uses the secrets listed above and hits staging endpoints directly.
