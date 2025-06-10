import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

describe('Login Lambda Function - Simple Tests', () => {
  it('should handle OPTIONS request without database connection', async () => {
    const { handler } = await import('../login');
    
    const optionsEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'OPTIONS',
      headers: {},
      body: null
    };

    const result: APIGatewayProxyResult = await handler(optionsEvent as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('');
    expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
  });

  it('should return 400 for missing request body', async () => {
    const { handler } = await import('../login');
    
    const event: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'POST',
      headers: {},
      body: null
    };

    const result: APIGatewayProxyResult = await handler(event as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Request body is required');
  });

  it('should return 400 for missing email', async () => {
    const { handler } = await import('../login');
    
    const event: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({ password: 'password123' })
    };

    const result: APIGatewayProxyResult = await handler(event as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Email and password are required');
  });

  it('should return 400 for invalid email format', async () => {
    const { handler } = await import('../login');
    
    const event: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({ 
        email: 'invalid-email', 
        password: 'password123' 
      })
    };

    const result: APIGatewayProxyResult = await handler(event as APIGatewayProxyEvent);
    
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Invalid email format');
  });
});
