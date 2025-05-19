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
| POSTGRES_URL | postgres://admin:pw@brightboost-pg.postgres.database.azure.com:5432/brightboost | For future API calls |
| NODE_ENV | production | Bundler hint |
| WEBSITE_NODE_DEFAULT_VERSION | 18 (or 20) | Ensure correct Node runtime |

## Frontend URL
Current URL: https://brightboost-web.azurewebsites.net
Future URL (when DNS is updated): https://app.brightboost.org
