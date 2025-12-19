# BrightBoost: Interactive Learning Platform

BrightBoost is an interactive learning platform designed to help teachers create engaging lessons and students to learn in a fun, gamified environment.

## Current Architecture

*   **Hosting (App):** Replit (Frontend + Backend)
*   **Database:** Supabase Postgres
*   **ORM:** Prisma

## Key Features

- **Teacher Accounts & Dashboard:** Teachers can sign up, log in, and manage their lessons through a dedicated dashboard.
- **Student Accounts & Dashboard:** Students can sign up, log in, and access assigned lessons and activities.
- **Lesson Creation & Management:** Teachers can create, edit, and delete lessons, including title, content, category, and status.
- **Student Lesson Viewing & Activity Tracking:** Students can view lessons assigned to them and mark activities as complete.
- **Persistent Data Storage:** User and lesson data is stored persistently using Supabase Postgres.
- **Role-Based Access Control:** Clear distinction between teacher and student functionalities.
- **Gamification:** Avatars, XP, Levels, and PvP Arena (MVP verified).

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
  - Supabase Postgres
  - Prisma ORM
  - JSON Web Tokens (JWT) for authentication
  - `bcryptjs` for password hashing

## Getting Started

To get a local copy up and running, follow these simple steps.

**Prerequisites:**

- Node.js (v18 or later recommended)
- npm (comes with Node.js)
- pnpm (recommended for root dependency management)

**Installation & Setup:**

1.  **Clone the repository:**

    ```sh
    git clone <YOUR_GIT_URL>
    cd <YOUR_PROJECT_NAME>
    ```

2.  **Install dependencies:**

    Root:
    ```sh
    pnpm install
    ```

    Backend:
    ```sh
    cd backend
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root of the project:

    ```env
    VITE_API_BASE=/api
    DATABASE_URL="postgresql://user:password@host:5432/database"
    ```

    Replace `DATABASE_URL` with your actual Supabase connection string.

4.  **Database Setup:**

    Inside `backend/` directory:

    ```sh
    npm run db:generate
    npm run db:migrate
    ```

5.  **Running the Application:**

    In Replit or locally, start the application. Usually `npm start` or the Replit run command handles this.

    To run dev mode:
    ```sh
    npm run dev  # Root dev script if available, or verify package.json
    ```

## Project Structure

```
├── backend/            # Backend Node.js/Express application
│   ├── src/            # Backend source code
│   └── package.json    # Backend dependencies
├── frontend/           # (If separated) or src/ for Frontend
├── prisma/             # Prisma ORM schema and migrations
│   ├── schema.prisma   # Database schema definition
│   └── migrations/     # Database migrations
├── src/                # Frontend source code (React, Vite, TypeScript)
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts (e.g., AuthContext)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   ├── pages/          # Page components (routed views)
│   ├── services/       # API service integration
│   ├── App.tsx         # Main application component
│   └── main.tsx        # Entry point for the React app
├── vite.config.ts      # Vite configuration
├── tailwind.config.ts  # Tailwind CSS configuration
├── README.md           # This file
└── package.json        # Root project dependencies and scripts
```
