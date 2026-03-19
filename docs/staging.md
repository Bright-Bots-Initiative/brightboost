# Staging Configuration

## Production (Railway)

- **URL:** https://fe-production-3552.up.railway.app
- **Backend API:** Same domain, under `/api/`
- **Database:** Supabase Postgres (production)

> **Note:** The former Azure Static Web Apps staging URL (`brave-bay-0bfacc110-...`) is no longer the production frontend.

## Testing Against Production

```bash
# Health check
curl https://fe-production-3552.up.railway.app/api/login -X POST \
  -H "Content-Type: application/json" -d '{}'
# Expected: 400 (validation error = API is up)
```

## Cypress Staging Smoke

The `cypress-staging.yml` workflow can run against the production Railway URL.
Set these GitHub Secrets:

| Secret | Purpose |
|---|---|
| `CYPRESS_SWA_URL` | Railway production URL |
| `VITE_API_BASE` | Railway production API base |
| `CYPRESS_STUDENT_ID` | Test student ID |
| `CYPRESS_LESSON_ID` | Test lesson ID |

## Local Against Production API

Create `.env.local` in repo root:

```env
VITE_API_BASE=https://fe-production-3552.up.railway.app
```

Then run: `npm run dev`
