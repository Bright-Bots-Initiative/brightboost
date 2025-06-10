jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      SecretString: JSON.stringify({
        host: 'test-host',
        port: 5432,
        dbname: 'brightboost',
        username: 'postgres',
        password: 'test-password'
      })
    }),
  })),
  GetSecretValueCommand: jest.fn().mockImplementation((params) => params),
}));

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      release: jest.fn(),
    }),
    query: jest.fn().mockResolvedValue({ 
      rows: [{
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'TEACHER',
        school: 'Test School',
        subject: 'Math',
        exists: true
      }],
      rowCount: 1
    }),
    end: jest.fn(),
  })),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({
    id: 1,
    email: 'test@example.com',
    role: 'TEACHER',
    name: 'Test User'
  }),
}));

process.env.DATABASE_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';
