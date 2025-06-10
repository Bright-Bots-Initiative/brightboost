import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Pool } from 'pg';
import * as jwt from 'jsonwebtoken';

interface DatabaseSecret {
  host: string;
  port: number;
  dbname: string;
  username: string;
  password: string;
}

interface JwtPayload {
  id: number;
  email: string;
  role: string;
  name: string;
}

let dbPool: Pool | null = null;

async function getDbConnection(): Promise<Pool> {
  if (!dbPool) {
    console.log('Creating new database connection pool...');
    const secretArn = process.env.DATABASE_SECRET_ARN;
    if (!secretArn) {
      throw new Error('DATABASE_SECRET_ARN environment variable not set');
    }

    console.log('Fetching database secret from Secrets Manager...');
    const secretsManager = new SecretsManagerClient({ region: 'us-east-1' });
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const secretResult = await secretsManager.send(command);
    if (!secretResult.SecretString) {
      throw new Error('Failed to retrieve database secret');
    }

    const secret: DatabaseSecret = JSON.parse(secretResult.SecretString);
    console.log(`Database config: host=${secret.host}, port=${secret.port}, dbname=${secret.dbname}`);
    
    dbPool = new Pool({
      host: secret.host,
      port: secret.port,
      database: secret.dbname,
      user: secret.username,
      password: secret.password,
      ssl: {
        rejectUnauthorized: false
      },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 25000,
    });
    
    console.log('Database pool created, testing connection...');
    const testClient = await dbPool.connect();
    console.log('Database connection test successful');
    testClient.release();
  }

  return dbPool;
}

function verifyToken(token: string): JwtPayload {
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
  return jwt.verify(token, jwtSecret) as JwtPayload;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  };

  console.log('Teacher Dashboard Lambda function started, event:', JSON.stringify(event, null, 2));

  try {
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization token required' })
      };
    }

    const token = authHeader.substring(7);
    let user: JwtPayload;
    
    try {
      user = verifyToken(token);
    } catch (error) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired token' })
      };
    }

    if (user.role !== 'TEACHER') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied. Teacher role required.' })
      };
    }

    console.log('Attempting database connection...');
    const db = await getDbConnection();
    console.log('Database connection established successfully');

    console.log('Checking if lessons table exists...');
    const tableCheckResult = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lessons'
      );
    `);
    
    if (!tableCheckResult.rows[0].exists) {
      console.log('Lessons table does not exist, creating it...');
      await db.query(`
        CREATE TABLE lessons (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          teacher_id INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Lessons table created successfully');
    }

    const lessonsQuery = `
      SELECT id, title, description, created_at, updated_at
      FROM lessons 
      WHERE teacher_id = $1 
      ORDER BY created_at DESC
    `;
    const lessonsResult = await db.query(lessonsQuery, [user.id]);

    const studentsQuery = `
      SELECT COUNT(*) as student_count
      FROM users 
      WHERE role = 'STUDENT'
    `;
    const studentsResult = await db.query(studentsQuery);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        teacher: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        lessons: lessonsResult.rows,
        stats: {
          totalLessons: lessonsResult.rows.length,
          totalStudents: parseInt(studentsResult.rows[0].student_count)
        }
      })
    };

  } catch (error) {
    console.error('Teacher dashboard error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('connection')) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ error: 'Database connection error' })
        };
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      })
    };
  }
};
