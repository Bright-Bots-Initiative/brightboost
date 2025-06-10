import { handler } from '../lessons';
import { APIGatewayProxyEvent } from 'aws-lambda';

const mockTeacherToken = {
  id: 1,
  email: 'teacher@example.com',
  role: 'TEACHER',
  name: 'Test Teacher'
};

describe('Lessons Lambda Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    const mockSecretsManager = {
      send: jest.fn(),
    };

    require('@aws-sdk/client-secrets-manager').SecretsManagerClient.mockImplementation(() => mockSecretsManager);
    
    mockSecretsManager.send.mockResolvedValue({
      SecretString: JSON.stringify({
        host: 'test-host',
        port: 5432,
        dbname: 'brightboost',
        username: 'postgres',
        password: 'test-password'
      })
    });

    require('jsonwebtoken').verify.mockReturnValue(mockTeacherToken);
  });

  describe('GET /api/lessons', () => {
    it('should return all lessons for teacher', async () => {
      const getEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        headers: { Authorization: 'Bearer valid-jwt-token' }
      };

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ exists: true }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              title: 'Math Lesson 1',
              description: 'Basic arithmetic',
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z'
            }
          ]
        });

      require('pg').Pool.mockImplementation(() => ({
        connect: jest.fn(),
        query: mockQuery,
        end: jest.fn(),
      }));

      const result = await handler(getEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.lessons).toHaveLength(1);
      expect(body.lessons[0].title).toBe('Math Lesson 1');
    });
  });

  describe('POST /api/lessons', () => {
    it('should create a new lesson', async () => {
      const postEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        headers: { Authorization: 'Bearer valid-jwt-token' },
        body: JSON.stringify({
          title: 'New Lesson',
          description: 'A new lesson description'
        })
      };

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ exists: true }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 2,
            title: 'New Lesson',
            description: 'A new lesson description',
            teacher_id: 1,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }]
        });

      require('pg').Pool.mockImplementation(() => ({
        connect: jest.fn(),
        query: mockQuery,
        end: jest.fn(),
      }));

      const result = await handler(postEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.lesson.title).toBe('New Lesson');
    });

    it('should return 400 for missing title', async () => {
      const postEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        headers: { Authorization: 'Bearer valid-jwt-token' },
        body: JSON.stringify({
          description: 'A lesson without title'
        })
      };

      const result = await handler(postEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Title is required');
    });
  });

  describe('PUT /api/lessons/{id}', () => {
    it('should update an existing lesson', async () => {
      const putEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PUT',
        headers: { Authorization: 'Bearer valid-jwt-token' },
        pathParameters: { id: '1' },
        body: JSON.stringify({
          title: 'Updated Lesson',
          description: 'Updated description'
        })
      };

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ exists: true }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            title: 'Updated Lesson',
            description: 'Updated description',
            teacher_id: 1,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }]
        });

      require('pg').Pool.mockImplementation(() => ({
        connect: jest.fn(),
        query: mockQuery,
        end: jest.fn(),
      }));

      const result = await handler(putEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.lesson.title).toBe('Updated Lesson');
    });

    it('should return 400 for missing lesson ID', async () => {
      const putEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PUT',
        headers: { Authorization: 'Bearer valid-jwt-token' },
        pathParameters: {},
        body: JSON.stringify({
          title: 'Updated Lesson'
        })
      };

      const result = await handler(putEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Lesson ID is required');
    });
  });

  describe('DELETE /api/lessons/{id}', () => {
    it('should delete an existing lesson', async () => {
      const deleteEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'DELETE',
        headers: { Authorization: 'Bearer valid-jwt-token' },
        pathParameters: { id: '1' }
      };

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ exists: true }] })
        .mockResolvedValueOnce({ rowCount: 1 });

      require('pg').Pool.mockImplementation(() => ({
        connect: jest.fn(),
        query: mockQuery,
        end: jest.fn(),
      }));

      const result = await handler(deleteEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Lesson deleted successfully');
    });

    it('should return 404 for non-existent lesson', async () => {
      const deleteEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'DELETE',
        headers: { Authorization: 'Bearer valid-jwt-token' },
        pathParameters: { id: '999' }
      };

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ exists: true }] })
        .mockResolvedValueOnce({ rowCount: 0 });

      require('pg').Pool.mockImplementation(() => ({
        connect: jest.fn(),
        query: mockQuery,
        end: jest.fn(),
      }));

      const result = await handler(deleteEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Lesson not found');
    });
  });

  it('should return 403 for non-teacher role', async () => {
    require('jsonwebtoken').verify.mockReturnValue({
      id: 1,
      email: 'student@example.com',
      role: 'STUDENT',
      name: 'Test Student'
    });

    const getEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'GET',
      headers: { Authorization: 'Bearer valid-jwt-token' }
    };

    const result = await handler(getEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Access denied. Teacher role required.');
  });
});
