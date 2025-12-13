
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { listClasses } from './classes';
import { PrismaClient } from '@prisma/client';

// Mock the Prisma client
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    class: {
      findMany: vi.fn(),
    },
    enrollment: {
      groupBy: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(() => mockPrisma) };
});

describe('listClasses', () => {
  let prisma: any;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should return classes with enrollment counts (optimized implementation)', async () => {
    const teacherId = 'teacher-1';
    const classesFromDb = [
      {
        id: 'class-1',
        name: 'Class 1',
        teacherId,
        createdAt: new Date(),
        _count: { Enrollments: 5 }
      },
      {
        id: 'class-2',
        name: 'Class 2',
        teacherId,
        createdAt: new Date(),
        _count: { Enrollments: 3 }
      },
    ];

    prisma.class.findMany.mockResolvedValue(classesFromDb);

    const result = await listClasses(teacherId);

    expect(prisma.class.findMany).toHaveBeenCalledWith({
      where: { teacherId, isArchived: false },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { Enrollments: true },
        },
      },
    });

    // Verify that the second query is NOT called
    expect(prisma.enrollment.groupBy).not.toHaveBeenCalled();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'class-1',
      enrollmentCount: 5
    });
    expect(result[1]).toMatchObject({
      id: 'class-2',
      enrollmentCount: 3
    });

    // Verify _count property is removed from the result
    expect(result[0]).not.toHaveProperty('_count');
  });

  it('should handle classes with no enrollments', async () => {
     const teacherId = 'teacher-1';
    const classesFromDb = [
      {
        id: 'class-3',
        name: 'Class 3',
        teacherId,
        createdAt: new Date(),
        _count: { Enrollments: 0 }
      },
    ];

    prisma.class.findMany.mockResolvedValue(classesFromDb);

    const result = await listClasses(teacherId);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'class-3',
      enrollmentCount: 0
    });
  })
});
