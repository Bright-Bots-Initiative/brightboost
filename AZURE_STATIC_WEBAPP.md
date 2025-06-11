# Azure Static Web App Deployment

This document describes the deployment of the BrightBoost frontend to Azure Static Web Apps.

## Configuration

The BrightBoost frontend is deployed to Azure Static Web Apps with the following configuration:

- **Region**: Central US
- **SKU**: Free
- **Build Output Location**: dist
- **API Location**: AWS Lambda (https://your-api-gateway-url.execute-api.region.amazonaws.com/stage)
- **URL**: https://black-sand-053455d1e.6.azurestaticapps.net (Canonical Production)

## Environment Variables

The following environment variables are required for the Azure Static Web App and should be configured in the Azure Portal under **Settings > Configuration > Application settings**:

- `VITE_AWS_API_URL`: The base URL for the AWS Lambda API (https://your-api-gateway-url.execute-api.region.amazonaws.com/stage)

## Routing Configuration

The routing configuration is defined in `staticwebapp.config.json` and includes:

- API routes (`/api/*`) are handled by AWS Lambda backend
- SPA routing (all routes fallback to index.html)
- Cache-Control headers for static assets
- Brotli compression for static assets

## GitHub Actions Workflow

The Azure Static Web App deployment is managed by a GitHub Actions workflow that is automatically generated when the Static Web App is created. This workflow:

1. Builds the frontend application
2. Deploys the built application to Azure Static Web Apps

## Local Development

For local development, the API URL is set to the AWS Lambda endpoint if the `VITE_AWS_API_URL` environment variable is not defined.

## Performance

The Azure Static Web App is configured to load in less than 2 seconds from a cold start, with the following optimizations:

- Cache-Control headers for static assets
- Brotli compression for static assets
- SPA routing optimization
