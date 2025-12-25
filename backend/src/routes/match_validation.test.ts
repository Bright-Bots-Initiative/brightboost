import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import matchRouter from './match';
import { PrismaClient } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  avatar: { findUnique: vi.fn() },
  match: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
}));

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn(() => prismaMock),
    MatchStatus: { PENDING: 'PENDING', ACTIVE: 'ACTIVE' },
  };
});

vi.mock('../utils/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'student-123', role: 'student' };
    next();
  },
  devRoleShim: (req: any, res: any, next: any) => next(),
}));

// Mock services
vi.mock('../services/game', () => ({
  resolveTurn: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api', matchRouter);

describe('POST /api/match/queue validation', () => {
  // Use the mocked prisma instance directly in tests
  const prisma = new PrismaClient() as any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Default mock implementation for avatar
    prisma.avatar.findUnique.mockResolvedValue({
      id: 'avatar-123',
      studentId: 'student-123',
    });
  });

  it('should accept valid band "K2"', async () => {
    prisma.match.findFirst.mockResolvedValue(null);
    prisma.match.create.mockResolvedValue({ id: 'match-123', status: 'PENDING' });

    const res = await request(app)
      .post('/api/match/queue')
      .send({ band: 'K2' });

    expect(res.status).toBe(200);
    expect(prisma.match.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ band: 'K2' })
    }));
  });

  it('should accept valid band "G35"', async () => {
    prisma.match.findFirst.mockResolvedValue(null);
    prisma.match.create.mockResolvedValue({ id: 'match-123', status: 'PENDING' });

    const res = await request(app)
      .post('/api/match/queue')
      .send({ band: 'G35' });

    expect(res.status).toBe(200);
    expect(prisma.match.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ band: 'G35' })
    }));
  });

  it('should reject invalid band', async () => {
    const res = await request(app)
      .post('/api/match/queue')
      .send({ band: 'INVALID_BAND' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid band');
    // Should not call database
    expect(prisma.avatar.findUnique).not.toHaveBeenCalled();
  });

  it('should allow missing band (defaults to K2)', async () => {
    prisma.match.findFirst.mockResolvedValue(null);
    prisma.match.create.mockResolvedValue({ id: 'match-123', status: 'PENDING' });

    const res = await request(app)
      .post('/api/match/queue')
      .send({}); // No band

    expect(res.status).toBe(200);
    expect(prisma.match.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ band: 'K2' })
    }));
  });
});
