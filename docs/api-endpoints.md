# API Endpoints Documentation

## Dashboard Endpoints

### GET /api/teacher_dashboard

**Description:** Teacher dashboard endpoint that validates environment variables and returns an array of teachers from the database.

**Environment Variables Required:**
- `POSTGRES_URL` - Database connection string
- `JWT_SECRET` - JWT token signing secret

**Response:**
- **200 OK**: Array of teacher objects with `id`, `name`, `email`, `createdAt`, `updatedAt`
- **500 Internal Server Error**: `{ "success": false, "error": "..." }`

**Example Response:**
```json
[
  {
    "id": "clx1234567890",
    "name": "John Doe",
    "email": "john.doe@school.edu",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

**Usage:**
```bash
curl -X GET https://black-sand-053455d1e.6.azurestaticapps.net/api/teacher_dashboard
```

### GET /api/student_dashboard

**Description:** Student dashboard endpoint that validates environment variables and returns an array of students from the database.

**Environment Variables Required:**
- `POSTGRES_URL` - Database connection string
- `JWT_SECRET` - JWT token signing secret

**Response:**
- **200 OK**: Array of student objects with `id`, `name`, `email`, `xp`, `level`, `streak`, `createdAt`, `updatedAt`
- **500 Internal Server Error**: `{ "success": false, "error": "..." }`

**Example Response:**
```json
[
  {
    "id": "clx0987654321",
    "name": "Jane Smith",
    "email": "jane.smith@student.edu",
    "xp": 150,
    "level": "Explorer",
    "streak": 5,
    "createdAt": "2024-01-10T08:15:00.000Z",
    "updatedAt": "2024-01-20T14:22:00.000Z"
  }
]
```

**Usage:**
```bash
curl -X GET https://black-sand-053455d1e.6.azurestaticapps.net/api/student_dashboard
```

## Environment Variable Validation

Both endpoints use the `_utils/envCheck.js` utility to validate that required environment variables are present before processing requests. If any required variables are missing, the endpoints will fail fast with a clear error message and log the issue for debugging.

## Preview vs Production Behavior

- **Preview Builds (Pull Requests)**: API endpoints return 404 as the API build is skipped
- **Production Builds (Main Branch)**: API endpoints are deployed and functional
