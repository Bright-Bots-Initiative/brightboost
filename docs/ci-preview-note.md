# CI Preview Deployment Configuration

This change implements conditional Azure Static Web Apps deployment logic to resolve CI failures:

**For Pull Requests:**

- Skips API deployment (`api_location: ""` and `skip_api_build: true`)
- Creates preview environments (`deployment_environment: "preview"`)
- Prevents "Failure during content distribution" errors

**For Production (main branch):**

- Includes full API deployment (`api_location: "api"`)
- Uses production environment (`deployment_environment: "production"`)
- Maintains complete functionality

**Permissions Fix:**
Added permissions blocks to both workflows:

- `azure-static-web-apps-black-sand-053455d1e.yml`: `contents: read`, `pull-requests: write`, `id-token: write`
- `pr-review-bot.yml`: `contents: read`, `pull-requests: write`, `issues: write`

This resolves "Resource not accessible by integration" errors in both deployment and review jobs.

This ensures PR validation works reliably while preserving full production deployment capabilities.
