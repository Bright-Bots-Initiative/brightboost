# Azure Function App Migration Plan: Python to Node.js

## Problem
The current Azure Function App `bb-dev-func` is configured with **Python runtime stack** but contains **JavaScript/Node.js code**, causing "Function host is not running" errors. Azure does not allow changing the runtime stack after Function App creation.

## Solution: Create New Node.js Function App

### Step 1: Create New Function App in Azure Portal
1. **Navigate to Azure Portal** > Create a resource > Function App
2. **Configuration**:
   - **Function App name**: `bb-dev-func-node` (or similar)
   - **Runtime stack**: Node.js (version 18 LTS recommended)
   - **Version**: 18 LTS
   - **Region**: Same as current app (for consistency)
   - **Resource Group**: Same as current app
   - **Operating System**: Linux (recommended for Node.js)
   - **Plan type**: Same as current app

### Step 2: Configure Environment Variables
In the new Function App, set these Application Settings:
```
POSTGRES_URL=<your-postgresql-connection-string>
JWT_SECRET=<your-jwt-secret-key>
NODE_ENV=production
```

### Step 3: Update CI/CD Configuration
Update deployment workflows to target the new Function App:

#### Option A: Update Main CI/CD Pipeline
File: `.github/workflows/ci-cd.yml`
```yaml
- name: Deploy to Azure Function App
  uses: azure/functions-action@v1
  with:
    app-name: bb-dev-func-node  # Changed from bb-dev-func
    package: api
    publish-profile: ${{ secrets.AZURE_FUNCTION_PUBLISH_PROFILE_NODE }}  # New secret
```

#### Option B: Update Static Web Apps Integration
File: `.github/workflows/azure-static-web-apps-black-sand-053455d1e.yml`
- Verify `api_location: "api"` is present
- May need to update Static Web App configuration to point to new Function App

### Step 4: Update GitHub Secrets
1. **Get new publish profile** from Azure Portal > bb-dev-func-node > Get publish profile
2. **Add new secret**: `AZURE_FUNCTION_PUBLISH_PROFILE_NODE` with the new publish profile content
3. **Keep old secret** temporarily for rollback if needed

### Step 5: Update Application References
Update any hardcoded references to the old Function App URL:
- Frontend API base URL configurations
- Documentation
- Test scripts

### Step 6: Test Migration
1. **Deploy to new Function App** via CI/CD
2. **Test all endpoints**:
   - `/api/hello` - Health check
   - `/api/signup` - User registration
   - `/api/login` - User authentication
   - `/api/health` - Environment diagnostics
3. **Verify environment variables** are working
4. **Test database connectivity**

### Step 7: Cleanup (After Successful Migration)
1. **Update production references** to use new Function App
2. **Archive or delete** old Python Function App (`bb-dev-func`)
3. **Remove old secrets** from GitHub

## Implementation Priority
1. **High Priority**: Create new Node.js Function App and configure environment variables
2. **Medium Priority**: Update CI/CD to deploy to new app ✅ **COMPLETED**
3. **Low Priority**: Clean up old resources after validation

## CI/CD Updates Applied
- Updated `.github/workflows/ci-cd.yml` to target `bb-dev-func-node` instead of `bb-dev-func`
- Changed publish profile secret to `AZURE_FUNCTION_PUBLISH_PROFILE_NODE`
- Maintained same package source (`api` directory) and deployment action

## Rollback Plan
- Keep old Function App until new one is fully validated
- Maintain both sets of GitHub secrets during transition
- Can quickly revert CI/CD configuration if issues arise

## Expected Outcome
- All `/api/*` endpoints return proper JSON responses (200/201 status codes)
- Function App runtime starts successfully
- Environment variables accessible to Node.js functions
- Database connectivity working through Prisma ORM
