# BrightBoost: Interactive Learning Platform

BrightBoost is an interactive learning platform designed to help teachers create engaging lessons and students to learn in a fun, gamified environment.

## Key Features

*   **Teacher Accounts & Dashboard:** Teachers can sign up, log in, and manage their lessons through a dedicated dashboard.
*   **Student Accounts & Dashboard:** Students can sign up, log in, and access assigned lessons and activities.
*   **Lesson Creation & Management:** Teachers can create, edit, and delete lessons, including title, content, category, and status.
*   **Student Lesson Viewing & Activity Tracking:** Students can view lessons assigned to them and mark activities as complete.
*   **Persistent Data Storage:** User and lesson data is stored persistently using PostgreSQL with Prisma ORM.
*   **Role-Based Access Control:** Clear distinction between teacher and student functionalities.
*   **E2E Tested Core Flow:** The primary user journeys for teachers and students have been tested.

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

*   **Frontend:**
    *   React
    *   Vite
    *   TypeScript
    *   Tailwind CSS
    *   shadcn-ui (for UI components)
    *   React Router (for navigation)
    *   Context API (for state management, e.g., AuthContext)
*   **Backend:**
    *   Node.js with Express.js
    *   PostgreSQL with Prisma ORM (for database operations)
    *   JSON Web Tokens (JWT) for authentication
    *   `bcryptjs` for password hashing
*   **Testing:**
    *   Vitest (for unit/integration tests)
    *   Cypress (for End-to-End tests)
*   **Development Tools:**
    *   ESLint (for linting)
    *   Storybook (for UI component development and testing)

## Getting Started

To get a local copy up and running, follow these simple steps.

**Prerequisites:**
*   Node.js (v18 or later recommended)
*   npm (comes with Node.js)

**Installation & Setup:**

1.  **Clone the repository:**
    ```sh
    git clone <YOUR_GIT_URL> # Replace <YOUR_GIT_URL> with the actual Git URL of this project
    cd <YOUR_PROJECT_NAME>   # Replace <YOUR_PROJECT_NAME> with the directory name
    ```

2.  **Install dependencies:**
    This will install both frontend and backend dependencies.
    ```sh
    npm install
    ```

3.  **Configure Environment Variables:**
    The backend server (`server.cjs`) uses a `.env` file for configuration (e.g., `JWT_SECRET`). Create a `.env` file in the root of the project if it doesn't exist:
    ```env
    JWT_SECRET=your_super_secret_jwt_key_here
    # PORT=3001 (Optional, defaults to 3000 or 3001 if not set)
    ```
    Replace `your_super_secret_jwt_key_here` with a strong, unique secret.

4.  **Running the Application (Full Stack):**
    To run both the frontend Vite development server and the backend Node.js server concurrently:
    ```sh
    npm run dev:full
    ```
    This command typically starts:
    *   Frontend (Vite): `http://localhost:5173` (or another port if 5173 is busy)
    *   Backend Server: `http://localhost:3000` (or the port specified in `.env`/default)

5.  **Running Frontend Only:**
    ```sh
    npm run dev
    ```

6.  **Running Backend Server Only:**
    For development with auto-reloading (using `nodemon`):
    ```sh
    npm run dev:server
    ```
    Or to run the plain Node.js server (e.g., for production testing):
    ```sh
    npm run server
    ```

## Deployment

This project is configured for deployment to Azure Static Web Apps.

### Using Azure (CI/CD Pipeline)

The BrightBoost application is deployed to Azure using a GitHub Actions CI/CD pipeline defined in `.github/workflows/azure-static-web-apps-black-sand-053455d1e.yml`. This workflow automatically builds and deploys both the frontend and API functions when changes are pushed to the main branch.

For information on setting up Azure resources, refer to the [Azure Deployment Configuration](./AZURE_DEPLOYMENT.md) document.

The deployment pipeline:
1. Builds and tests the application
2. Deploys the frontend to Azure Static Web Apps
3. Deploys the API functions to Azure Static Web Apps
4. Configures routing and environment variables

**Note on PostgreSQL for Azure Deployment:**
The backend uses PostgreSQL with Prisma ORM for data persistence. When deploying to Azure Static Web Apps:
*   Configure the `POSTGRES_URL` environment variable in Azure Static Web Apps settings
*   Ensure the Azure PostgreSQL Flexible Server is properly configured and accessible
*   For production deployment, use Azure Key Vault to securely manage database credentials
*   The `AZURE_DEPLOYMENT.MD` file contains more details on the deployment configuration

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
├── cypress/            # Cypress E2E tests
├── server.cjs          # Backend Express server (Node.js, CommonJS)
├── prisma/             # Prisma schema and migration files
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── postcss.config.js   # PostCSS configuration
├── README.md           # This file
└── package.json        # Project dependencies and scripts
```
*Note: Database migrations and seed scripts are available in the `prisma` directory for initializing the PostgreSQL database with schema and test data.*

## How can I edit this code? (Legacy Lovable Info)

This project was initially scaffolded or managed by Lovable. While direct local development (as described in "Getting Started") is the primary recommended method, you might find references to Lovable.

**Use your preferred IDE (Recommended)**

Clone this repo and push changes. Pushed changes will also be reflected in Lovable if the project is still linked.
The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

**Use Lovable (If Applicable)**

If the project is actively managed via Lovable:
Visit the [Lovable Project](https://lovable.dev/projects/f303f677-9491-4ea6-843e-bc69a8fc78d2) and start prompting.
Changes made via Lovable will be committed automatically to this repo.

**Edit a file directly in GitHub / Use GitHub Codespaces**
Standard GitHub workflows are always available.

## I want to use a custom domain - is that possible? (Legacy Lovable Info)

Lovable's specific advice was: "We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)"

For deployments to Azure (as configured for this project), custom domains can be configured directly within Azure App Service.
