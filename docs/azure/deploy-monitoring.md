# Deploying Azure Monitoring Resources with Bicep

This document outlines how to deploy Application Insights and Log Analytics for BrightGrants using the Bicep template.

## Prerequisites

- Azure CLI installed and logged in
- Access to the `Bright-Grants` resource group

## Deployment Steps

1. Navigate to the directory containing the `monitoring.bicep` file
2. Run the following Azure CLI command:

```bash
# Login with your Azure credentials
az login

# Or use service principal (credentials should be stored securely, not in this file)
# az login --service-principal -u <CLIENT_ID> -p <CLIENT_SECRET> --tenant <TENANT_ID>

az deployment group create \
  --resource-group Bright-Grants \
  --template-file monitoring.bicep \
  --parameters appInsightsName=bg-dev-insights logAnalyticsName=bg-dev-logs
```

3. After deployment completes, retrieve the Application Insights connection string:

```bash
az deployment group show \
  --resource-group Bright-Grants \
  --name <deployment-name> \
  --query properties.outputs.appInsightsConnectionString.value
```

4. Use this connection string to configure your frontend and backend applications.

## Connecting to Existing Resources

If you're integrating with existing BrightGrants applications:

1. Navigate to the Azure Portal
2. Add the connection string as an application setting:
   - For App Service: Configuration > Application settings
   - For Function App: Configuration > Application settings

Add the following key-value pair:
- Key: `APPLICATIONINSIGHTS_CONNECTION_STRING`
- Value: [Connection String from deployment output]
