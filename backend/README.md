# Bright Boost – Back-End

## Overview
Express.js API server with JWT authentication and PostgreSQL database using Prisma ORM. The backend provides API endpoints for both teacher and student user roles, supporting the educational platform's core functionality.

## Architecture
![Back-End Diagram](../docs/architecture/Back_End_Diagram.png)

The diagram above shows the target architecture for the BrightBoost backend, including the key components and their interactions.

## Quick Start
```bash
# Install dependencies
npm install

# Start development server with hot-reload
npm run dev:server

# Start both frontend and backend concurrently
npm run dev:full

# Start production server
npm run start
```

## Environment Variables
| Variable | Description | Default Value |
|----------|-------------|---------------|
| JWT_SECRET | Secret key for JWT token signing | 'your-secret-key' |
| PORT | Server port number | 3000 |
| NODE_ENV | Environment mode (development/production) | development |
| POSTGRES_URL | PostgreSQL connection string | 'postgresql://postgres:password@localhost:5432/brightboost' |

## Directory Structure
```
brightboost/
├── server.cjs            # Main Express server file
├── middleware/
│   └── auth.js           # JWT authentication middleware
├── package.json          # Project configuration and scripts
├── .env                  # Environment variables (local development)
└── backend/
    └── README.md         # This documentation file
```

## Scripts
| Script | Description |
|--------|-------------|
| server | Runs the server using node |
| start | Builds the frontend and starts the server in production mode |
| dev:server | Runs the server with nodemon for hot-reloading |
| dev:full | Concurrently runs both frontend and backend development servers |

## API Reference
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | /auth/signup | Register a new user (teacher or student) | No |
| POST | /auth/login | Authenticate a user and receive JWT token | No |
| GET | /api/teacher/dashboard | Get teacher dashboard data (classes, students) | Yes (teacher) |
| GET | /api/student/dashboard | Get student dashboard data (courses, assignments) | Yes (student) |
| GET | /api/profile | Get user profile information | Yes |
| GET | /api/gamification/profile | Get user gamification data (XP, level, streak, badges) | Yes |
| POST | /api/gamification/award-xp | Award XP to the authenticated user | Yes |
| POST | /api/gamification/award-badge | Award a badge to the authenticated user | Yes |
| POST | /api/gamification/update-streak | Update user's streak count | Yes |

### Authentication
The API uses JWT-based authentication. After login, include the token in requests:
```
Authorization: Bearer <your_jwt_token>
```

## Gamification System

The backend includes a gamification system with the following features:

### User Gamification Fields

- **XP**: Experience points earned through activities (default: 0)
- **Level**: User's progress level based on XP thresholds (default: 'Explorer')
- **Streak**: Consecutive days of activity (default: 0)
- **Badges**: Array of badges earned by the user (default: [])

### Level Progression

Level progression is based on XP thresholds:
- 0-49 XP: Explorer
- 50-199 XP: Beginner
- 200-499 XP: Advanced
- 500-999 XP: Expert
- 1000+ XP: Master

### API Endpoints

#### GET /api/gamification/profile

Returns the user's gamification profile.

Response:
```json
{
  "id": "123",
  "name": "User Name",
  "xp": 120,
  "level": "Beginner",
  "streak": 5,
  "badges": [
    {
      "id": "badge1",
      "name": "First Lesson Completed",
      "awardedAt": "2023-05-01T12:00:00Z"
    }
  ]
}
```

#### POST /api/gamification/award-xp

Awards XP to the authenticated user.

Request:
```json
{
  "amount": 25,
  "reason": "Completed lesson"
}
```

Response:
```json
{
  "success": true,
  "xp": 145,
  "xpGained": 25,
  "level": "Beginner",
  "leveledUp": false,
  "reason": "Completed lesson"
}
```

#### POST /api/gamification/award-badge

Awards a badge to the authenticated user.

Request:
```json
{
  "badgeId": "badge2",
  "badgeName": "Perfect Score"
}
```

Response:
```json
{
  "success": true,
  "message": "Badge awarded successfully",
  "badge": {
    "id": "badge2",
    "name": "Perfect Score",
    "awardedAt": "2023-05-02T15:30:00Z"
  },
  "badges": [
    {
      "id": "badge1",
      "name": "First Lesson Completed",
      "awardedAt": "2023-05-01T12:00:00Z"
    },
    {
      "id": "badge2",
      "name": "Perfect Score",
      "awardedAt": "2023-05-02T15:30:00Z"
    }
  ]
}
```

#### POST /api/gamification/update-streak

Updates the user's streak count.

Response:
```json
{
  "success": true,
  "streak": 6,
  "streakXp": 5,
  "milestone": false,
  "xp": 150
}
```

The backend is designed to be deployed on Azure.

## Database Configuration

The backend uses PostgreSQL with Prisma ORM for data storage and retrieval. The database connection is configured through environment variables.

### Connection Configuration

The database connection is established using the `POSTGRES_URL` environment variable, which should be set in the following format:

```
postgres://username:password@hostname:port/database
```

Example for Azure PostgreSQL:
```
postgres://admin:pw@bb-dev-pg.postgres.database.azure.com:5432/brightboost
```

### Environment-Specific Configuration

| Environment | Configuration Method | Secret Storage |
|-------------|---------------------|---------------|
| Local Development | `.env` file | Local file (not committed) |
| CI/CD Pipeline | GitHub Secrets | GitHub repository secrets |
| Azure Development | App Service Configuration | Azure Key Vault |
| Azure Production | App Service Configuration | Azure Key Vault |

### Accessing Secrets in Azure

To access database credentials stored in Azure Key Vault:

1. Log in to the Azure Portal
2. Navigate to the BrightBoost Key Vault
3. Under "Secrets", you can view and manage database credentials
4. App Service uses managed identity to access these secrets

### Required Secrets

The following secrets must be configured for each environment:

- `POSTGRES-ADMIN-USERNAME`: Database admin username
- `POSTGRES-ADMIN-PASSWORD`: Database admin password
- `POSTGRES-URL`: Full connection string

### Prisma Commands

```bash
# Generate Prisma client
npx prisma generate

# Run migrations in development
npx prisma migrate dev

# Run migrations in production
npx prisma migrate deploy
```

## Deployment
For production deployment to Azure, refer to the [AZURE_DEPLOYMENT.md](../AZURE_DEPLOYMENT.md) file. The deployment configuration includes setting up an Azure App Service with appropriate environment variables for the production environment.

## How README Stays Up to Date
This README is auto-regenerated by Devin 2.0 with every backend code, API, env, or script change. This ensures documentation always reflects the current state of the codebase.
