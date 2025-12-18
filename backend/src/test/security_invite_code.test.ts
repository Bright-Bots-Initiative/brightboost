
import { describe, it, expect, vi } from 'vitest';
import { createClass } from '../services/classes';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mPrisma = {
    class: {
      create: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(() => mPrisma) };
});

describe('Class Service - Security', () => {
  it('should generate an invite code of length 6', async () => {
    // We need to inspect the data passed to prisma.class.create
    // to check the generated invite code.
    const prisma = new PrismaClient();

    // Setup create to return a dummy object
    (prisma.class.create as any).mockResolvedValue({
      id: "class-123",
      teacherId: "teacher-1",
      name: "Security 101",
      inviteCode: "ABCDEF",
      createdAt: new Date(),
      isArchived: false
    });

    await createClass("teacher-1", "Security 101");

    const createCall = (prisma.class.create as any).mock.calls[0][0];
    const generatedInviteCode = createCall.data.inviteCode;

    expect(generatedInviteCode).toBeDefined();
    expect(generatedInviteCode).toHaveLength(6);
    // Ensure it's uppercase and alphanumeric
    expect(generatedInviteCode).toMatch(/^[A-Z0-9]{6}$/);
  });
});
