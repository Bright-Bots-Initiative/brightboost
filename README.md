# BrightBoost: Interactive Learning Platform

BrightBoost is an interactive learning platform designed to help teachers create engaging lessons and students to learn in a fun, gamified environment.

## Key Features

- **Teacher Accounts & Dashboard:** Teachers can sign up, log in, and manage their lessons through a dedicated dashboard.
- **Student Accounts & Dashboard:** Students can sign up, log in, and access assigned lessons and activities.
- **Lesson Creation & Management:** Teachers can create, edit, and delete lessons, including title, content, category, and status.
- **Student Lesson Viewing & Activity Tracking:** Students can view lessons assigned to them and mark activities as complete.
- **Persistent Data Storage:** User and lesson data is stored persistently using Azure PostgreSQL database.
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
  - AWS Lambda with API Gateway
  - Aurora PostgreSQL (AWS RDS)
  - JSON Web Tokens (JWT) for authentication
  - `bcryptjs` for password hashing
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
    cd src/lambda && npm install && cd ../..
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root of the project:

    ```env
    VITE_AWS_API_URL=https://your-api-gateway-url.execute-api.region.amazonaws.com/stage
    ```

    Replace with your actual AWS API Gateway URL. Backend environment variables are managed through AWS Secrets Manager.

## API Configuration

The application uses `VITE_AWS_API_URL` to configure the backend API endpoint:

- **Development**: Uses environment variable or defaults to production endpoint
- **Production**: Set via Azure Static Web App configuration in Azure Portal
- **Testing**: All authentication flows (login/signup for both teachers and students) use this single endpoint

### Cypress Production Testing

To run Cypress tests against production or staging environments:

```bash
# Test against production
CYPRESS_BASE_URL=https://brave-bay-0bfacc110-production.centralus.6.azurestaticapps.net npx cypress run

# Test against staging
CYPRESS_BASE_URL=https://your-staging-url.azurestaticapps.net npx cypress run
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
    The backend now runs on AWS Lambda. For local development, you can use the mock server:
    ```sh
    npm run server
    ```
    This will start a local Express server for development.

## Production Deployment

**Live Application:** https://brave-bay-0bfacc110-production.centralus.6.azurestaticapps.net

The application is deployed using Azure Static Web Apps for the frontend with an AWS Lambda backend.

## Deployment

This project uses a hybrid deployment approach:

### Backend Deployment (AWS Lambda)

The backend is deployed to AWS Lambda using GitHub Actions CI/CD pipeline. The deployment workflow is defined in `.github/workflows/aws-lambda-deploy.yml`.

**Backend Infrastructure:**

- **AWS Lambda** for serverless backend functions
- **Aurora PostgreSQL** (AWS RDS) for data persistence
- **API Gateway** for HTTP API endpoints
- **AWS Secrets Manager** for secure credential storage

### Frontend Deployment (Azure Static Web Apps)

The frontend continues to be deployed to Azure Static Web Apps for optimal performance and global distribution.

**Frontend URL:** https://brave-bay-0bfacc110-production.centralus.6.azurestaticapps.net

### Deployment Pipeline

The deployment pipeline:

1. **Frontend**: Builds and deploys React application to Azure Static Web Apps
2. **Backend**: Builds TypeScript Lambda functions and deploys to AWS using SAM
3. **Database**: Uses Aurora PostgreSQL cluster in AWS
4. **API Integration**: Frontend calls AWS API Gateway endpoints directly

**Environment Variables:**

- `VITE_AWS_API_URL`: AWS API Gateway endpoint URL
- Backend credentials stored in AWS Secrets Manager

## Troubleshooting Auth Redirects

### Common Issues

**"Failed to fetch" errors during login/signup:**

- Ensure `VITE_AWS_API_URL` is set correctly in your `.env` file
- Check that the AWS Lambda endpoints are deployed and accessible
- Verify network connectivity to AWS API Gateway

**Redirects not working after login/signup:**

- Check browser localStorage for `brightboost_token` key (not `token`)
- Ensure user object contains valid `role` field ('teacher' or 'student')
- Check browser console for navigation errors

**Token not persisting across page reloads:**

- Verify `brightboost_token` is stored in localStorage
- Check that AuthContext is properly wrapping your app
- Ensure token hasn't expired (24-hour expiration)

**API calls failing with authentication errors:**

- Verify `Authorization: Bearer <token>` header is attached to requests
- Check that token is valid and not expired
- Ensure API endpoints are configured to accept JWT tokens

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
├── src/lambda/         # AWS Lambda backend functions
│   ├── teacher-signup.ts # Teacher signup Lambda function
│   ├── package.json    # Lambda dependencies
│   └── tsconfig.json   # TypeScript configuration
├── prisma/             # Prisma ORM schema and migrations
│   ├── schema.prisma   # Database schema definition
│   └── migrations/     # Database migrations
├── scripts/            # Deployment and utility scripts
├── cypress/            # Cypress E2E tests
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── postcss.config.js   # PostCSS configuration
├── README.md           # This file
└── package.json        # Project dependencies and scripts
```

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

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- AWS Lambda (backend)
- Prisma ORM
- AWS Aurora PostgreSQL

## How can I deploy this project?

The project uses a hybrid deployment strategy:

**Frontend**: Automatically deployed to Azure Static Web Apps via GitHub Actions

- **Production URL:** https://brave-bay-0bfacc110-production.centralus.6.azurestaticapps.net

**Backend**: Automatically deployed to AWS Lambda via GitHub Actions

- **API Endpoint:** https://t6gymccrfg.execute-api.us-east-1.amazonaws.com/prod

For deployment configuration details, refer to the [Deployment Guide](./DEPLOYMENT.md) document.

## Testing

BrightBoost includes comprehensive testing:

- **Unit Tests**: Component and utility testing with Vitest
- **E2E Tests**: End-to-end workflows with Cypress
- **Linting**: Code quality checks with ESLint

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:e2e
npm run lint
```

For detailed testing information, see the [Testing Guide](./docs/TESTING.md).

## Custom Domains

For deployments to Azure Static Web Apps, custom domains can be configured directly within the Azure Portal under the Static Web App's "Custom domains" section. SSL certificates are automatically provisioned for custom domains.
