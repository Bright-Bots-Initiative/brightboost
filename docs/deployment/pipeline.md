# BrightBoost Deployment Pipeline

This document outlines the CI/CD pipeline for the BrightBoost application.

## Overview

The BrightBoost CI/CD pipeline automates the build, test, and deployment processes for both the frontend and backend components of the application. It uses GitHub Actions to:

1. Build and test the application
2. Create and push Docker images to GitHub Container Registry
3. Deploy the application to Azure App Service and Azure Functions

## GitHub Actions Workflow

The GitHub Actions workflow is defined in `.github/workflows/ci-cd.yml` and consists of three main jobs:

1. **build-and-test**: Builds and tests the application
   - Runs on: Pull requests to main, pushes to main, and manual workflow dispatch
   - Includes: Dependency installation, linting, testing, and building the application

2. **build-docker-image**: Creates a Docker image and pushes it to GitHub Container Registry
   - Runs on: Only pushes to main branch and manual workflow dispatch
   - Includes: Building and pushing Docker images with lowercase repository names

3. **deploy-to-azure**: Deploys the application to Azure App Service and Azure Functions
   - Runs on: Only pushes to main branch and manual workflow dispatch
   - Includes: Deploying to Azure App Service and Azure Functions

## Environment Variables and Secrets

The following environment variables and secrets are required for the deployment pipeline:

### Secrets (to be added in GitHub repository settings)

- `AZURE_CREDENTIALS`: JSON object containing Azure service principal credentials
- `AZURE_FUNCTION_PUBLISH_PROFILE`: Publish profile for the Azure Function App

### Environment Variables (set in Azure App Service)

- `FUNCTION_APP_BASE_URL`: URL of the Azure Function App
- `FUNCTION_APP_KEY`: Function App key for authentication
- `POSTGRES_URL`: PostgreSQL connection string
- `NODE_ENV`: Set to 'production'
- `WEBSITE_NODE_DEFAULT_VERSION`: Node.js version (18 or 20)
- `APPLICATIONINSIGHTS_CONNECTION_STRING`: Application Insights connection string
- `JWT_SECRET`: Secret key for JWT token signing

## Deployment Process

### Automatic Deployments

The pipeline automatically deploys the application when:

1. Changes are pushed to the main branch
2. The workflow is manually triggered

### Manual Deployments

To manually trigger the deployment pipeline:

1. Go to the Actions tab in the GitHub repository
2. Select the "BrightBoost CI/CD Pipeline" workflow
3. Click "Run workflow"
4. Select the branch to deploy and click "Run workflow"

## Adding Secrets to GitHub

To add the required secrets to the GitHub repository:

1. Go to the repository settings
2. Select "Secrets and variables" > "Actions"
3. Click "New repository secret"
4. Add the required secrets as described above

## Setting Up Azure Resources

Refer to the [Azure Deployment Configuration](../AZURE_DEPLOYMENT.md) document for instructions on setting up the required Azure resources.

## Creating an Azure Service Principal

To create an Azure service principal for GitHub Actions:

```bash
az ad sp create-for-rbac --name "BrightBoostGitHubActions" --role contributor \
                          --scopes /subscriptions/{subscription-id}/resourceGroups/bb-dev-rg \
                          --sdk-auth
```

The output of this command should be saved as the `AZURE_CREDENTIALS` secret in GitHub.

## Getting the Azure Function Publish Profile

To get the publish profile for the Azure Function App:

1. Go to the Azure Portal
2. Navigate to your Function App
3. Click on "Get publish profile"
4. Save the downloaded file content as the `AZURE_FUNCTION_PUBLISH_PROFILE` secret in GitHub

## CI/CD Best Practices

The BrightBoost CI/CD pipeline follows these best practices:

1. **Separation of Concerns**:
   - Build and test jobs run on all PRs and pushes to ensure code quality
   - Docker build and deployment jobs only run on main branch pushes or manual triggers

2. **Docker Image Naming**:
   - All Docker image references use lowercase repository names to avoid GitHub Container Registry errors
   - Example: `ghcr.io/${{ github.repository | lowercase }}/brightboost-web:latest`

3. **Artifact Handling**:
   - Build artifacts are uploaded and downloaded between jobs to ensure consistency
   - This prevents rebuilding the application in subsequent jobs

4. **Security**:
   - Secrets are stored in GitHub repository settings and never exposed in logs
   - Service principal follows least privilege principle with contributor role scoped to the resource group

5. **Caching**:
   - Node modules are cached to speed up builds
   - Docker layer caching is used to optimize image builds

## Monitoring Deployments

After a deployment, you can monitor the application using Azure Application Insights. For more information, refer to the [Azure Dashboard and Alerts](../azure/dashboard-alerts.md) document.
