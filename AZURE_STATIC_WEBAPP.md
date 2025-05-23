# Azure Static Web App Deployment

This document describes the deployment of the BrightBoost frontend to Azure Static Web Apps.

## Configuration

The BrightBoost frontend is deployed to Azure Static Web Apps with the following configuration:

- **Region**: Central US
- **SKU**: Free
- **Build Output Location**: dist
- **API Location**: https://bb-dev-func.azurewebsites.net

## Environment Variables

The following environment variables are required for the Azure Static Web App:

- `VITE_API_BASE`: The base URL for the API (https://bb-dev-func.azurewebsites.net)

## Routing Configuration

The routing configuration is defined in `staticwebapp.config.json` and includes:

- API routes (`/api/*`) are redirected to the Function App API endpoint
- SPA routing (all routes fallback to index.html)
- Cache-Control headers for static assets
- Brotli compression for static assets

## GitHub Actions Workflow

The Azure Static Web App deployment is managed by a GitHub Actions workflow that is automatically generated when the Static Web App is created. This workflow:

1. Builds the frontend application
2. Deploys the built application to Azure Static Web Apps
3. Configures the environment variables

## Local Development

For local development, the API URL is set to `http://localhost:3000` if the `VITE_API_BASE` environment variable is not defined.

## Performance

The Azure Static Web App is configured to load in less than 2 seconds from a cold start, with the following optimizations:

- Cache-Control headers for static assets
- Brotli compression for static assets
- SPA routing optimization
