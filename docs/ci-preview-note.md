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
Added `pull-requests: write` permission to resolve "Resource not accessible by integration" error in review job.

This ensures PR validation works reliably while preserving full production deployment capabilities.
