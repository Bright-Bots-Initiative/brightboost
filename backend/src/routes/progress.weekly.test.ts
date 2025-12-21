import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';

// Define the mock outside of hoisted if possible, but we need to return it from hoisted.
// Or just define a class inside.

const { mockPrismaClient, mockWeeklySnapshot, MockPrismaClient } = vi.hoisted(() => {
  const mockWeeklySnapshot = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  };

  const mockPrismaClient = {
    weeklySnapshot: mockWeeklySnapshot,
    user: { findUnique: vi.fn() },
    progress: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    module: { findUnique: vi.fn() },
    avatar: { update: vi.fn() },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  // Define a proper class for the mock
  class MockPrismaClient {
    constructor() {
      return mockPrismaClient;
    }
  }

  return { mockPrismaClient, mockWeeklySnapshot, MockPrismaClient };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: MockPrismaClient,
  ProgressStatus: {
      COMPLETED: "COMPLETED",
      IN_PROGRESS: "IN_PROGRESS"
  }
}));

import app from '../server';

describe('GET /progress/weekly', () => {
  const studentId = 'test-student-weekly-1';

  beforeAll(() => {
    // Enable dev role headers for testing auth bypass
    process.env.ALLOW_DEV_ROLE_HEADER = "1";
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a placeholder snapshot if none exists', async () => {
    // Setup findUnique to return null (not found)
    mockWeeklySnapshot.findUnique.mockResolvedValue(null);

    // Setup upsert to return a new snapshot
    const newSnapshot = {
      id: 'snap-placeholder',
      studentId,
      weekId: '2023-40',
      dominantRegime: 'UNKNOWN',
      isPlaceholder: true,
      synthesis: "Snapshot will populate after scans and executions.",
      userMetrics: {},
      systemMetrics: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockWeeklySnapshot.upsert.mockResolvedValue(newSnapshot);

    const response = await request(app)
      .get('/api/progress/weekly')
      .set('x-role', 'student')
      .set('x-user-id', studentId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
        id: 'snap-placeholder',
        isPlaceholder: true
    }));
    expect(mockWeeklySnapshot.findUnique).toHaveBeenCalled();
    expect(mockWeeklySnapshot.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
            studentId_weekId: expect.objectContaining({
                studentId
            })
        }),
        create: expect.objectContaining({
            isPlaceholder: true,
            studentId
        })
    }));
  });

  it('returns existing snapshot if found (idempotent)', async () => {
    // Setup findUnique to return existing
    const existingSnapshot = {
      id: 'snap-existing',
      studentId,
      weekId: '2023-39',
      dominantRegime: 'BIOTECH',
      isPlaceholder: false,
      userMetrics: {},
      systemMetrics: {},
    };
    mockWeeklySnapshot.findUnique.mockResolvedValue(existingSnapshot);

    const response = await request(app)
      .get('/api/progress/weekly')
      .set('x-role', 'student')
      .set('x-user-id', studentId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(existingSnapshot);
    expect(mockWeeklySnapshot.findUnique).toHaveBeenCalled();
    // Should NOT call upsert if found
    expect(mockWeeklySnapshot.upsert).not.toHaveBeenCalled();
  });

  it('handles DB errors gracefully with 503', async () => {
    mockWeeklySnapshot.findUnique.mockRejectedValue(new Error("DB connection failed"));

    const response = await request(app)
      .get('/api/progress/weekly')
      .set('x-role', 'student')
      .set('x-user-id', studentId);

    expect(response.status).toBe(503);
    expect(response.body.error).toBe("Service unavailable");
  });
});
