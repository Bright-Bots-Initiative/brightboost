# Azure Functions Migration: v4 to v3 for Static Web Apps

## Issue
Azure Static Web Apps managed functions do not support Azure Functions v4 programming model (`app.http()` syntax with `@azure/functions` package).

## Root Cause
- v4 programming model uses code-centric configuration with `app.http()` registration
- Azure Static Web Apps managed runtime expects classic v3 structure with `function.json` files
- Missing extensionBundle configuration in host.json prevents runtime detection
- Deployment fails with "Failed to deploy the Azure Functions" after successful Oryx build

## Solution
Convert to v3 programming model with proper configuration:
- Structure: `/api/hello/index.js` + `/api/hello/function.json`
- Syntax: `module.exports = async function (context, req) { ... }`
- Configuration: HTTP trigger settings in `function.json`, not code
- Dependencies: Remove `@azure/functions` package
- Host configuration: Include extensionBundle in `host.json`

## Testing Results
- **Local v4**: ✅ Works with Azure Functions Core Tools 4.0.7317
- **Local v3**: ✅ Works with extensionBundle configuration
- **Azure SWA v4**: ❌ "Failed to deploy the Azure Functions"
- **Azure SWA v3**: ✅ [TO BE TESTED]

## Production Endpoints
- `/api/hello`: [TO BE TESTED]

## Key Configuration Files
- `host.json`: Must include extensionBundle for runtime detection
- `function.json`: HTTP trigger configuration per function
- `package.json`: Remove @azure/functions dependency for v3
