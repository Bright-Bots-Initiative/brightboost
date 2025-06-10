import { handler } from '../login';
import { APIGatewayProxyEvent } from 'aws-lambda';

const mockEvent: Partial<APIGatewayProxyEvent> = {
  httpMethod: 'POST',
  headers: {},
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  })
};

describe('Login Lambda Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 for valid login', async () => {
    const { Pool } = require('pg');
    const mockQuery = jest.fn().mockResolvedValueOnce({
      rows: [{
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'TEACHER',
        school: 'Test School',
        subject: 'Math'
      }]
    });

    Pool.mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue({
        release: jest.fn(),
      }),
      query: mockQuery,
      end: jest.fn(),
    }));

    require('bcryptjs').compare.mockResolvedValue(true);
    require('jsonwebtoken').sign.mockReturnValue('mock-jwt-token');

    const result = await handler(mockEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('user');
    expect(body.user.email).toBe('test@example.com');
  });

  it('should return 401 for invalid email', async () => {
    const { Pool } = require('pg');
    const mockQuery = jest.fn().mockResolvedValueOnce({ rows: [] });

    Pool.mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue({
        release: jest.fn(),
      }),
      query: mockQuery,
      end: jest.fn(),
    }));

    const result = await handler(mockEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('Invalid email or password');
  });

  it('should return 401 for invalid password', async () => {
    const { Pool } = require('pg');
    const mockQuery = jest.fn().mockResolvedValueOnce({
      rows: [{
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'TEACHER'
      }]
    });

    Pool.mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue({
        release: jest.fn(),
      }),
      query: mockQuery,
      end: jest.fn(),
    }));

    require('bcryptjs').compare.mockResolvedValue(false);

    const result = await handler(mockEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('Invalid email or password');
  });

  it('should return 400 for missing email', async () => {
    const invalidEvent = {
      ...mockEvent,
      body: JSON.stringify({ password: 'password123' })
    };

    const result = await handler(invalidEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Email and password are required');
  });

  it('should return 400 for invalid email format', async () => {
    const invalidEvent = {
      ...mockEvent,
      body: JSON.stringify({ email: 'invalid-email', password: 'password123' })
    };

    const result = await handler(invalidEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Invalid email format');
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
