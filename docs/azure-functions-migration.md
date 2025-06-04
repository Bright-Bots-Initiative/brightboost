# Azure Functions Migration: v4 to v3 for Static Web Apps

## Issue
Azure Static Web Apps managed functions deployment consistently fails with "Failed to deploy the Azure Functions" error, even with minimal v3 configuration.

## Root Cause Analysis
- v4 programming model incompatible with Azure Static Web Apps managed functions
- v3 programming model conversion completed successfully
- Minimal configuration testing reveals persistent deployment failure
- Issue appears to be platform-level constraint, not configuration problem

## Attempted Solutions
1. **v4 to v3 Conversion**: Converted from `app.http()` to `module.exports` syntax ❌
2. **ExtensionBundle Addition**: Added Microsoft.Azure.Functions.ExtensionBundle ❌  
3. **Minimal Configuration**: Single function, no dependencies, basic host.json ❌

## Testing Results
- **Local v4**: ✅ Works with Azure Functions Core Tools 4.0.7317
- **Local v3 (extensionBundle)**: ✅ Works with Azure Functions Core Tools
- **Local v3 (minimal)**: ✅ Works with Azure Functions Core Tools (`curl localhost:8080/api/hello` returns expected JSON)
- **Azure SWA v4**: ❌ "Failed to deploy the Azure Functions"
- **Azure SWA v3 (extensionBundle)**: ❌ "Failed to deploy the Azure Functions" 
- **Azure SWA v3 (minimal)**: ❌ "Failed to deploy the Azure Functions"
- **Azure SWA frontend-only**: ✅ Deployment succeeds without API location

## Current Minimal Configuration
```
/api/
├── hello/
│   ├── index.js (module.exports with basic JSON response)
│   └── function.json (classic httpTrigger, scriptFile: "index.js")
├── host.json (version 2.0 only)
└── package.json (name/version only, no dependencies)
```

## Deployment Pattern
All managed functions attempts show identical failure pattern:
1. ✅ Oryx successfully builds frontend (React/TypeScript)
2. ✅ Oryx successfully builds API (Node.js 18.20.8)
3. ✅ Artifacts zipped and uploaded successfully
4. ❌ Deployment fails after exactly ~15 seconds with "Failed to deploy the Azure Functions"

## Workflow Configuration
```yaml
api_location: api
skip_api_build: false
FUNCTIONS_WORKER_RUNTIME: node
```

## Frontend-Only Test
Testing deployment with:
```yaml
api_location: ""
skip_api_build: true
```

**Purpose**: Isolate whether the deployment failure is specific to managed functions or affects the entire Azure Static Web Apps pipeline.

## Escalation Recommendation
This appears to be a platform-level issue with Azure Static Web Apps managed functions. Consider:
1. **Azure Support Ticket**: Report persistent deployment failure with minimal v3 configuration
2. **GitHub Issue**: File issue at https://github.com/azure/static-web-apps/issues/
3. **Alternative Architecture**: Deploy APIs via standalone Azure Functions App

## Alternative Architecture: Standalone Azure Functions
If managed functions continue failing, deploy APIs separately:

### Implementation Steps
1. **Create standalone Azure Functions App**
   - Use same resource group as Static Web App
   - Configure Node.js 18 runtime
   - Enable Application Insights for monitoring

2. **Deploy existing API functions**
   - Use current `/api` directory structure
   - Deploy via Azure Functions Core Tools or GitHub Actions
   - Test all endpoints: `/api/hello`, `/api/login`, `/api/signup`, etc.

3. **Configure CORS and networking**
   - Add `https://brave-bay-0bfacc110.6.azurestaticapps.net` to CORS origins
   - Configure authentication/authorization policies
   - Set up environment variables (POSTGRES_URL, JWT_SECRET)

4. **Update frontend configuration**
   - Change API base URL from relative `/api` to standalone Functions URL
   - Update authentication flows if needed
   - Test end-to-end functionality

### Benefits
- Unblocks development while Microsoft investigates managed functions issue
- Provides more control over Functions runtime and configuration
- Enables independent scaling and monitoring of API layer
- Maintains same codebase and development workflow

## Production Endpoints
- Frontend: https://brave-bay-0bfacc110.6.azurestaticapps.net/ ✅ Accessible
- `/api/hello`: ❌ Not accessible due to managed functions deployment failure

## Conclusion
✅ **Frontend-only deployment succeeds**: Issue confirmed as specific to Azure Static Web Apps managed functions

## Immediate Actions Required
1. **Escalate to Azure Support** with complete documentation:
   - Reference this systematic testing approach (v4→v3→minimal→frontend-only)
   - Include deployment logs showing consistent 15-second timeout pattern
   - Emphasize business impact: blocking development team and product roadmap

2. **Implement standalone Azure Functions App** as interim solution:
   - Unblocks intern and product development work
   - Maintains same codebase and development workflow
   - Provides independent scaling and monitoring capabilities

3. **Continue development** with alternative architecture while Microsoft investigates

## Escalation Documentation
For Azure Support ticket, include:
- Complete systematic testing approach (v4→v3→minimal→frontend-only)
- Deployment logs showing consistent 15-second timeout pattern
- Minimal configuration that works locally but fails in Azure
- Business impact: blocking development team and product roadmap
