# Azure SWA Authentication Migration

This document outlines the migration from custom JWT authentication to Azure Static Web Apps built-in authentication.

## Changes Made

### 1. Route Protection Configuration
- Updated `staticwebapp.config.json` to require authentication for `/api/*` routes
- Kept `/api/dbtest` public for health checks
- Added role-based access control: `teacher`, `student`, `admin`

### 2. Authentication Guard
- Created `api/_utils/swaAuth.js` to replace custom JWT verification
- Uses `x-ms-client-principal` header from Azure SWA
- Validates user roles and logs authentication events

### 3. Frontend Authentication
- Updated `AuthContext` to use `/.auth/me` endpoint
- Modified login/logout to use Azure SWA routes
- Updated API service to use `credentials: 'include'`

### 4. API Endpoints
- Updated `teacher_dashboard` and `student_dashboard` to use SWA auth
- Deprecated `login` and `signup` endpoints (return HTTP 410)
- Maintained backward compatibility with proper error messages

### 5. Testing Infrastructure
- Created Cypress auth flow test for end-to-end validation
- Added `auth-e2e` CI job with SWA CLI integration
- Updated production smoke tests to verify authentication

## Authentication Flow

1. User visits application
2. Frontend checks authentication via `/.auth/me`
3. If not authenticated, user clicks "Sign In with GitHub/Microsoft"
4. Azure SWA handles OAuth flow
5. User is redirected back with authentication cookies
6. API requests include authentication via `x-ms-client-principal` header
7. Backend validates roles and processes requests

## Deprecated Endpoints

- `/api/login` - Returns HTTP 410 with migration instructions
- `/api/signup` - Returns HTTP 410 with migration instructions
- `api/shared/auth.js` - Moved to `.deprecated` file for reference

## Testing

- Local development uses SWA CLI for authentication simulation
- CI tests validate both authenticated and unauthenticated scenarios
- Production smoke tests verify proper authentication enforcement
