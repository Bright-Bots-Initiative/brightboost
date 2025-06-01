# Azure Function App 503 Error Diagnosis

## Current Status
- **Function App URL**: https://bb-dev-func.azurewebsites.net
- **Error**: HTTP 503 "Function host is not running"
- **CI Status**: Azure Functions deployment passing but functions not starting

## Root Cause Analysis

### 1. Function Host Not Starting
The 503 error indicates the Azure Function runtime is failing to start, likely due to:
- Missing required environment variables (POSTGRES_URL, JWT_SECRET)
- Dependency issues in package.json or node_modules
- Runtime configuration problems
- Database connectivity issues preventing startup

### 2. Required Environment Variables
The following must be configured in Azure Portal > bb-dev-func > Configuration:
```
POSTGRES_URL=postgres://username:password@hostname:5432/database
JWT_SECRET=your-secure-jwt-secret-key
NODE_ENV=production
```

### 3. Dependency Issues
Check if all required packages are properly installed:
- bcryptjs (for password hashing)
- jsonwebtoken (for JWT generation)
- @prisma/client (for database operations)

## Next Steps
1. Check Azure Portal logs for bb-dev-func Function App
2. Verify environment variables are configured
3. Check function.json configurations
4. Verify package.json dependencies
5. Test database connectivity from Azure

## Expected Fix
Once environment variables are properly configured and the Function App restarts, all endpoints should return proper JSON responses instead of 503 errors.
