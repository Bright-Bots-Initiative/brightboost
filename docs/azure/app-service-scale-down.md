# Scaling Down the Old Azure App Service

The old Azure App Service (bb-dev-web) should be scaled down to B1 or lower tier to reduce costs now that the application has been migrated to Azure Static Web Apps.

## Steps to Scale Down:

1. Log in to the [Azure Portal](https://portal.azure.com)
2. Navigate to App Service "bb-dev-web"
3. In the left sidebar, select "Scale up (App Service plan)"
4. Select the "Basic" tier
5. Choose "B1" (1 core, 1.75 GB RAM) or lower
6. Click "Apply"

## Verification:

After scaling down, verify that:

1. The new Static Web App (https://black-sand-053455d1e.6.azurestaticapps.net) is functioning correctly
2. API calls from the Static Web App to the Function App are working properly
3. The old App Service plan billing reflects the reduced tier

## Future Considerations:

Consider completely decommissioning the old App Service once the Static Web App deployment has been stable for a sufficient period (recommended: 2-4 weeks of monitoring).
