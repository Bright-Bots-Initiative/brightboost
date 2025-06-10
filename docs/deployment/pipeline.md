# BrightBoost Deployment Pipeline

This document outlines the CI/CD pipeline for the BrightBoost application.

## Overview

The BrightBoost CI/CD pipeline automates the build, test, and deployment processes for both the frontend and backend components of the application. It uses GitHub Actions to:

1. Build and test the application
2. Deploy the frontend to Azure Static Web Apps
3. Deploy the backend to AWS Lambda + API Gateway

## GitHub Actions Workflows

The project uses two separate deployment workflows:

1. **azure-static-web-apps.yml**: Deploys the React frontend to Azure Static Web Apps
2. **aws-lambda-deploy.yml**: Deploys the backend Lambda functions to AWS with API Gateway

## Environment Variables and Secrets

The following environment variables and secrets are required for the deployment pipeline:

### GitHub Secrets (to be added in GitHub repository settings)

#### Azure Static Web Apps
- `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_BAY_0BFACC110`: Deployment token for Azure SWA

#### AWS Lambda Deployment
- `AWS_ROLE_ARN`: IAM role ARN for OIDC authentication
- `DATABASE_SECRET_ARN`: AWS Secrets Manager ARN for Aurora credentials
- `VPC_ID`: VPC ID where Aurora cluster is deployed
- `SUBNET_IDS`: Comma-separated subnet IDs (same as Aurora)
- `SECURITY_GROUP_ID`: Security group allowing Aurora access

### Environment Variables

#### Frontend (Azure SWA)
- `VITE_AWS_API_URL`: AWS API Gateway endpoint URL

#### Backend (AWS Lambda)
- `DATABASE_SECRET_ARN`: AWS Secrets Manager ARN for Aurora credentials
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

## Monitoring Deployments

After a deployment, you can monitor the application using Azure Application Insights. For more information, refer to the [Azure Dashboard and Alerts](../azure/dashboard-alerts.md) document.
