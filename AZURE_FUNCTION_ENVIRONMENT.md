# Azure Function App Environment Configuration

This document outlines the required environment variables for the Azure Function App (bb-dev-func) to operate correctly.

## Required Environment Variables

The following environment variables must be configured in the Azure Portal under **Function App > Settings > Configuration > Application settings**:

### Database Configuration
- **POSTGRES_URL**: PostgreSQL connection string
  - Format: `postgres://username:password@hostname:5432/database`
  - Example: `postgres://admin:password@brightboost-pg.postgres.database.azure.com:5432/brightboost`

### Authentication Configuration  
- **JWT_SECRET**: Secret key for JWT token generation
  - Should be a strong, randomly generated string (minimum 32 characters)
  - Example: `your-super-secure-jwt-secret-key-here`

### Runtime Configuration
- **NODE_ENV**: Environment mode
  - Set to `production` for production deployment
  - Set to `development` for development/testing

## Configuration Steps

1. Navigate to Azure Portal
2. Go to Function App > bb-dev-func
3. Select Settings > Configuration
4. Click "New application setting" for each required variable
5. Save and restart the Function App

## Troubleshooting

If the signup function returns 500 errors, check:
1. All required environment variables are set
2. POSTGRES_URL is accessible from Azure Functions
3. Database server allows connections from Azure
4. JWT_SECRET is properly configured

## Testing Environment Variables

Use the `/api/envtest` endpoint to verify environment configuration (development only).
