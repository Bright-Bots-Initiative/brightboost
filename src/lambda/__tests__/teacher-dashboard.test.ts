import { handler } from '../teacher-dashboard';
import { APIGatewayProxyEvent } from 'aws-lambda';

const mockEvent: Partial<APIGatewayProxyEvent> = {
  httpMethod: 'GET',
  headers: {
    Authorization: 'Bearer valid-jwt-token'
  }
};

describe('Teacher Dashboard Lambda Function', () => {
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

    require('jsonwebtoken').verify.mockReturnValue({
      id: 1,
      email: 'teacher@example.com',
      role: 'TEACHER',
      name: 'Test Teacher'
    });
  });

  it('should return 200 with teacher dashboard data', async () => {
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
      })
      .mockResolvedValueOnce({ rows: [{ student_count: '5' }] });

    require('pg').Pool.mockImplementation(() => ({
      connect: jest.fn(),
      query: mockQuery,
      end: jest.fn(),
    }));

    const result = await handler(mockEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('teacher');
    expect(body).toHaveProperty('lessons');
    expect(body).toHaveProperty('stats');
    expect(body.teacher.email).toBe('teacher@example.com');
    expect(body.lessons).toHaveLength(1);
    expect(body.stats.totalStudents).toBe(5);
  });

  it('should return 401 for missing authorization header', async () => {
    const unauthorizedEvent = {
      ...mockEvent,
      headers: {}
    };

    const result = await handler(unauthorizedEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Authorization token required');
  });

  it('should return 403 for non-teacher role', async () => {
    require('jsonwebtoken').verify.mockReturnValue({
      id: 1,
      email: 'student@example.com',
      role: 'STUDENT',
      name: 'Test Student'
    });

    const result = await handler(mockEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Access denied. Teacher role required.');
  });

  it('should create lessons table if it does not exist', async () => {
    const mockQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [{ exists: false }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ student_count: '0' }] });

    require('pg').Pool.mockImplementation(() => ({
      connect: jest.fn(),
      query: mockQuery,
      end: jest.fn(),
    }));

    const result = await handler(mockEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE lessons'));
  });

  it('should handle OPTIONS request', async () => {
    const optionsEvent = {
      ...mockEvent,
      httpMethod: 'OPTIONS'
    };

    const result = await handler(optionsEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('');
  });
});
