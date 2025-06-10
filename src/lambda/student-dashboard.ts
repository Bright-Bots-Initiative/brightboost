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

  console.log('Student Dashboard Lambda function started, event:', JSON.stringify(event, null, 2));

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

    if (user.role !== 'STUDENT') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied. Student role required.' })
      };
    }

    console.log('Attempting database connection...');
    const db = await getDbConnection();
    console.log('Database connection established successfully');

    console.log('Checking if student_progress table exists...');
    const tableCheckResult = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'student_progress'
      );
    `);
    
    if (!tableCheckResult.rows[0].exists) {
      console.log('Student_progress table does not exist, creating it...');
      await db.query(`
        CREATE TABLE student_progress (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES users(id),
          lesson_id INTEGER REFERENCES lessons(id),
          xp_earned INTEGER DEFAULT 0,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Student_progress table created successfully');
    }

    const progressQuery = `
      SELECT 
        sp.id,
        sp.xp_earned,
        sp.completed_at,
        l.title as lesson_title,
        l.description as lesson_description
      FROM student_progress sp
      LEFT JOIN lessons l ON sp.lesson_id = l.id
      WHERE sp.student_id = $1 
      ORDER BY sp.created_at DESC
    `;
    const progressResult = await db.query(progressQuery, [user.id]);

    const totalXpQuery = `
      SELECT COALESCE(SUM(xp_earned), 0) as total_xp
      FROM student_progress 
      WHERE student_id = $1
    `;
    const totalXpResult = await db.query(totalXpQuery, [user.id]);

    const availableLessonsQuery = `
      SELECT id, title, description, created_at
      FROM lessons 
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const availableLessonsResult = await db.query(availableLessonsQuery);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        student: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        progress: progressResult.rows,
        availableLessons: availableLessonsResult.rows,
        stats: {
          totalXp: parseInt(totalXpResult.rows[0].total_xp),
          completedLessons: progressResult.rows.filter(p => p.completed_at).length,
          totalActivities: progressResult.rows.length
        }
      })
    };

  } catch (error) {
    console.error('Student dashboard error:', error);
    
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
