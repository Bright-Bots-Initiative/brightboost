# Contributing to Bright Bots Front-End

Thank you for helping us build joyful K-8 STEM tools! This guide shows you how to run, test, and submit code to the frontend repo.

## Quick-start Prerequisites

- Node 18 LTS (`nvm install 18`)
- npm (comes with Node.js)
- VS Code + ESLint/Prettier extensions (recommended)

## Local Dev Commands

- `npm install` – install dependencies
- `npm run dev` – start Vite dev server (`http://localhost:3000`)
- `npm run lint` – check code for style and potential issues
- `npm run test` – run tests
- `npm run test:watch` – run tests in watch mode
- `npm run storybook` – start Storybook for component development (`http://localhost:6006`)

## Branch-Naming Rules

| Purpose    | Pattern            | Example                       |
|------------|--------------------|------------------------------ |
| Feature    | feat/<area>/<slug> | feat/student/lesson-progress  |
| Bug-fix    | fix/<area>/<slug>  | fix/auth/login-validation     |
| Chore/docs | chore/<slug>       | chore/update-readme           |

**Tip:** One issue ↔ one branch ↔ one PR

## Commit Message Style

We follow the Conventional Commits standard. Format: `<type>(<scope>): <short summary>`

Examples:
- `feat(student): add lesson progress tracking`
- `fix(api): correct authentication header handling`
- `chore: update dependencies`

## Pre-Commit Hooks

We recommend setting up Husky to run linting and tests before commits:
- `npm run lint` checks code style and potential issues
- `npm run test --silent` ensures all tests pass

## Pull-Request Checklist

- [ ] PR title follows Conventional Commits format
- [ ] Code passes linting (`npm run lint`)
- [ ] All tests pass (`npm run test`)
- [ ] Storybook components updated if UI changed
- [ ] Screenshots/Loom video for UI changes
- [ ] Issue linked and labeled appropriately
- [ ] Reviewers tagged (always include @Louis-Albanez + one peer)

## Coding Standards

- ESLint config based on TypeScript and React 18 best practices
- Functional components and hooks only (no class components)
- Folder naming conventions:
  - PascalCase for components (e.g., `Button`, `UserCard`)
  - camelCase for hooks, utilities, etc. (e.g., `useAuth`, `formatDate`)

## File/Folder Structure Cheat-Sheet

```
src/
├── components/        # Reusable UI components
│   └── ui/            # Shadcn UI components
├── contexts/          # React Context providers
├── hooks/             # Custom React hooks
├── lib/               # Utility functions and helpers
├── pages/             # Page components
├── services/          # API service layers
├── stories/           # Storybook stories
└── test/              # Test utilities
```

## Code of Conduct & License

Please refer to the [Code of Conduct](/CODE_OF_CONDUCT.md) when participating in our community.

This project is licensed under the MIT License - see the LICENSE file in the repo root for details.
