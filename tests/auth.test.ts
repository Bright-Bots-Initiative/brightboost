import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { setupTestDatabase, teardownTestDatabase, prisma } from './utils/database';

const app = require('../server.cjs');

describe('Authentication Endpoints', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /auth/signup', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'student'
      };

      const response = await request(app)
        .post('/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        name: userData.name,
        email: userData.email,
        role: userData.role,
        xp: 0
      });

      const createdUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      expect(createdUser).not.toBeNull();
      expect(createdUser?.name).toBe(userData.name);
    });

    it('should reject duplicate email', async () => {
      await prisma.user.create({
        data: {
          name: 'Existing User',
          email: 'existing@example.com',
          password: await bcrypt.hash('password', 10),
          role: 'student'
        }
      });

      const response = await request(app)
        .post('/auth/signup')
        .send({
          name: 'Test User',
          email: 'existing@example.com',
          password: 'password123',
          role: 'student'
        })
        .expect(400);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('should login existing user successfully', async () => {
      await prisma.user.create({
        data: {
          name: 'Login Test',
          email: 'login@example.com',
          password: await bcrypt.hash('password123', 10),
          role: 'teacher'
        }
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('login@example.com');
      expect(response.body.user.role).toBe('teacher');
    });

    it('should reject invalid credentials', async () => {
      await prisma.user.create({
        data: {
          name: 'Wrong Password',
          email: 'wrong@example.com',
          password: await bcrypt.hash('correctpassword', 10),
          role: 'student'
        }
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

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
