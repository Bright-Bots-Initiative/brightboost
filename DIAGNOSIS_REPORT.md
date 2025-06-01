# Azure Function App 503 Error Diagnosis - RESOLVED

## Root Cause Identified
- **Primary Issue**: Missing `api_location: "api"` parameter in Azure Static Web Apps workflow
- **CI Evidence**: Deployment logs showed "No Api directory specified. Azure Functions will not be created."
- **Result**: Azure Functions were never deployed, causing 503 "Function host is not running" errors

## Fix Applied
1. **Workflow Configuration**: Added `api_location: "api"` to `.github/workflows/azure-static-web-apps-black-sand-053455d1e.yml`
2. **Documentation**: Updated Azure Portal configuration steps in `AZURE_FUNCTION_ENVIRONMENT.md`

## Remaining Configuration
After deployment, the following environment variables must be configured in Azure Portal > bb-dev-func > Configuration:
```
POSTGRES_URL=postgres://username:password@hostname:5432/database
JWT_SECRET=your-secure-jwt-secret-key
NODE_ENV=production
```

## Expected Outcome
- Azure Functions will be deployed through Static Web Apps workflow
- Endpoints will return JSON responses instead of 503 errors
- Environment variables may still need Azure Portal configuration for full functionality

## Verification Steps
1. Monitor CI deployment for successful Azure Functions creation
2. Test endpoints using test-api-endpoints.js script
3. Configure environment variables in Azure Portal if needed
4. Verify end-to-end signup and authentication flow
