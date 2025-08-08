Staging configuration

Staging Site (Azure Static Web Apps)
- URL: https://brave-bay-0bfacc110-production.centralus.6.azurestaticapps.net

Backend API Base
- Set as a GitHub Secret and build-time env for Vite:
  - VITE_API_BASE=https://<your-staging-backend-host>  (no trailing slash)
- All frontend API calls are prefixed with VITE_API_BASE at runtime.

GitHub Secrets required
- For Azure SWA deploy workflow:
  - AZURE_STATIC_WEB_APPS_API_TOKEN  (copy from Azure Static Web App → Deployment token)
  - VITE_API_BASE  (the staging backend API root)
- For Cypress staging workflow (optional, if using the smoke):
  - VITE_API_BASE
  - CYPRESS_TEACHER_EMAIL
  - CYPRESS_TEACHER_PASSWORD
  - CYPRESS_STUDENT_EMAIL
  - CYPRESS_STUDENT_PASSWORD
  - Optional:
    - CYPRESS_STUDENT_ID
    - CYPRESS_LESSON_ID

Local run against staging
1) Create a .env.local in the repo root with:
   VITE_API_BASE=https://<your-staging-backend-host>
2) npm run dev
3) The app will use VITE_API_BASE for all API calls.

One-page smoke
- Verify module endpoint:
  curl -i "$VITE_API_BASE/api/module/stem-1"
- Open the staging site:
  https://brave-bay-0bfacc110-production.centralus.6.azurestaticapps.net
- In the browser devtools Network tab, confirm requests go to $VITE_API_BASE.
