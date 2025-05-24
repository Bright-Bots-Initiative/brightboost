# BrightBoost API - Azure Functions

This folder contains the Azure Functions implementation of the BrightBoost API.

## Structure

- `/auth` - Authentication endpoints (login, signup)
- `/profile` - User profile endpoint
- `/health` - Health check endpoint
- `/shared` - Shared utilities and middleware

## Local Development

1. Install dependencies:
```
npm install
```

2. Run locally:
```
npm start
```

## Deployment

The API is automatically deployed with the Azure Static Web App through GitHub Actions. The `staticwebapp.config.json` file in the root directory configures the API routing.

## Environment Variables

The following environment variables should be configured in the Azure portal:

- `JWT_SECRET` - Secret key for JWT token generation and verification
- `JWT_EXPIRATION` - Token expiration time (e.g., "24h")
