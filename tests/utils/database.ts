import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_URL || 'postgresql://test_user:test_password@localhost:5433/brightboost_test'
    }
  }
});

export const setupTestDatabase = async () => {
  await prisma.badge.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
};

export const teardownTestDatabase = async () => {
  await setupTestDatabase();
  await prisma.$disconnect();
};

export const createTestUser = async (role: 'teacher' | 'student', overrides = {}) => {
  return await prisma.user.create({
    data: {
      name: `Test ${role}`,
      email: `test-${role}@example.com`,
      password: '$2a$10$hashedpassword', // bcrypt hash for 'password'
      role,
      xp: 0,
      level: 'Explorer',
      streak: 0,
      ...overrides
    }
  });
};

export const createTestLesson = async (teacherId: string, overrides = {}) => {
  return await prisma.lesson.create({
    data: {
      title: 'Test Lesson',
      content: 'Test lesson content',
      category: 'Math',
      date: new Date().toISOString(),
      status: 'Published',
      teacherId,
      ...overrides
    }
  });
};

export { prisma };
