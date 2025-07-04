# BrightBoost Local Setup Guide

This guide will help you run BrightBoost locally with a temporary database.

## Prerequisites / Installations

- Node.js installed
- npm installed globally
- Docker Desktop installed (download from https://www.docker.com/products/docker-desktop/)
  - You will have to open the app for it to finish installation/initialization.
- PostgreSQL
- Git

## AWS Installations:

- Globally: install AWS SAM CLI
  - For MacOS:

  ```
  brew tap aws/tap
  brew install aws-sam-cli
  ```

  - For Linux: `chmod +x sam-install.sh && ./sam-install.sh`
  - For Windows: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
    For issues, check docs: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

- Navigate to `src/lambda`:
  - Run `npm install aws-lambda @aws-sdk/client-secrets-manager pg bcryptjs jsonwebtoken`

## Step 1: Clone the Repository

    ```
    git clone <YOUR_GIT_URL> # Replace <YOUR_GIT_URL> with the actual Git URL of this project
    cd brightboost
    ```

## Step 2: Spin up a Postgres container

- Run:
  ```
  docker compose -f docker-compose-pg.yml up -d
  ```
- You should see something like:
  ```
  Network brightboost-pg_default   Created
  Container brightboost-pg-db-1    Started
  ```
- The db is accessible through localhost:5435

## Step 3: Build AWS SAM

- Run the following code:
  ```
  cd src/lambda
  npm run build
  cd ../..
  sam build
  ```
- Start the local Lambda API:
  ```
  sam local start-api --parameter-overrides ParameterKey=Environment,ParameterValue=local
  ```

## Step 4: Test it

- In a new terminal, in the root directory:
  ```
  curl -X POST http://localhost:3000/api/signup/student \
  -H "Content-Type: application/json" \
  -d '{
      "name": "Test User",
      "email": "test@test.com",
      "password": "12345678"
  }'
  ```
- The output should be something like the following:
  ```
  {"message":"Student account created successfully","user":{"id":1,"name":"Test User","email":"test@test.com","role":"STUDENT","createdAt":"2025-06-14T00:59:05.430Z"},"token":"<jwt_token>"}
  ```

## Step 5: Run Frontend

- While in the root of the repo, run
  ```
  npm run local
  ```
- This will use the locally run Lambda API from step 3, assuming it's available on localhost:3000 as it is by default

## Tearing Down

- To stop the local frontend, go to the terminal in which it is running and hit Ctrl+C
- Similarly for the Lambda API, go to its terminal and hit Ctrl+C
- For the DB container, go to the root of the repo and run
  ```
  docker compose -f docker-compose-pg.yml down
  ```

## Tips:

- Anytime you edit files in `src/lambda`:
  ```
  cd src/lambda && npm run build
  cd ../.. && sam build
  sam local start-api
  ```
- You do not need Docker for Lambda itself; SAM uses Docker under the hood
- You do need Docker running for both SAM and the local Postgres container
- If you don't need to test backend changes,
  you can skip these tests and run 'npm run dev' as usual to use the deployed dev backend
- If you want to change the frontend's API URL from localhost:3000, change the value in .env.local-be
- After restarting the DB docker container, the data in the DB will not persist.
  Each time you start the DB, you have to sign up a user before being able to test login
