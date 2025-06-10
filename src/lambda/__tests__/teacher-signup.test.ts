import { handler } from '../teacher-signup';
import { APIGatewayProxyEvent } from 'aws-lambda';

const mockEvent: Partial<APIGatewayProxyEvent> = {
  httpMethod: 'POST',
  headers: {},
  body: JSON.stringify({
    name: 'Test Teacher',
    email: 'teacher@example.com',
    password: 'password123',
    school: 'Test School',
    subject: 'Mathematics'
  })
};

describe('Teacher Signup Lambda Function', () => {
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
  });

  it('should return 201 for successful teacher signup', async () => {
    const mockQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          name: 'Test Teacher',
          email: 'teacher@example.com',
          role: 'TEACHER',
          school: 'Test School',
          subject: 'Mathematics'
        }]
      });

    require('pg').Pool.mockImplementation(() => ({
      connect: jest.fn(),
      query: mockQuery,
      end: jest.fn(),
    }));

    require('bcryptjs').hash.mockResolvedValue('hashedpassword');
    require('jsonwebtoken').sign.mockReturnValue('mock-jwt-token');

    const result = await handler(mockEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('user');
    expect(body.user.email).toBe('teacher@example.com');
  });

  it('should return 400 for missing required fields', async () => {
    const invalidEvent = {
      ...mockEvent,
      body: JSON.stringify({
        name: 'Test Teacher'
      })
    };

    const result = await handler(invalidEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Name, email, password, school, and subject are required');
  });

  it('should return 409 for existing email', async () => {
    const mockQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'teacher@example.com'
        }]
      });

    require('pg').Pool.mockImplementation(() => ({
      connect: jest.fn(),
      query: mockQuery,
      end: jest.fn(),
    }));

    const result = await handler(mockEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(409);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('User with this email already exists');
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
