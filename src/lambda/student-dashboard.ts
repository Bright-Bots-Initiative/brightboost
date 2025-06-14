import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { Pool } from "pg";

interface DatabaseSecret {
  host: string;
  port: number;
  dbname: string;
  username: string;
  password: string;
}

let dbPool: Pool | null = null;
const secretsManager = new SecretsManagerClient({ region: "us-east-1" });

async function getDbConnection(): Promise<Pool> {
  if (!dbPool) {
    console.log("Creating new database connection pool...");
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

    const secret: DatabaseSecret = JSON.parse(secretResult.SecretString);
    console.log(
      `Database config: host=${secret.host}, port=${secret.port}, dbname=${secret.dbname}`,
    );

    dbPool = new Pool({
      host: secret.host,
      port: secret.port,
      database: secret.dbname,
      user: secret.username,
      password: secret.password,
      ssl: {
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
    "Access-Control-Allow-Methods": "GET,OPTIONS",
  };

  console.log(
    "Student dashboard Lambda function started, event:",
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

    console.log("Attempting database connection...");
    const db = await getDbConnection();
    console.log("Database connection established successfully");

    const studentQuery =
      "SELECT id, name, email, xp, level, streak, created_at, updated_at FROM users WHERE role = 'STUDENT' ORDER BY created_at DESC";
    const studentResult = await db.query(studentQuery);

    console.log(`Found ${studentResult.rows.length} students`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(studentResult.rows),
    };
  } catch (error) {
    console.error("Student dashboard error:", error);

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
