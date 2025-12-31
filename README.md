# BrightBoost: Interactive Learning Platform

BrightBoost is an interactive learning platform designed to help teachers create engaging lessons and students to learn in a fun, gamified environment.

## Key Features

- **Teacher Accounts & Dashboard:** Teachers can sign up, log in, and manage their lessons through a dedicated dashboard.
- **Student Accounts & Dashboard:** Students can sign up, log in, and access assigned lessons and activities.
- **Lesson Creation & Management:** Teachers can create, edit, and delete lessons, including title, content, category, and status.
- **Student Lesson Viewing & Activity Tracking:** Students can view lessons assigned to them and mark activities as complete.
- **Persistent Data Storage:** User and lesson data is stored persistently using Supabase PostgreSQL.
- **Role-Based Access Control:** Clear distinction between teacher and student functionalities.
- **E2E Tested Core Flow:** The primary user journeys for teachers and students have been tested.

## Demo Flow Summary

A typical demo showcases:

1.  A **teacher** signing up or logging in.
2.  The teacher navigating their dashboard and creating a new lesson (e.g., "Introduction to Photosynthesis", Category: "Science", Content: "Learn about how plants make food.", Status: "Published").
3.  The teacher verifying the lesson is displayed on their dashboard.
4.  The teacher logging out.
5.  A **student** signing up or logging in.
6.  The student viewing the "Introduction to Photosynthesis" lesson on their dashboard.
7.  The student marking an activity associated with this lesson as "complete".
8.  The student logging out.

## Technologies Used

This project is built with a modern web technology stack:

- **Frontend:**
  - React
  - Vite
  - TypeScript
  - Tailwind CSS
  - shadcn-ui (for UI components)
  - React Router (for navigation)
  - Context API (for state management, e.g., AuthContext)
- **Backend:**
  - Node.js / Express
  - Prisma ORM
  - Supabase PostgreSQL
  - JSON Web Tokens (JWT) for authentication
  - `bcryptjs` for password hashing

**Architecture:** Frontend: Replit | Backend: Replit | Database: Supabase PostgreSQL

- **Testing:**
  - Vitest (for unit/integration tests)
  - Cypress (for End-to-End tests)
- **Development Tools:**
  - ESLint (for linting)
  - Storybook (for UI component development and testing)

## Getting Started

To get a local copy up and running, follow these simple steps.

**Prerequisites:**

- Node.js (v18 or later recommended)
- npm (comes with Node.js)
- pnpm (recommended for package management)

**Installation & Setup:**

1.  **Clone the repository:**

    ```sh
    git clone <YOUR_GIT_URL> # Replace <YOUR_GIT_URL> with the actual Git URL of this project
    cd <YOUR_PROJECT_NAME>   # Replace <YOUR_PROJECT_NAME> with the directory name
    ```

2.  **Install dependencies:**
    This will install both frontend and backend dependencies.

    ```sh
    pnpm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root of the project. See `.env.example` for required variables.

    ```env
    VITE_API_BASE=http://localhost:3000/api
    ```

## API Configuration

The application uses `VITE_API_BASE` to configure the backend API endpoint.

### Cypress Production Testing

To run Cypress tests against production or staging environments:

```bash
# Test smoke tests against production
CYPRESS_BASE_URL=https://your-replit-app.replit.app npx cypress run --spec "cypress/e2e/smoke.cy.ts"

# Test all tests against production
CYPRESS_BASE_URL=https://your-replit-app.replit.app npx cypress run
```

The Cypress configuration automatically uses `CYPRESS_BASE_URL` environment variable when provided, falling back to `http://localhost:5173` for local development.

4.  **Running the Application:**
    To run the frontend Vite development server:

    ```sh
    npm run dev
    ```

    This command starts:
    - Frontend (Vite): `http://localhost:5173` (or another port if 5173 is busy)

5.  **Running the Backend Locally:**
    ```sh
    cd backend
    npm run dev
    ```
    This will start a local Express server for development.

## Production Deployment

### Railway Deployment

The application is deployed to Railway using a `railway.toml` configuration file that specifies a Node.js runtime.

- **Deployment Config:** `railway.toml`
- **Runtime:** Node.js (via `npm start` which runs the backend server)
- **Static Files:** The backend serves the built frontend from `dist/`

**Note:** The `docs/Dockerfile.nginx` file is preserved for reference or alternative static hosting but is **not** used by the active Railway deployment pipeline.

## Deployment

This project uses a modern deployment approach:

### Backend Deployment (Replit)

The backend is deployed to Replit.

**Backend Infrastructure:**

- **Node.js** for backend server
- **Supabase PostgreSQL** for data persistence
- **Prisma ORM** for database access

### Frontend Deployment (Replit)

The frontend is deployed to Replit.

### Deployment Pipeline

The deployment pipeline:

1. **Frontend**: Builds and deploys React application to Replit
2. **Backend**: Builds TypeScript Express app and deploys to Replit
3. **Database**: Uses Supabase PostgreSQL

**Environment Variables:**

- `VITE_API_BASE`: Backend API URL

## Troubleshooting Auth Redirects

### Common Issues

**"Failed to fetch" errors during login/signup:**

- Ensure `VITE_API_BASE` is set correctly in your `.env` file
- Check that the backend server is running
- Verify network connectivity

**Redirects not working after login/signup:**

- Check browser localStorage for `bb_access_token` key
- Ensure user object contains valid `role` field ('teacher' or 'student')
- Check browser console for navigation errors

**Token not persisting across page reloads:**

- Verify `bb_access_token` is stored in localStorage
- Check that AuthContext is properly wrapping your app
- Ensure token hasn't expired

## Project Structure (Simplified)

```
├── public/             # Static assets
├── src/                # Frontend source code (React, Vite, TypeScript)
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts (e.g., AuthContext)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   ├── pages/          # Page components (routed views)
│   ├── services/       # API service integration
│   ├── App.tsx         # Main application component
│   └── main.tsx        # Entry point for the React app
├── backend/            # Express backend
│   ├── src/            # Backend source code
│   ├── prisma/         # Prisma ORM schema and migrations
│   └── package.json    # Backend dependencies
├── cypress/            # Cypress E2E tests
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── postcss.config.js   # PostCSS configuration
├── README.md           # This file
└── package.json        # Project dependencies and scripts
```

## How can I edit this code?

This project uses standard web development practices and can be edited using any modern code editor or IDE.

**Local Development**
Follow the "Getting Started" section above to set up the project locally for development.

## Custom Domain Setup

For custom domain configuration, you can use Replit's custom domain features.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Node.js / Express (backend)
- Prisma ORM
- Supabase PostgreSQL

## Testing

BrightBoost includes comprehensive testing:

- **Unit Tests**: Component and utility testing with Vitest
- **E2E Tests**: End-to-end workflows with Cypress
- **Linting**: Code quality checks with ESLint
