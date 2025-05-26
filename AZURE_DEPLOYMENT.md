# Azure Deployment Configuration

## Hosting Service
Azure App Service – Linux Web App for Containers

The React front-end is built into a Docker image and pushed to GitHub Packages. Azure App Service pulls and runs that container. The API lives in a separate Azure Functions app (also Linux).

## App Service Configuration Parameters
These settings should be configured in the Azure portal or through the Azure CLI:

| Key | Example Value | Purpose |
|-----|--------------|---------|
| FUNCTION_APP_BASE_URL | https://brightboost-api.azurewebsites.net/api | Front-end hits Functions here |
| FUNCTION_APP_KEY | <functions default host key> | Sent as x-functions-key header |
| POSTGRES_URL | postgres://admin:pw@brightboost-pg.postgres.database.azure.com:5432/brightboost | Required for database connection |
| NODE_ENV | production | Bundler hint |
| WEBSITE_NODE_DEFAULT_VERSION | 18 (or 20) | Ensure correct Node runtime |
| APPLICATIONINSIGHTS_CONNECTION_STRING | InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://... | Connects application to Application Insights |

## Database Setup

### Initial Database Migration

For new deployments, run the following commands to set up the database schema:

```bash
# Run database migrations
npx prisma migrate deploy

# Seed the database with initial data (optional)
npx prisma db seed
```

### Environment Variables for Database

Ensure the following environment variables are configured in Azure App Service:

| Variable | Example Value | Purpose |
|----------|---------------|---------|
| POSTGRES_URL | postgres://admin:password@bb-prod-pg.postgres.database.azure.com:5432/brightboost | Production database connection |
| JWT_SECRET | your-secure-jwt-secret | JWT token signing |
| NODE_ENV | production | Application environment |

### Database Credentials Management

- Store database credentials in Azure Key Vault
- Reference secrets in App Service Configuration using Key Vault references
- Use managed identity for secure access to Key Vault

## Monitoring Configuration
BrightBoost uses Azure Application Insights and Log Analytics for monitoring and logging. For detailed instructions on setting up monitoring, see [Azure Monitoring Configuration](./docs/azure/monitoring.md).

## Automated Deployment Script

For streamlined deployment, use the following commands:

```bash
# Production deployment with database setup
./prisma/migrate-prod.sh

# Or manual steps:
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

## Frontend URL
Current URL: https://black-sand-053455d1e.6.azurestaticapps.net
Future URL (when DNS is updated): https://app.brightboost.org
