import bcrypt from 'bcryptjs';
import { UserOverrides, LessonOverrides, BadgeOverrides } from '../types';

import prismaClient from '../../prisma/client.cjs';

const prisma = prismaClient;

/**
 * Cleans up the test database by deleting all records in the correct order.
 * 
 * This function ensures that child records are deleted before parent records
 * to avoid foreign key constraint violations. It handles many-to-many relationships
 * by disconnecting them before deletion.
 * 
 * Uses a transaction for atomic operations to ensure database integrity.
 */
export const cleanupTestDatabase = async (): Promise<void> => {
  try {
    console.log('Starting database cleanup...');
    
    // Step 1: Disconnect many-to-many relationships first
    try {
      console.log('Disconnecting many-to-many relationships...');
      
      // Find all user-badge relationships
      const userBadges = await prisma.user.findMany({
        select: { id: true, badges: { select: { id: true } } },
        where: { badges: { some: {} } }
      });
      
      // Use a transaction for all disconnects to ensure atomicity
      if (userBadges.length > 0) {
        await prisma.$transaction(
          userBadges.map(user => 
            prisma.user.update({
              where: { id: user.id },
              data: {
                badges: {
                  disconnect: user.badges
                }
              }
            })
          )
        );
        console.log(`Disconnected badge relationships for ${userBadges.length} users`);
      }
      
      const enrollments = await prisma.enrollment.findMany({
        take: 1
      });
      
      if (enrollments.length > 0) {
        console.log('Cleaning up enrollment relationships...');
        await prisma.enrollment.deleteMany();
      }
      
    } catch (error: unknown) {
      console.error('Error disconnecting relationships:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Step 2: Delete all records in a single transaction to ensure atomicity
    try {
      await prisma.$transaction([
        prisma.activity.deleteMany(),
        
        prisma.assignment.deleteMany(),
        
        prisma.lesson.deleteMany(),
        
        prisma.course.deleteMany(),
        
        // Fifth level: Records that might be referenced by many-to-many relationships
        prisma.badge.deleteMany(),
        
        prisma.user.deleteMany()
      ]);
      
      console.log('Test database cleanup complete - all records deleted in transaction');
    } catch (error: unknown) {
      console.error('Transaction error during cleanup:', error instanceof Error ? error.message : 'Unknown error');
      
      console.log('Attempting individual deletions in correct order...');
      
      try {
        await prisma.activity.deleteMany();
        console.log('Deleted activities');
        
        await prisma.assignment.deleteMany();
        console.log('Deleted assignments');
        
        await prisma.enrollment.deleteMany();
        console.log('Deleted enrollments');
        
        await prisma.lesson.deleteMany();
        console.log('Deleted lessons');
        
        await prisma.course.deleteMany();
        console.log('Deleted courses');
        
        await prisma.badge.deleteMany();
        console.log('Deleted badges');
        
        await prisma.user.deleteMany();
        console.log('Deleted users');
        
        console.log('Individual deletions completed successfully');
      } catch (individualError: unknown) {
        console.error('Error during individual deletions:', individualError instanceof Error ? individualError.message : 'Unknown error');
        throw individualError;
      }
    }
  } catch (error: unknown) {
    console.error('Error in cleanupTestDatabase:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

/**
 * Sets up a clean test database by calling cleanupTestDatabase.
 * This function is used in beforeEach hooks to ensure a clean state.
 */
export const setupTestDatabase = async (): Promise<void> => {
  await cleanupTestDatabase();
};

/**
 * Tears down the test database by cleaning up all records and disconnecting Prisma.
 * This function is used in afterAll hooks to ensure proper cleanup after tests.
 */
export const teardownTestDatabase = async (): Promise<void> => {
  await cleanupTestDatabase();
  await prisma.$disconnect();
};

/**
 * Creates a test user with proper error handling and verification.
 * 
 * This function ensures:
 * 1. Unique IDs and emails to prevent conflicts in parallel tests
 * 2. Proper password hashing
 * 3. Verification that the user was actually created
 * 4. Consistent default values for gamification fields
 * 
 * @param role - Role of the user ('teacher' or 'student')
 * @param overrides - Optional overrides for user properties
 * @returns The created user object with all fields
 */
export const createTestUser = async (role: 'teacher' | 'student', overrides: UserOverrides = {}): Promise<{
  id: string;
  name: string;
  email: string;
  role: string;
  xp: number;
  level: number;
  streak: number;
  password?: string;
}> => {
  try {
    // Generate unique identifiers for this test run
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000000);
    const email = overrides.email || `test-${role}-${timestamp}-${randomSuffix}@example.com`;
    const hashedPassword = await bcrypt.hash(overrides.password || 'password123', 10);
    
    console.log(`Creating test ${role} with email: ${email}`);
    
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: overrides.name || `Test ${role} ${timestamp}`,
          email: email,
          password: hashedPassword,
          role,
          xp: overrides.xp !== undefined ? overrides.xp : 0,
          level: overrides.level !== undefined ? overrides.level : 1,
          streak: overrides.streak !== undefined ? overrides.streak : 0
        }
      });
      
      const verifiedUser = await tx.user.findUnique({
        where: { id: newUser.id }
      });
      
      if (!verifiedUser) {
        throw new Error(`Failed to verify user creation within transaction: ${newUser.id}`);
      }
      
      return newUser;
    });
    
    console.log(`Successfully created test ${role} with ID: ${user.id}, email: ${user.email}`);
    
    // Return user data with unhashed password for token generation
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      xp: user.xp || 0,
      level: user.level || 1,
      streak: user.streak || 0,
      password: overrides.password || 'password123'
    };
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code?: string; meta?: { target?: string[] } };
      
      if (prismaError.code === 'P2002' && prismaError.meta?.target?.includes('email')) {
        const newTimestamp = Date.now();
        const newRandomSuffix = Math.floor(Math.random() * 1000000);
        const newEmail = `test-${role}-${newTimestamp}-${newRandomSuffix}@example.com`;
        
        console.log(`Email conflict, retrying with new email: ${newEmail}`);
        
        return createTestUser(role, { ...overrides, email: newEmail });
      }
    }
    
    console.error('Error creating test user:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

export interface TestLesson {
  id: string;
  title: string;
  content: string | null;
  category: string;
  date: string;
  status: string;
  teacherId: string;
}

/**
 * Creates a test lesson with proper foreign key handling.
 * 
 * This function ensures that:
 * 1. The teacher exists before creating the lesson (parent record first)
 * 2. Unique IDs are generated to avoid conflicts
 * 3. Error handling for concurrent test execution
 * 4. Proper verification of created records
 * 
 * @param teacherId - ID of the teacher who owns the lesson
 * @param overrides - Optional overrides for lesson properties
 * @returns The created lesson object
 */
export const createTestLesson = async (teacherId: string, overrides: LessonOverrides = {}): Promise<TestLesson> => {
  try {
    const teacherExists = await prisma.user.findUnique({
      where: { id: teacherId }
    });
    
    if (!teacherExists) {
      console.error(`Teacher not found: ${teacherId}`);
      throw new Error(`Teacher with ID ${teacherId} not found. Cannot create lesson without valid teacher.`);
    }
    
    if (teacherExists.role !== 'teacher') {
      console.error(`User ${teacherId} exists but is not a teacher (role: ${teacherExists.role})`);
      throw new Error(`User with ID ${teacherId} is not a teacher. Cannot create lesson for non-teacher user.`);
    }
    
    console.log(`Verified teacher exists with ID: ${teacherExists.id}, role: ${teacherExists.role}`);
    
    // Generate unique identifiers for this test run
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    const title = overrides.title || `Test Lesson ${timestamp}-${randomSuffix}`;
    
    // Create the lesson in a transaction to ensure atomicity
    const lesson = await prisma.$transaction(async (tx) => {
      const teacher = await tx.user.findUnique({
        where: { id: teacherId }
      });
      
      if (!teacher) {
        console.error(`Teacher disappeared within transaction: ${teacherId}`);
        throw new Error(`Teacher with ID ${teacherId} not found within transaction. Test isolation may be broken.`);
      }
      
      console.log(`Creating test lesson "${title}" for teacher: ${teacher.id}`);
      
      try {
        const newLesson = await tx.lesson.create({
          data: {
            title: title,
            content: overrides.content || `Test lesson content ${timestamp}-${randomSuffix}`,
            category: overrides.category || 'Math',
            date: overrides.date || new Date().toISOString(),
            status: overrides.status || 'Published',
            teacherId: teacher.id
          }
        });
        
        console.log(`Created lesson in transaction: ${newLesson.id}`);
        
        const verifiedLesson = await tx.lesson.findUnique({
          where: { id: newLesson.id },
          include: { teacher: true }
        });
        
        if (!verifiedLesson) {
          throw new Error(`Failed to verify lesson creation: ${newLesson.id}`);
        }
        
        console.log(`Successfully created and verified test lesson with ID: ${newLesson.id}, teacherId: ${newLesson.teacherId}`);
        
        return verifiedLesson;
      } catch (txError) {
        console.error(`Transaction error creating lesson: ${txError instanceof Error ? txError.message : 'Unknown error'}`);
        throw txError;
      }
    });
    
    return {
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      category: lesson.category,
      date: lesson.date,
      status: lesson.status,
      teacherId: lesson.teacherId
    };
  } catch (error: unknown) {
    console.error('Error creating test lesson:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

/**
 * Creates a test badge for gamification testing.
 * 
 * @param name - Name of the badge
 * @returns The created badge object
 */
export const createTestBadge = async (name: string): Promise<{
  id: string;
  name: string;
}> => {
  try {
    return await prisma.$transaction(async (tx) => {
      // Generate unique badge name with timestamp to prevent conflicts
      const timestamp = Date.now();
      const badgeName = name || `Test Badge ${timestamp}`;
      
      console.log(`Creating test badge: ${badgeName}`);
      
      const newBadge = await tx.badge.create({
        data: {
          name: badgeName
        }
      });
      
      const verifiedBadge = await tx.badge.findUnique({
        where: { id: newBadge.id }
      });
      
      if (!verifiedBadge) {
        throw new Error(`Failed to verify badge creation: ${newBadge.id}`);
      }
      
      console.log(`Successfully created test badge with ID: ${newBadge.id}, name: ${newBadge.name}`);
      
      return newBadge;
    });
  } catch (error: unknown) {
    console.error('Error creating test badge:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

export { prisma };
