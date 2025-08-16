# BrightBoost Production Login 405 – Root Cause and Fix

Status: In progress

Summary:
- Symptom: Student login on prod returned HTTP 405.
- Root cause: Frontend built with incorrect API base and/or API Gateway CORS/preflight not allowing POST/OPTIONS from SWA origin.
- Fix: Align frontend to use VITE_AWS_API_URL for prod API base (including stage), add SWA workflow for correct build paths, configure API Gateway CORS to allow SWA origin and OPTIONS handling, purge SWA cache, and verify.

Production URLs:
- SWA (student app): https://app.brightbotsint.org
- API (AWS API Gateway, stage /prod): https://t6gymccrfg.execute-api.us-east-1.amazonaws.com/prod

Frontend changes:
- src/services/api.ts now prioritizes:
  - VITE_AWS_API_URL
  - VITE_API_URL
  - VITE_API_BASE
  - default http://localhost:3000
- SWA workflow checked in at .github/workflows/azure-static-web-apps.yml with:
  - app_location: /
  - api_location: ""
  - output_location: dist

SWA environment variables (Production):
- VITE_AWS_API_URL=https://t6gymccrfg.execute-api.us-east-1.amazonaws.com/prod

Backend (API Gateway + Lambda) CORS:
- Allowed origin: https://app.brightbotsint.org
- Allowed methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
- Allowed headers: Content-Type, Authorization, X-Requested-With
- Allow-Credentials: true (if cookies used)
- OPTIONS preflight should return 200/204 with the headers above.

Verification

Results (verified):
- Preflight OPTIONS to https://t6gymccrfg.execute-api.us-east-1.amazonaws.com/prod/api/login returned 200 with:
  - Access-Control-Allow-Origin: https://brave-bay-0bfacc110.z01.azurestaticapps.net
  - Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
  - Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
  - Access-Control-Allow-Credentials: true
- POST to https://t6gymccrfg.execute-api.us-east-1.amazonaws.com/prod/api/login returned 401 {"error":"Invalid email or password"} using dummy credentials, confirming application-level auth handling (no longer 403/405).


Browser:
1) Open SWA prod, navigate to Student Login, attempt login.
2) In DevTools Network:
   - OPTIONS https://t6gymccrfg.execute-api.us-east-1.amazonaws.com/prod/api/login → 200/204
     - Access-Control-Allow-Origin: https://app.brightbotsint.org
     - Access-Control-Allow-Methods includes POST
     - Access-Control-Allow-Headers includes Content-Type
   - POST https://t6gymccrfg.execute-api.us-east-1.amazonaws.com/prod/api/login → 200/302 (as designed)

CLI preflight (expected 200/204 with CORS headers):
curl -i -X OPTIONS "https://t6gymccrfg.execute-api.us-east-1.amazonaws.com/prod/api/login" \
  -H "Origin: https://app.brightbotsint.org" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"

CI Hardening:
- SWA workflow added. A follow-up can add a smoke step to assert the built bundle contains the API base:
  - run: test -n "$(grep -R \"t6gymccrfg.execute-api.us-east-1.amazonaws.com/prod\" dist || true)"

Screenshots:
- [Attach DevTools Network captures here after verification]

Rollback:
- Revert workflow commit and redeploy previous SWA artifact if needed.
- In API Gateway, remove CORS entries added in this change if it causes side effects.

Links:
- PR: (to be added)
- CI run: (to be added)
- Devin run: https://app.devin.ai/sessions/15c4317efd684d12a5cd21d13998837f
