# Deploying Azure Monitoring Resources with Bicep

This document outlines how to deploy Application Insights and Log Analytics for BrightBoost frontend monitoring using the Bicep template.

## Prerequisites

- Azure CLI installed and logged in
- Access to the `bb-dev-rg` resource group

## Deployment Steps

1. Navigate to the directory containing the `monitoring.bicep` file
2. Run the following Azure CLI command:

```bash
az deployment group create \
  --resource-group bb-dev-rg \
  --template-file monitoring.bicep \
  --parameters appInsightsName=bb-dev-insights logAnalyticsName=bb-dev-logs
```

3. After deployment completes, retrieve the Application Insights connection string:

```bash
az deployment group show \
  --resource-group bb-dev-rg \
  --name <deployment-name> \
  --query properties.outputs.appInsightsConnectionString.value
```

4. Use this connection string to configure your Azure Static Web Apps frontend.

## Connecting to Existing Resources

If you're integrating with existing BrightBoost applications:

1. Navigate to the Azure Portal
2. Add the connection string as an application setting:
   - For Azure Static Web Apps: Configuration > Application settings

Add the following key-value pair:
- Key: `APPLICATIONINSIGHTS_CONNECTION_STRING`
- Value: [Connection String from deployment output]

Note: This monitoring setup is for Azure Static Web Apps frontend only. Backend monitoring is handled through AWS CloudWatch for Lambda functions.
