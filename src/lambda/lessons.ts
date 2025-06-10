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

interface LessonRequest {
  title: string;
  description?: string;
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
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };

  console.log('Lessons Lambda function started, event:', JSON.stringify(event, null, 2));

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

    const lessonId = event.pathParameters?.id;

    switch (event.httpMethod) {
      case 'GET':
        if (lessonId) {
          const lessonQuery = `
            SELECT id, title, description, created_at, updated_at
            FROM lessons 
            WHERE id = $1 AND teacher_id = $2
          `;
          const lessonResult = await db.query(lessonQuery, [lessonId, user.id]);
          
          if (lessonResult.rows.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Lesson not found' })
            };
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(lessonResult.rows[0])
          };
        } else {
          const lessonsQuery = `
            SELECT id, title, description, created_at, updated_at
            FROM lessons 
            WHERE teacher_id = $1 
            ORDER BY created_at DESC
          `;
          const lessonsResult = await db.query(lessonsQuery, [user.id]);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(lessonsResult.rows)
          };
        }

      case 'POST':
        if (!event.body) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Request body is required' })
          };
        }

        const createData: LessonRequest = JSON.parse(event.body);
        const { title, description } = createData;

        if (!title) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Title is required' })
          };
        }

        const insertQuery = `
          INSERT INTO lessons (title, description, teacher_id, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          RETURNING id, title, description, created_at, updated_at
        `;
        const insertResult = await db.query(insertQuery, [title, description || null, user.id]);

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            message: 'Lesson created successfully',
            lesson: insertResult.rows[0]
          })
        };

      case 'PUT':
        if (!lessonId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Lesson ID is required' })
          };
        }

        if (!event.body) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Request body is required' })
          };
        }

        const updateData: LessonRequest = JSON.parse(event.body);
        const { title: newTitle, description: newDescription } = updateData;

        if (!newTitle) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Title is required' })
          };
        }

        const updateQuery = `
          UPDATE lessons 
          SET title = $1, description = $2, updated_at = NOW()
          WHERE id = $3 AND teacher_id = $4
          RETURNING id, title, description, created_at, updated_at
        `;
        const updateResult = await db.query(updateQuery, [newTitle, newDescription || null, lessonId, user.id]);

        if (updateResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Lesson not found' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Lesson updated successfully',
            lesson: updateResult.rows[0]
          })
        };

      case 'DELETE':
        if (!lessonId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Lesson ID is required' })
          };
        }

        const deleteQuery = `
          DELETE FROM lessons 
          WHERE id = $1 AND teacher_id = $2
          RETURNING id
        `;
        const deleteResult = await db.query(deleteQuery, [lessonId, user.id]);

        if (deleteResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Lesson not found' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Lesson deleted successfully' })
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('Lessons error:', error);
    
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
