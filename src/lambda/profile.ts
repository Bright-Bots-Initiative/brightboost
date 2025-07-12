import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { Pool } from "pg";
import * as jwt from "jsonwebtoken";

const secretsClient = new SecretsManagerClient({ region: "us-east-1" });

let pool: Pool | null = null;

async function getDbConnection(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  try {
    const secretValue = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: "brightboost-db-credentials",
      })
    );

    if (!secretValue.SecretString) {
      throw new Error("No secret string found");
    }

    const secret = JSON.parse(secretValue.SecretString);

    pool = new Pool({
      host: secret.host,
      port: secret.port,
      database: secret.dbname,
      user: secret.username,
      password: secret.password,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    return pool;
  } catch (error) {
    console.error("Error connecting to database:", error);
    throw error;
  }
}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Missing or invalid authorization header" }),
      };
    }

    const token = authHeader.substring(7);
    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid token" }),
      };
    }

    if (!decoded.userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid token payload" }),
      };
    }

    const db = await getDbConnection();
    const result = await db.query(
      'SELECT id, name, email, "avatarUrl", school, subject FROM "User" WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    const user = result.rows[0];
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        avatar: user.avatarUrl,
        name: user.name,
        email: user.email,
        school: user.school,
        subject: user.subject
      }),
    };
  } catch (error) {
    console.error("Error in profile handler:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
