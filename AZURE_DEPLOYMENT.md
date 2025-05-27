# Azure Deployment Configuration

## Hosting Service
Azure Static Web Apps

BrightBoost uses Azure Static Web Apps for both the React frontend and API functions. This provides a simplified, cost-effective architecture with automatic CI/CD through GitHub Actions.

## Static Web Apps Configuration Parameters
These settings should be configured in the Azure portal or through the Azure CLI:

| Key | Example Value | Purpose |
|-----|--------------|---------|
| DATABASE_URL | postgres://admin:pw@brightboost-pg.postgres.database.azure.com:5432/brightboost | Required for database connection |
| JWT_SECRET | your-secure-jwt-secret | JWT token signing |
| NODE_ENV | production | Environment configuration |
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

## Deployment Process

BrightBoost is automatically deployed through GitHub Actions when changes are pushed to the main branch. The workflow is defined in `.github/workflows/azure-static-web-apps-black-sand-053455d1e.yml`.

For database migrations, use the following commands:

```bash
# Production database migration
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

Azure Static Web Apps handles the build and deployment of both the frontend and API functions automatically.

## Frontend URL
Current URL: https://black-sand-053455d1e.6.azurestaticapps.net
Future URL (when DNS is updated): https://app.brightboost.org
