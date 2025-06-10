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

interface AwardXpRequest {
  studentId: number;
  lessonId: number;
  xpAmount: number;
}

interface CompleteActivityRequest {
  lessonId: number;
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
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };

  console.log('Gamification Lambda function started, event:', JSON.stringify(event, null, 2));

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

    const path = event.path || event.resource || '';
    
    if (path.includes('/award-xp')) {
      if (user.role !== 'TEACHER') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Access denied. Teacher role required.' })
        };
      }

      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Request body is required' })
        };
      }

      const requestData: AwardXpRequest = JSON.parse(event.body);
      const { studentId, lessonId, xpAmount } = requestData;

      if (!studentId || !lessonId || !xpAmount) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Student ID, lesson ID, and XP amount are required' })
        };
      }

      if (xpAmount <= 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'XP amount must be positive' })
        };
      }

      const studentQuery = 'SELECT id FROM users WHERE id = $1 AND role = $2';
      const studentResult = await db.query(studentQuery, [studentId, 'STUDENT']);

      if (studentResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Student not found' })
        };
      }

      const lessonQuery = 'SELECT id FROM lessons WHERE id = $1 AND teacher_id = $2';
      const lessonResult = await db.query(lessonQuery, [lessonId, user.id]);

      if (lessonResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Lesson not found or access denied' })
        };
      }

      const upsertQuery = `
        INSERT INTO student_progress (student_id, lesson_id, xp_earned, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (student_id, lesson_id) 
        DO UPDATE SET 
          xp_earned = student_progress.xp_earned + $3,
          updated_at = NOW()
        RETURNING id, student_id, lesson_id, xp_earned, updated_at
      `;
      
      try {
        const upsertResult = await db.query(upsertQuery, [studentId, lessonId, xpAmount]);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'XP awarded successfully',
            progress: upsertResult.rows[0]
          })
        };
      } catch (dbError) {
        console.log('Upsert failed, trying insert...');
        const insertQuery = `
          INSERT INTO student_progress (student_id, lesson_id, xp_earned, updated_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING id, student_id, lesson_id, xp_earned, updated_at
        `;
        const insertResult = await db.query(insertQuery, [studentId, lessonId, xpAmount]);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'XP awarded successfully',
            progress: insertResult.rows[0]
          })
        };
      }

    } else if (path.includes('/complete')) {
      if (user.role !== 'STUDENT') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Access denied. Student role required.' })
        };
      }

      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Request body is required' })
        };
      }

      const requestData: CompleteActivityRequest = JSON.parse(event.body);
      const { lessonId } = requestData;

      if (!lessonId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Lesson ID is required' })
        };
      }

      const lessonQuery = 'SELECT id FROM lessons WHERE id = $1';
      const lessonResult = await db.query(lessonQuery, [lessonId]);

      if (lessonResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Lesson not found' })
        };
      }

      const completeQuery = `
        INSERT INTO student_progress (student_id, lesson_id, xp_earned, completed_at, updated_at)
        VALUES ($1, $2, 10, NOW(), NOW())
        ON CONFLICT (student_id, lesson_id) 
        DO UPDATE SET 
          completed_at = NOW(),
          updated_at = NOW()
        RETURNING id, student_id, lesson_id, xp_earned, completed_at, updated_at
      `;
      
      try {
        const completeResult = await db.query(completeQuery, [user.id, lessonId]);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Activity completed successfully',
            progress: completeResult.rows[0]
          })
        };
      } catch (dbError) {
        console.log('Complete upsert failed, trying insert...');
        const insertQuery = `
          INSERT INTO student_progress (student_id, lesson_id, xp_earned, completed_at, updated_at)
          VALUES ($1, $2, 10, NOW(), NOW())
          RETURNING id, student_id, lesson_id, xp_earned, completed_at, updated_at
        `;
        const insertResult = await db.query(insertQuery, [user.id, lessonId]);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Activity completed successfully',
            progress: insertResult.rows[0]
          })
        };
      }

    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Endpoint not found' })
      };
    }

  } catch (error) {
    console.error('Gamification error:', error);
    
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
