import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestDatabase, teardownTestDatabase, createTestUser, createTestLesson, prisma } from './utils/database';

const app = require('../server.cjs');

describe('Teacher Dashboard Endpoints', () => {
  let teacherToken: string;
  let teacher: any;

  beforeEach(async () => {
    await setupTestDatabase();
    teacher = await createTestUser('teacher');
    teacherToken = jwt.sign(
      { id: teacher.id, email: teacher.email, role: teacher.role },
      process.env.JWT_SECRET || 'test-secret-key'
    );
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/teacher/dashboard', () => {
    it('should return teacher dashboard data', async () => {
      const lesson = await createTestLesson(teacher.id);

      const response = await request(app)
        .get('/api/teacher/dashboard')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('lessons');
      expect(response.body.lessons).toHaveLength(1);
      expect(response.body.lessons[0]).toMatchObject({
        title: lesson.title,
        category: lesson.category
      });
    });

    it('should reject non-teacher access', async () => {
      const student = await createTestUser('student');
      const studentToken = jwt.sign(
        { id: student.id, email: student.email, role: student.role },
        process.env.JWT_SECRET || 'test-secret-key'
      );

      await request(app)
        .get('/api/teacher/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should return empty lessons array when no lessons exist', async () => {
      const response = await request(app)
        .get('/api/teacher/dashboard')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('lessons');
      expect(response.body.lessons).toHaveLength(0);
    });
  });

  describe('GET /api/profile', () => {
    it('should return teacher profile data', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: 'teacher'
      });
    });
  });
});
