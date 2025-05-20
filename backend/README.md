# Bright Boost – Back-End

## Overview
Azure Functions (Node 18), Prisma ORM, and Azure PostgreSQL Flexible Server.

## Quick Start
```powershell
npm install              # installs packages (skip Cypress with --ignore-scripts)
func start               # hot-reload dev server at http://localhost:7071
```

## Deployment
```powershell
az deployment group create --template-file infra/main.bicep …
```

## Database Models
_Pending Prisma export (to be added in Sprint-0)._
