import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { setupTestDatabase, teardownTestDatabase, cleanupTestDatabase, prisma, createTestUser } from './utils/database';
import { TestExpressApp, UserData } from './types';
import app from '../server.cjs';

process.env.NODE_ENV = 'test';

describe('Authentication Endpoints', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    console.log('Test database setup complete for auth tests');
  });

  afterEach(async () => {
    await cleanupTestDatabase(); // Clean database after each test
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
    console.log('Test database teardown complete for auth tests');
  });

  describe('POST /auth/signup', () => {
    it('should create a new user successfully', async () => {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const uniqueEmail = `test-signup-${timestamp}-${randomSuffix}@example.com`;
      
      const userData = {
        name: 'Test User',
        email: uniqueEmail,
        password: 'password123',
        role: 'student'
      };

      console.log('Attempting to create user with email:', uniqueEmail);

      const response = await request(app)
        .post('/auth/signup')
        .send(userData)
        .expect(201);

      console.log('Signup response status:', response.status);
      
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        name: userData.name,
        email: userData.email,
        role: userData.role,
        xp: 0
      });

      const userId = response.body.user.id;
      console.log('User ID from response:', userId);
      
      const createdUser = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      console.log('Created user in database:', createdUser?.id);
      
      expect(createdUser).not.toBeNull();
      if (createdUser) {
        expect(createdUser.name).toBe(userData.name);
      }
    });

    it('should reject duplicate email', async () => {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const uniqueEmail = `test-duplicate-${timestamp}-${randomSuffix}@example.com`;
      
      console.log('Creating first user with email:', uniqueEmail);
      
      const existingUser = await createTestUser('student', {
        name: 'Existing User',
        email: uniqueEmail,
        password: 'password123'
      });
      
      console.log('Created first user:', existingUser.id);
      
      const dbUser = await prisma.user.findUnique({
        where: { id: existingUser.id }
      });
      
      if (!dbUser) {
        throw new Error(`User not found in database after creation: ${existingUser.id}`);
      }
      
      console.log('First user verified in database:', dbUser.id);
      
      const response = await request(app)
        .post('/auth/signup')
        .send({
          name: 'Test User',
          email: uniqueEmail,
          password: 'password123',
          role: 'student'
        })
        .expect(400);

      console.log('Duplicate email response status:', response.status);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('should login existing user successfully', async () => {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const email = `login-test-${timestamp}-${randomSuffix}@example.com`;
      const password = 'password123';
      
      const testUser = await createTestUser('teacher', {
        name: 'Login Test',
        email: email,
        password: password
      });
      
      console.log('Created test user for login test:', testUser.id, 'with email:', email);
      
      const dbUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      
      if (!dbUser) {
        throw new Error(`User not found in database after creation: ${testUser.id}`);
      }
      
      console.log('User verified in database:', dbUser.id);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: email,
          password: password
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(email);
      expect(response.body.user.role).toBe('teacher');
    });

    it('should reject invalid credentials', async () => {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const uniqueEmail = `test-wrong-password-${timestamp}-${randomSuffix}@example.com`;
      
      console.log('Creating user for invalid credentials test with email:', uniqueEmail);
      
      const testUser = await createTestUser('student', {
        name: 'Wrong Password Test',
        email: uniqueEmail,
        password: 'correctpassword'
      });
      
      console.log('Created user for invalid credentials test:', testUser.id);
      
      const dbUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      
      if (!dbUser) {
        throw new Error(`User not found in database after creation: ${testUser.id}`);
      }
      
      console.log('User verified in database:', dbUser.id);
      
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'wrongpassword'
        })
        .expect(401);

      console.log('Invalid credentials response status:', response.status);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword'
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid credentials');
    });
  });
});
