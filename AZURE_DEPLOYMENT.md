# Azure Deployment Configuration

## Hosting Service
Azure App Service – Linux Web App for Containers

The React front-end is deployed using Azure Static Web Apps. The API backend has been migrated to AWS Lambda with API Gateway.

## App Service Configuration Parameters
These settings should be configured in the Azure portal or through the Azure CLI:

| Key | Example Value | Purpose |
|-----|--------------|---------|
| VITE_AWS_API_URL | https://your-api-gateway-url.execute-api.region.amazonaws.com/stage | Frontend connects to AWS Lambda backend |
| POSTGRES_URL | postgres://admin:pw@brightboost-pg.postgres.database.azure.com:5432/brightboost | For future API calls |
| NODE_ENV | production | Bundler hint |
| WEBSITE_NODE_DEFAULT_VERSION | 18 (or 20) | Ensure correct Node runtime |
| APPLICATIONINSIGHTS_CONNECTION_STRING | InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://... | Connects application to Application Insights |

## Monitoring Configuration
BrightBoost uses Azure Application Insights and Log Analytics for monitoring and logging. For detailed instructions on setting up monitoring, see [Azure Monitoring Configuration](./docs/azure/monitoring.md).

## Frontend URL
Production URL: https://black-sand-053455d1e.6.azurestaticapps.net
Future URL (when DNS is updated): https://app.brightboost.org

Note: The gray-ocean-02030a010.6.azurestaticapps.net URL is DEPRECATED and should not be used. Use only the canonical production URL above.
