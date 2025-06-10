import { handler } from '../gamification';
import { APIGatewayProxyEvent } from 'aws-lambda';

const mockStudentToken = {
  id: 1,
  email: 'student@example.com',
  role: 'STUDENT',
  name: 'Test Student'
};

describe('Gamification Lambda Function', () => {
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

    require('jsonwebtoken').verify.mockReturnValue(mockStudentToken);
  });

  describe('POST /api/gamification/award-xp', () => {
    it('should award XP to student', async () => {
      const awardXpEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/api/gamification/award-xp',
        headers: { Authorization: 'Bearer valid-jwt-token' },
        body: JSON.stringify({
          amount: 50,
          reason: 'Completed quiz'
        })
      };

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ exists: true }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            student_id: 1,
            xp_earned: 50,
            created_at: '2023-01-01T00:00:00Z'
          }]
        });

      require('pg').Pool.mockImplementation(() => ({
        connect: jest.fn(),
        query: mockQuery,
        end: jest.fn(),
      }));

      const result = await handler(awardXpEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('XP awarded successfully');
      expect(body.xpAwarded).toBe(50);
    });

    it('should return 400 for invalid XP amount', async () => {
      const awardXpEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/api/gamification/award-xp',
        headers: { Authorization: 'Bearer valid-jwt-token' },
        body: JSON.stringify({
          amount: -10,
          reason: 'Invalid amount'
        })
      };

      const result = await handler(awardXpEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('XP amount must be a positive number');
    });
  });

  describe('POST /api/student/activities/{id}/complete', () => {
    it('should mark activity as complete', async () => {
      const completeActivityEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/api/student/activities/1/complete',
        pathParameters: { id: '1' },
        headers: { Authorization: 'Bearer valid-jwt-token' },
        body: JSON.stringify({
          xp_earned: 25
        })
      };

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ exists: true }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            student_id: 1,
            lesson_id: 1,
            xp_earned: 25,
            completed_at: '2023-01-01T00:00:00Z'
          }]
        });

      require('pg').Pool.mockImplementation(() => ({
        connect: jest.fn(),
        query: mockQuery,
        end: jest.fn(),
      }));

      const result = await handler(completeActivityEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Activity completed successfully');
      expect(body.progress.xp_earned).toBe(25);
    });

    it('should return 400 for missing activity ID', async () => {
      const completeActivityEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/api/student/activities//complete',
        pathParameters: {},
        headers: { Authorization: 'Bearer valid-jwt-token' },
        body: JSON.stringify({
          xp_earned: 25
        })
      };

      const result = await handler(completeActivityEvent as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Activity ID is required');
    });
  });

  it('should return 403 for non-student role', async () => {
    require('jsonwebtoken').verify.mockReturnValue({
      id: 1,
      email: 'teacher@example.com',
      role: 'TEACHER',
      name: 'Test Teacher'
    });

    const awardXpEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'POST',
      path: '/api/gamification/award-xp',
      headers: { Authorization: 'Bearer valid-jwt-token' },
      body: JSON.stringify({
        amount: 50,
        reason: 'Test'
      })
    };

    const result = await handler(awardXpEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Access denied. Student role required.');
  });

  it('should handle OPTIONS request', async () => {
    const optionsEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'OPTIONS',
      path: '/api/gamification/award-xp'
    };

    const result = await handler(optionsEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('');
  });
});
