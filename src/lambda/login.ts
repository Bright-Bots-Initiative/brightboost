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

interface LoginRequest {
  email: string;
  password: string;
}

let dbPool: Pool | null = null;
const secretsManager = new SecretsManagerClient({ region: "us-east-1" });

async function getDbConnection(): Promise<Pool> {
  console.log('env', process.env);
  if (!dbPool) {
    console.log("Creating new database connection pool...");
    let secret: DatabaseSecret;
    if (process.env.NODE_ENV === "local") {
      secret = {
        host: "host.docker.internal",
        port: 5435,
        dbname: "brightboost",
        username: "postgres",
        password: "brightboostpass",
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
      console.log(
        `Database config: host=${secret.host}, port=${secret.port}, dbname=${secret.dbname}`,
      );
    }

    dbPool = new Pool({
      host: secret.host,
      port: secret.port,
      database: secret.dbname,
      user: secret.username,
      password: secret.password,
      ssl: process.env.NODE_ENV === "local" ? false : {
        rejectUnauthorized: false,
      },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 25000,
    });

    console.log("Database pool created, testing connection...");
    const testClient = await dbPool.connect();
    console.log("Database connection test successful");
    testClient.release();
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
    "Login Lambda function started, event:",
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

    const requestBody: LoginRequest = JSON.parse(event.body);
    const { email, password } = requestBody;

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Email and password are required" }),
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

    console.log("Attempting database connection...");
    const db = await getDbConnection();
    console.log("Database connection established successfully");

    const userQuery =
      "SELECT id, name, email, password, role, school, subject, created_at FROM users WHERE email = $1";
    const userResult = await db.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid email or password" }),
      };
    }

    const user = userResult.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid email or password" }),
      };
    }

    const jwtSecret = process.env.JWT_SECRET || "fallback-secret-key";
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      jwtSecret,
      { expiresIn: "24h" },
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          school: user.school,
          subject: user.subject,
          createdAt: user.created_at,
        },
        token,
      }),
    };
  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof Error) {
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
