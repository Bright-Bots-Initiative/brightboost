# Azure Static Web Apps Standardization

## Current Canonical Production SWA

**Production URL:** https://black-sand-053455d1e.6.azurestaticapps.net
**Workflow Token:** AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_BAY_0BFACC110
**Deployment Workflow:** `.github/workflows/azure-static-web-apps.yml`

This is the **single canonical production SWA** for BrightBoost. All production deployments, documentation, and integrations should reference this instance only.

## API Configuration

**Backend API:** bb-dev-func-api.azurewebsites.net
**Proxy Configuration:** `/api/*` routes are proxied to the Azure Function App via staticwebapp.config.json

## Deprecated Instances

### Gray Ocean (DEPRECATED)
- **URL:** gray-ocean-02030a010.6.azurestaticapps.net
- **Status:** DEPRECATED - Do not use for any purpose
- **Workflow:** Archived in `.github/workflows/archived/`

## Azure Portal Audit Instructions

To identify and disable stray SWA instances in your Azure subscription:

1. **Navigate to Azure Portal** → Static Web Apps
2. **Review all SWA instances** in your subscription
3. **Identify production instance:** Should be the one corresponding to black-sand-053455d1e.6.azurestaticapps.net
4. **Disable/Delete non-production instances:**
   - Any instances not actively used for production
   - Any instances corresponding to gray-ocean URLs
   - Any test/preview instances no longer needed

### Before Deleting SWA Instances:
- Verify the instance is not referenced in any active workflows
- Confirm it's not used by any external integrations
- Backup any custom domain configurations if needed

## Workflow Configuration

### Active Production Workflow
- **File:** `.github/workflows/azure-static-web-apps.yml`
- **Name:** BrightBoost – Production SWA (Canonical)
- **Triggers:** Push to main, Pull requests
- **Token:** AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_BAY_0BFACC110

### Archived Workflows
All other SWA workflows have been moved to `.github/workflows/archived/` and marked as deprecated:
- `azure-static-web-apps-gray-ocean-02030a010.yml`
- `azure-static-web-apps.yml`
- `azure-static-web-app-template.yml`

## Documentation Standards

All documentation should reference only the canonical production URL:
- README.md
- AZURE_DEPLOYMENT.md
- AZURE_STATIC_WEBAPP.md
- API documentation
- Smoke tests

## Future Deployment Guidelines

1. **Single Source of Truth:** Use only the canonical production SWA workflow
2. **No Multiple Deployments:** Avoid creating additional SWA instances unless absolutely necessary
3. **Custom Domains:** Configure custom domains on the canonical SWA instance rather than creating new instances
4. **Testing:** Use preview deployments on the canonical SWA for testing rather than separate instances

## Token Name Clarification

Note: The workflow token is named "BRAVE_BAY" but deploys to the "black-sand" URL. This is the current working configuration and should be preserved as-is. The token name does not need to match the SWA instance name.
