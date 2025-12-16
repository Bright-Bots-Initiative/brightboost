
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { createClass } from './classes';
import { PrismaClient } from '@prisma/client';

// Mock the Prisma client
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    class: {
      create: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(() => mockPrisma) };
});

describe('createClass security', () => {
  let prisma: any;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should generate an invite code using a secure random generator', async () => {
    // Spy on Math.random to verify it is NOT used (after the fix)
    const mathRandomSpy = vi.spyOn(Math, 'random');

    prisma.class.create.mockResolvedValue({
      id: 'class-1',
      name: 'Test Class',
      teacherId: 'teacher-1',
      inviteCode: 'ABC1234',
    });

    await createClass('teacher-1', 'Test Class');

    // This assertions confirms the VULNERABILITY IS FIXED
    expect(mathRandomSpy).not.toHaveBeenCalled();

    expect(prisma.class.create).toHaveBeenCalled();
    const createCall = prisma.class.create.mock.calls[0][0];
    expect(createCall.data.inviteCode).toBeDefined();

    // Cleanup
    mathRandomSpy.mockRestore();
  });
});
