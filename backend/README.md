# Bright Boost – Back-End

## Overview
Express.js API server with JWT authentication and a file-based database using lowdb (`db.json`) for development and demo purposes. The backend provides API endpoints for both teacher and student user roles, supporting the educational platform's core functionality.

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

## Extending the Backend
The backend currently uses a file-based database (`lowdb` with `db.json`). For a more scalable or production-ready solution, consider replacing or augmenting this with a dedicated database service:

1. **Choose a Database Service:** Options include cloud-based NoSQL databases (like Azure Cosmos DB, MongoDB Atlas) or SQL databases (like Azure Database for PostgreSQL/MySQL).
2. **Implement Database Connection:** Add the necessary client libraries and connection logic to `server.cjs`.
3. **Data Modeling:** If moving to a structured database, define appropriate schemas or models. For NoSQL, you might adapt the existing JSON structure.
4. **Update Route Handlers:** Modify the API route handlers in `server.cjs` to interact with the chosen database service instead of `lowdb`.
5. **Environment Variables:** Add new environment variables for database connection strings, API keys, etc.

## Deployment
For production deployment to Azure, refer to the [AZURE_DEPLOYMENT.md](../AZURE_DEPLOYMENT.md) file. The deployment configuration includes setting up an Azure App Service with appropriate environment variables for the production environment.

## How README Stays Up to Date
This README is auto-regenerated by Devin 2.0 with every backend code, API, env, or script change. This ensures documentation always reflects the current state of the codebase.
