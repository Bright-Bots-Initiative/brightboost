import { describe, it, expect, beforeEach, vi } from 'vitest';

const signupHandler = require('./signup/index.js');

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  }))
}));

vi.mock('bcryptjs', () => ({
  genSalt: vi.fn().mockResolvedValue('salt'),
  hash: vi.fn().mockResolvedValue('hashedPassword')
}));

vi.mock('./shared/auth', () => ({
  generateToken: vi.fn().mockReturnValue('mock-jwt-token')
}));

describe('Signup API', () => {
  let mockContext;

  beforeEach(() => {
    mockContext = {
      res: {},
      log: { error: vi.fn() }
    };
  });

  it('should return 201 for valid signup', async () => {
    const { PrismaClient } = require('@prisma/client');
    const mockPrisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'teacher',
          xp: 0,
          level: null,
          streak: 0
        })
      }
    };
    PrismaClient.mockImplementation(() => mockPrisma);

    const req = {
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'teacher'
      }
    };

    await signupHandler(mockContext, req);
    expect(mockContext.res.status).toBe(201);
    expect(mockContext.res.body.success).toBe(true);
  });

  it('should return 409 for duplicate email', async () => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@example.com' });

    const req = {
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'teacher'
      }
    };

    await signupHandler(mockContext, req);
    expect(mockContext.res.status).toBe(409);
    expect(mockContext.res.body.error).toBe('email_taken');
  });

  it('should return 400 for invalid input', async () => {
    const req = {
      body: {
        name: 'T',
        email: 'invalid-email',
        password: 'short',
        role: 'invalid'
      }
    };

    await signupHandler(mockContext, req);
    expect(mockContext.res.status).toBe(400);
    expect(mockContext.res.body.error).toBe('bad_request');
  });

  it('should return 409 for duplicate email', async () => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@example.com' });

    const req = {
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'teacher'
      }
    };

    await signupHandler(mockContext, req);
    expect(mockContext.res.status).toBe(409);
    expect(mockContext.res.body.error).toBe('email_taken');
  });

  it('should return 400 for invalid input', async () => {
    const req = {
      body: {
        name: 'T',
        email: 'invalid-email',
        password: 'short',
        role: 'invalid'
      }
    };

    await signupHandler(mockContext, req);
    expect(mockContext.res.status).toBe(400);
    expect(mockContext.res.body.error).toBe('bad_request');
  });
});
