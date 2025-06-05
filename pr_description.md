# Standardize Node.js to 18.x for Azure Static Web Apps Managed Functions

## Summary
This PR standardizes Node.js runtime to 18.x across all Azure Static Web Apps configuration files and removes legacy external Azure Function App references to enable successful managed functions deployment.

## Changes Made

### ✅ Configuration Updates
- **staticwebapp.config.json**: Added `"platform": {"apiRuntime": "node:18"}` to specify Node 18 runtime for managed functions
- **package.json**: Updated `@types/node` from `^20.10.0` to `^18.19.0` for type consistency
- **azure-static-web-apps.yml**: Updated `FUNCTIONS_WORKER_RUNTIME` from `node` to `node:18` for explicit version control

### ✅ Removed External Function App References
- **Deleted**: `.github/workflows/main_bb-dev-func-api.yml` (deployed to external bb-dev-func-api)
- **Updated**: `.github/workflows/ci-cd.yml` - removed "Deploy Azure Function App" step that conflicted with managed functions
- **Updated**: `AZURE_DEPLOYMENT.md` - standardized Node version documentation to 18 only

### ✅ Dependencies Updated
- **package-lock.json**: Updated to reflect new @types/node version

## Testing Strategy
- Minimal `/api/hello` function deployment test
- Verification of managed functions deployment success
- Confirmation that no external function app linkages remain

## Acceptance Criteria Met
- ✅ staticwebapp.config.json specifies "apiRuntime": "node:18" under platform key
- ✅ No Node 20.x references remain in workflows or config files  
- ✅ GitHub Actions workflows use Node 18 for both build and runtime
- ✅ External Azure Function App deployment workflows removed
- ✅ Atomic, testable commits provided

## Next Steps
- Monitor deployment logs for successful managed functions deployment
- Test GET request to `/api/hello` endpoint
- Verify Azure Portal Static Web App has no external function app linkage
- Gradually reintroduce other endpoints after successful hello deployment

## Link to Devin run
https://app.devin.ai/sessions/bdd0f424e91941038b10b69355d35621

Requested by: Nathan Walker (nwalker@brightbotsint.com)
