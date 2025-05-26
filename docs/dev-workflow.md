# Dev Workflow

This document outlines the development workflow for the BrightBoost project, including setup, testing, deployment, and monitoring.

## Local Development

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/Bright-Bots-Initiative/brightboost.git
   cd brightboost
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. Generate Prisma client
   ```bash
   npx prisma generate
   ```

5. Start the development server
   ```bash
   npm run dev
   ```

## Testing

Run tests with:
```bash
npm test
```

## Deployment

See [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md) for detailed deployment instructions.

## Database Configuration

BrightBoost uses Azure PostgreSQL for data storage across all environments. This section provides information on configuring database connections for different environments.

### Environment-Specific Database URLs

| Environment | Database URL Format | Configuration Location |
|-------------|---------------------|------------------------|
| Local | `postgresql://postgres:password@localhost:5432/brightboost` | `.env` file |
| Development | `postgres://admin:pw@bb-dev-pg.postgres.database.azure.com:5432/brightboost` | Azure App Service Configuration |
| Staging | `postgres://admin:pw@bb-stage-pg.postgres.database.azure.com:5432/brightboost` | Azure App Service Configuration |
| Production | `postgres://admin:pw@bb-prod-pg.postgres.database.azure.com:5432/brightboost` | Azure App Service Configuration |

### Setting Up Local Database

1. Install PostgreSQL locally or use Docker:
   ```bash
   docker run --name brightboost-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
   ```

2. Create a database:
   ```bash
   docker exec -it brightboost-postgres psql -U postgres -c "CREATE DATABASE brightboost;"
   ```

3. Run migrations:
   ```bash
   npx prisma migrate dev
   ```

### Secrets Management

Database credentials and other sensitive information are managed securely:

1. **Local Development**: Stored in `.env` file (not committed to repository)
2. **CI/CD Pipeline**: Stored in GitHub Secrets
3. **Azure Environments**: Stored in Azure Key Vault and referenced in App Service Configuration

## Monitoring

BrightBoost uses Azure Application Insights and Log Analytics for monitoring and logging. This section provides information on accessing and using the monitoring tools.

### Accessing the Monitoring Dashboard

1. Log in to the [Azure Portal](https://portal.azure.com)
2. Navigate to the BrightBoost Monitoring Dashboard using this read-only link:
   [BrightBoost Monitoring Dashboard](https://portal.azure.com/#@brightbotsint.com/dashboard/arm/subscriptions/f9a55b60-d978-4b8b-819e-cb0246dc92bb/resourcegroups/bb-dev-rg/providers/microsoft.portal/dashboards/brightboost-monitoring-dashboard)

   > Note: The actual URL will be updated once the dashboard is published.

3. The dashboard includes the following key metrics:
   - Server Requests
   - Failed Requests
   - Server Response Time
   - Server Exceptions
   - Database Connection Status
   - Database Query Performance

### Alert Notifications

BrightBoost has configured alerts for critical application issues:

1. **Server Exceptions Alert**
   - Trigger: More than 5 server exceptions in a 15-minute period
   - Notification: Email/Slack (configured through the BrightBoost-AlertGroup)

2. To view and manage alerts:
   - Navigate to the Application Insights resource in Azure Portal
   - Select "Alerts" from the left menu
   - View active alerts and their status

### Adding New Team Members to Monitoring

To add new team members to receive alert notifications:

1. Navigate to the Azure Portal
2. Go to Monitor > Alerts > Action Groups
3. Select "BrightBoost-AlertGroup"
4. Click "Edit"
5. Add new email addresses or Slack webhook URLs as needed

For more detailed information on monitoring setup and configuration, see [Azure Dashboard and Alerts](./azure/dashboard-alerts.md).
