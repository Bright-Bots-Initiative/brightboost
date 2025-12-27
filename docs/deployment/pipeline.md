# BrightBoost Deployment Pipeline

This document outlines the CI/CD pipeline for the BrightBoost application.

## Overview

The BrightBoost CI/CD pipeline automates the build, test, and deployment processes for both the frontend and backend components of the application.

## GitHub Actions Workflows

The project uses workflows for testing and verification:

1. **ci-cd.yml**: Runs linting and testing for both frontend and backend.
2. **prod-smoke.yml**: Runs smoke tests against the production environment.
3. **bundle-size-check.yml**: Checks bundle size.
4. **teacher-dashboard-ci.yml**: Specific CI for teacher dashboard components.

## Environment Variables and Secrets

The following environment variables and secrets are required for the deployment pipeline:

### GitHub Secrets (to be added in GitHub repository settings)

- `DATABASE_URL`: Connection string for the database (Supabase/PostgreSQL)
- `SESSION_SECRET`: Secret key for session management

### Environment Variables

- `VITE_API_BASE`: Base URL for the backend API

## Deployment Process

### Automatic Deployments

Deployment is managed via Replit and Supabase.

### Manual Deployments

To manually trigger deployments, refer to the Replit dashboard.

## Monitoring Deployments

After a deployment, you can monitor the application status via the Replit dashboard.
