# Bright Boost – Back-End

## Overview
Azure Functions (Node 18) with JWT authentication, Prisma ORM, and Azure PostgreSQL Flexible Server. The backend provides API endpoints for both teacher and student user roles, supporting the educational platform's core functionality.

## Architecture
![Back-End Diagram](../docs/architecture/Back_End_Diagram.png)

The diagram above shows the target architecture for the BrightBoost backend, including the key components and their interactions.

## Quick Start
```bash
npm install              # installs packages
func start               # hot-reload dev server at http://localhost:7071
```

## Azure PostgreSQL Connection
The backend uses Azure PostgreSQL Flexible Server for data storage. Connection is configured via the `POSTGRES_URL` environment variable:

```
POSTGRES_URL=postgres://username:password@your-server.postgres.database.azure.com:5432/brightboost
```

## Database Migrations
Prisma is used for database schema management and migrations:

```bash
# Apply migrations to development database
npx prisma migrate dev

# Apply migrations to production database
bash ./scripts/migrate-azure.sh
```

## Deployment
1. Deploy Azure Functions:
```bash
az functionapp deployment source config-zip -g brightboost-rg -n brightboost-api --src ./api.zip
```

2. Configure environment variables in Azure Portal:
   - POSTGRES_URL
   - JWT_SECRET
   - NODE_ENV=production

## Database Models
The Prisma schema defines the following models:

- **User**: Teachers and students with authentication
  - Fields: id, name, email, password (hashed), role, createdAt, updatedAt
