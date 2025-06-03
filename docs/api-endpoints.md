# API Endpoints Documentation

## Dashboard Endpoints

### GET /api/teacher_dashboard

**Description:** Teacher dashboard endpoint that validates environment variables and returns a simple success response.

**Environment Variables Required:**
- `POSTGRES_URL` - Database connection string
- `JWT_SECRET` - JWT token signing secret

**Response:**
- **200 OK**: `{ "ok": true }`
- **500 Internal Server Error**: `{ "success": false, "error": "Missing required environment variables: ..." }`

**Usage:**
```bash
curl -X GET https://your-app.azurestaticapps.net/api/teacher_dashboard
```

### GET /api/student_dashboard

**Description:** Student dashboard endpoint that validates environment variables and returns a simple success response.

**Environment Variables Required:**
- `POSTGRES_URL` - Database connection string
- `JWT_SECRET` - JWT token signing secret

**Response:**
- **200 OK**: `{ "ok": true }`
- **500 Internal Server Error**: `{ "success": false, "error": "Missing required environment variables: ..." }`

**Usage:**
```bash
curl -X GET https://your-app.azurestaticapps.net/api/student_dashboard
```

## Environment Variable Validation

Both endpoints use the `_utils/envCheck.js` utility to validate that required environment variables are present before processing requests. If any required variables are missing, the endpoints will fail fast with a clear error message and log the issue for debugging.

## Preview vs Production Behavior

- **Preview Builds (Pull Requests)**: API endpoints return 404 as the API build is skipped
- **Production Builds (Main Branch)**: API endpoints are deployed and functional
