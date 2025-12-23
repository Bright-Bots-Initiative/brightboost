# BrightBoost Deployment Guide

## Overview

BrightBoost uses a hybrid cloud deployment strategy:

- **Frontend**: Azure Static Web Apps
- **Backend**: AWS Lambda with Aurora PostgreSQL (migrating to Railway?)

_Note: The project seems to be transitioning to Railway/Supabase. The documentation below might be partially outdated regarding AWS._

## Active Deployment Workflows

### 1. AWS Lambda Backend (`aws-lambda-deploy.yml`)

- **Purpose**: Deploy backend API functions to AWS Lambda
- **Triggers**: Push to `main` branch, pull requests, manual dispatch
- **Infrastructure**: AWS Lambda, API Gateway, Aurora PostgreSQL
- **Endpoint**: `https://t6gymccrfg.execute-api.us-east-1.amazonaws.com/prod`

### 2. Azure Static Web Apps (`azure-static-web-apps.yml`)

- **Purpose**: Deploy React frontend to Azure Static Web Apps
- **Triggers**: Push to `main` branch, pull requests
- **URL**: `https://brave-bay-0bfacc110-production.centralus.6.azurestaticapps.net`

## Deprecated Workflows

The following workflows have been **REMOVED** as part of post-production cleanup:

### ❌ Removed Legacy Workflows

- `ci-cd.yml.backup` - Legacy CI/CD pipeline backup
- `archived/azure-static-web-apps-gray-ocean-02030a010.yml` - Deprecated Azure SWA workflow
- `archived/azure-static-web-apps.yml` - Deprecated Azure SWA workflow
- `archived/azure-static-web-app-template.yml` - Deprecated Azure SWA template

All legacy workflows have been cleaned up after successful production deployment.

## Environment Configuration

### Railway / Backend Prisma Schema

**Important:** The backend deployment on Railway uses a local copy of the Prisma schema located at `backend/prisma/schema.prisma`.
This is because the Railway build context is set to `backend/`, making the root `prisma/schema.prisma` inaccessible during the build.
The root schema (`prisma/schema.prisma`) remains the canonical source for development.

### Frontend Environment Variables

```env
VITE_AWS_API_URL=https://t6gymccrfg.execute-api.us-east-1.amazonaws.com/prod
```

### AWS Lambda Environment Variables

- Stored in AWS Secrets Manager
- Configured via GitHub repository secrets:
  - `AWS_ROLE_ARN`
  - `DATABASE_SECRET_ARN`
  - `VPC_ID`
  - `SUBNET_IDS`
  - `SECURITY_GROUP_ID`

## Deployment Process

### Backend Deployment

1. Code pushed to `main` branch
2. GitHub Actions triggers `aws-lambda-deploy.yml`
3. TypeScript compiled and Lambda functions built
4. SAM deploys infrastructure to AWS
5. API Gateway endpoint updated

### Frontend Deployment

1. Code pushed to `main` branch
2. GitHub Actions triggers `azure-static-web-apps.yml`
3. React application built with Vite
4. Static files deployed to Azure Static Web Apps
5. CDN cache updated globally

## Testing Deployments

### Backend API Test

```bash
curl -X POST https://t6gymccrfg.execute-api.us-east-1.amazonaws.com/prod/api/signup/teacher \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Teacher","email":"test@example.com","password":"testpassword123"}'
```

### Frontend Test

Visit: https://brave-bay-0bfacc110-production.centralus.6.azurestaticapps.net

## Monitoring

- **AWS CloudWatch**: Lambda function logs and metrics
- **Azure Monitor**: Static Web App performance and availability
- **GitHub Actions**: Deployment status and history

## Rollback Procedures

### Backend Rollback

1. Identify previous working deployment in AWS CloudFormation
2. Use SAM CLI to deploy previous version
3. Update API Gateway if needed

### Frontend Rollback

1. Use Azure Portal to rollback to previous deployment
2. Or redeploy from previous Git commit

## Security Notes

- All legacy backend secrets and configuration files have been removed from repository
- AWS credentials use OIDC for secure authentication
- Database credentials stored in AWS Secrets Manager
- No hardcoded secrets in codebase
