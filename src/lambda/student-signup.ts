import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

interface DatabaseSecret {
  host: string;
  port: number;
  dbname: string;
  username: string;
  password: string;
}

interface StudentSignupRequest {
  name: string;
  email: string;
  password: string;
}

let dbPool: Pool | null = null;
const secretsManager = new SecretsManagerClient({ region: "us-east-1" });

async function getDbConnection(): Promise<Pool> {
  if (!dbPool) {
    console.log("Creating new database connection pool...");
    let secret: DatabaseSecret;
    if (process.env.NODE_ENV === "local") {
      if (!process.env.DB_PASSWORD) {
        throw new Error("DB_PASSWORD environment variable is required");
      }
      secret = {
        host: "host.docker.internal",
        port: 5435,
        dbname: "brightboost",
        username: "postgres",
        password: process.env.DB_PASSWORD,
      };
    } else {
      const secretArn = process.env.DATABASE_SECRET_ARN;
      if (!secretArn) {
        throw new Error("DATABASE_SECRET_ARN environment variable not set");
      }

      console.log("Fetching database secret from Secrets Manager...");
      const command = new GetSecretValueCommand({ SecretId: secretArn });
      const secretResult = await secretsManager.send(command);
      if (!secretResult.SecretString) {
        throw new Error("Failed to retrieve database secret");
      }

      secret = JSON.parse(secretResult.SecretString);
    }
    console.log(
      `Database config: host=${secret.host}, port=${secret.port}, dbname=${secret.dbname}`,
    );

    dbPool = new Pool({
      host: secret.host,
      port: secret.port,
      database: secret.dbname,
      user: secret.username,
      password: secret.password,
      ssl:
        process.env.NODE_ENV === "local"
          ? false
          : {
              rejectUnauthorized: false,
            },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 25000,
    });

    console.log("Database pool created, testing connection...");
    try {
      const testClient = await dbPool.connect();
      console.log("Database connection test successful");

      console.log("Checking if users table exists...");
      const tableCheckResult = await testClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);

      if (!tableCheckResult.rows[0].exists) {
        console.log("Users table does not exist, creating it...");
        await testClient.query(`
          CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
            school VARCHAR(255),
            subject VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log("Users table created successfully");
      } else {
        console.log("Users table already exists");
      }

      testClient.release();
    } catch (error) {
      console.error("Database connection test failed:", error);

      if (
        error instanceof Error &&
        error.message.includes('database "brightboost" does not exist')
      ) {
        console.log(
          'Database "brightboost" does not exist, attempting to create it...',
        );
        try {
          const adminPool = new Pool({
            host: secret.host,
            port: secret.port,
            database: "postgres",
            user: secret.username,
            password: secret.password,
            ssl: {
              rejectUnauthorized: false,
            },
            max: 1,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 25000,
          });

          const adminClient = await adminPool.connect();
          console.log(
            "Connected to postgres database, creating brightboost database...",
          );
          await adminClient.query("CREATE DATABASE brightboost;");
          console.log('Database "brightboost" created successfully');
          adminClient.release();
          await adminPool.end();

          const newDbClient = await dbPool.connect();
          console.log("Creating users table in brightboost database...");
          await newDbClient.query(`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255) UNIQUE NOT NULL,
              password VARCHAR(255) NOT NULL,
              role VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
              school VARCHAR(255),
              subject VARCHAR(255),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);
          console.log("Users table created successfully");
          newDbClient.release();

          const testClient = await dbPool.connect();
          console.log("Connection to new brightboost database successful");
          testClient.release();
        } catch (createError) {
          console.error("Failed to create brightboost database:", createError);
          throw createError;
        }
      } else {
        throw error;
      }
    }
  }

  return dbPool;
}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  };

  console.log(
    "Student signup Lambda function started, event:",
    JSON.stringify(event, null, 2),
  );

  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers,
        body: "",
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Request body is required" }),
      };
    }

    const requestBody: StudentSignupRequest = JSON.parse(event.body);
    const { name, email, password } = requestBody;

    if (!name || !email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Name, email, and password are required",
        }),
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid email format" }),
      };
    }

    if (password.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Password must be at least 8 characters long",
        }),
      };
    }

    console.log("Attempting database connection...");
    const db = await getDbConnection();
    console.log("Database connection established successfully");

    const existingUserQuery = "SELECT id FROM users WHERE email = $1";
    const existingUserResult = await db.query(existingUserQuery, [email]);

    if (existingUserResult.rows.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: "User with this email already exists" }),
      };
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
      const insertUserNewSchemaQuery = `
        INSERT INTO "User" (id, name, email, password, role, "updatedAt")
        VALUES ($1, $2, $3, $4, 'student', NOW())
      `;
      const tempId = `${email}-${Math.floor(Math.random() * 1000)}`;
      await db.query(insertUserNewSchemaQuery, [
        tempId,
        name,
        email,
        hashedPassword,
      ]);
    } catch (e) {
      console.error("Error inserting new user schema entry", e);
    }

    const insertUserQuery = `
      INSERT INTO users (name, email, password, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, name, email, role, created_at
    `;

    const insertResult = await db.query(insertUserQuery, [
      name,
      email,
      hashedPassword,
      "STUDENT",
    ]);

    const newUser = insertResult.rows[0];

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable is required");
    }

    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
      },
      jwtSecret,
      { expiresIn: "24h" },
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: "Student account created successfully",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.created_at,
        },
        token,
      }),
    };
  } catch (error) {
    console.error("Student signup error:", error);

    if (error instanceof Error) {
      if (error.message.includes("duplicate key")) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: "User with this email already exists",
          }),
        };
      }

      if (error.message.includes("connection")) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ error: "Database connection error" }),
        };
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      }),
    };
  }
};
