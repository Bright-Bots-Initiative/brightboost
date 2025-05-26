import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestDatabase, teardownTestDatabase, createTestUser, createTestLesson, prisma } from './utils/database';

const app = require('../server.cjs');

describe('Lesson CRUD Endpoints', () => {
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

  describe('POST /api/lessons', () => {
    it('should create a new lesson', async () => {
      const lessonData = {
        title: 'New Test Lesson',
        content: 'Test content',
        category: 'Science',
        date: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(lessonData)
        .expect(201);

      expect(response.body).toMatchObject({
        title: lessonData.title,
        content: lessonData.content,
        category: lessonData.category,
        status: 'Draft',
        teacherId: teacher.id
      });

      const createdLesson = await prisma.lesson.findUnique({
        where: { id: response.body.id }
      });
      expect(createdLesson).not.toBeNull();
      expect(createdLesson?.title).toBe(lessonData.title);
    });

    it('should reject lesson creation by student', async () => {
      const student = await createTestUser('student');
      const studentToken = jwt.sign(
        { id: student.id, email: student.email, role: student.role },
        process.env.JWT_SECRET || 'test-secret-key'
      );

      await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Student Lesson',
          content: 'This should fail',
          category: 'Test'
        })
        .expect(403);
    });
  });

  describe('PUT /api/lessons/:id', () => {
    it('should update an existing lesson', async () => {
      const lesson = await createTestLesson(teacher.id);
      const updateData = { title: 'Updated Title' };

      const response = await request(app)
        .put(`/api/lessons/${lesson.id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);

      const updatedLesson = await prisma.lesson.findUnique({
        where: { id: lesson.id }
      });
      expect(updatedLesson?.title).toBe(updateData.title);
    });

    it('should return 404 for non-existent lesson', async () => {
      await request(app)
        .put('/api/lessons/nonexistent-id')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ title: 'Updated Title' })
        .expect(404);
    });
  });

  describe('DELETE /api/lessons/:id', () => {
    it('should delete a lesson', async () => {
      const lesson = await createTestLesson(teacher.id);

      await request(app)
        .delete(`/api/lessons/${lesson.id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(204);

      const deletedLesson = await prisma.lesson.findUnique({
        where: { id: lesson.id }
      });
      expect(deletedLesson).toBeNull();
    });

    it('should return 404 for non-existent lesson', async () => {
      await request(app)
        .delete('/api/lessons/nonexistent-id')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(404);
    });
  });
});
