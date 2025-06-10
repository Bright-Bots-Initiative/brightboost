# Brightboost Local Setup Guide
This guide will help you run BrightBoost locally with a temporary database. 

## Prerequisites / Installations
- Node.js installed globally
- pnpm installed globally (to install, run `npm install -g pnpm`)
- Docker Desktop installed (download from https://www.docker.com/products/docker-desktop/)
    - You will have to open the app for it to finish installation/initialization.

## Step 1: Clone and Install
- Clone the brightboost repository from GitHub
- Navigate to the project directory (`cd brightboost`)
- Run `pnpm install`
- Install Prisma dependencies: `pnpm add -D prisma && pnpm add @prisma/client`
- Install Playwright browsers: `pnpm exec playwright install`


## Step 2: Set up `.env` and `.env.local`
- First, rename `env(1).development` to `.env` or create one manually:
    - Run `cp "env(1).development" .env`
    - Open `.env` and add the following line to the end: `POSTGRES_URL=postgres://postgres:password@db:5432/brightboost`
    - Change `VITE_API_URL=http://localhost:7071` to `VITE_API_BASE=http://localhost:7071`
    - Double check `.env` includes the correct DB credentials
- Now run `cp .env .env.local`
- In `.env.local`, replace `POSTGRES_URL=postgres://postgres:password@db:5432/brightboost` with `POSTGRES_URL=postgres://postgres:password@localhost:5432/brightboost`

## Step 3: Edits to docker-compose.yml 
- Ensure Docker Desktop is installed and running. 
- Open the `docker-compose.yml` file in the root of the repo
- Add this line indented under "backend" (aligned with "build", "ports", etc) underneath the "build" block: `platform: linux/amd64`
- Under backend:, under ports:, change `-"3000:3000"` to `-"7071:7071"`.
- Under backend:, under environment:, add this line: `FUNCTIONS_WORKER_RUNTIME=node` (aligned with "NODE_ENV=production")
- Under backend:, edit `command: sh -c "npx prisma generate && func start"` to `command: func start`.
- Add the following code to the bottom of the file, indented under `services:` (make sure "db" is aligned with "frontend" and "backend"):
    ```
    db:
        image: postgres:15
        restart: always
        ports:
            - "5432:5432"
        environment:
            POSTGRES_USER: postgres
            POSTGRES_PASSWORD: password
            POSTGRES_DB: brightboost
        volumes:
            - postgres-data:/var/lib/postgresql/data
    ```
- Also, add the following code to the bottom of the file, with "volumes" aligning with "services":
    ```
    volumes:
        postgres-data:
    ```

## Step 4: Dockerignore
- Create a `.dockerignore` file in the root of the repository (`touch .dockerignore`)
- Write the following into the file:
    ```
    node_modules
    npm-debug.log
    pnpm-lock.yaml
    .env
    ```
- Save and close the file

## Step 5: Dockerfile.backend
- Open the Dockerfile.backend file, located in the root of the repo.
- Change the first line from `FROM node:18-alpine` to `FROM node:18-slim`
- Right underneath the first line (above WORKDIR), include the following block:
    ```
    #Install system dependencies
    RUN apt-get update && \
        apt-get install -y libicu-dev openssl && \
        rm -rf /var/lib/apt/lists/*
    ```
- Right underneath WORKDIR /app, include the following line: `COPY api .`
- Paste this line right above the Prisma client generation:
    ```
    # Install Azure Functions Core Tools v4
    RUN npm install -g azure-functions-core-tools@4 --unsafe-perm true
    ```
- Replace `EXPOSE 3000` with `EXPOSE 7071`.
- Also edit the last line of `Dockerfile.backend` to say this instead:
    `CMD ["func", "start"]`

## Step 6: API Functions
- Navigate to `api/hello/index.js`. Rename this file to `index.cjs`. 
- Similarly, navigate to `api/signup/index.js`. Rename this file to `index.cjs`. 

## Step 7: Build & Run
- Run the following one at a time in the root directory (should take 5-7min):
    ```
    docker compose down -v
    docker compose up --build -V
    ```
- in another terminal window:
    `docker exec -it brightboost-backend-1 npx prisma db push`
    - NOTE: prisma db push must be run every time you rebuild your dev database (eg, after `docker compose down -v`).

## Step 8: Verify (do not skip!)
- Visit http://localhost to make sure the frontend loading page shows up.
- Open a new terminal window and navigate to the root of the repo
- Run `curl http://localhost:7071/api/hello`. Should output the following message: `"message": "Hello, World! This is a test function to verify Azure Functions deployment."`
- Run 
    ```
    curl -X POST http://localhost:7071/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@test.com",
    "password": "123456",
    "role": "student"
  }'
    ```
    Should output something like the following:
    ```
    "message": "User created successfully",
  "user": {
    "id": "cmblh6bql0000pi0yn8nzny9r",
    "name": "Test User",
    "email": "test@test.com",
    "role": "student",
    "level": "Explorer"
  },
  "token": "<JWT token here>"
  ```
- If either test fails, open Docker Desktop and inspect logs for the backend and db containers.

## TIPS:
- To fully reset your dev environment:
    ```
    docker compose down -v
    rm -rf node_modules
    pnpm install
    ```
- If port 7071 is in use, kill the process:
    ```
    lsof -i :7071
    kill -9 <PID>
    ```
