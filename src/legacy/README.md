# Archived Student Module Features

This directory contains archived features related to the student/classroom modules from the original Bright Boost application. These features have been moved to this directory for the Bright Grants MVP, which focuses solely on grant workflow.

## Archived Features

- Student Login (`/src/legacy/pages/StudentLogin.tsx`)
- Student Signup (`/src/legacy/pages/StudentSignup.tsx`)
- Student Dashboard (`/src/legacy/pages/StudentDashboard.tsx`)
- Student-related components (in `/src/legacy/components/`)
- Student-related routes in App.tsx
- Student-related database tables and schemas

## How to Re-enable

To re-enable these features:

1. Move the files back to their original locations
2. Uncomment the imports and routes in `App.tsx`
3. Uncomment the student-related logic in `AuthContext.tsx`
4. Restore student-related database tables and schemas
5. Update API endpoints to handle student-related requests
