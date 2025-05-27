import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestDatabase, teardownTestDatabase, cleanupTestDatabase, createTestUser, createTestLesson, prisma } from './utils/database';
import { TestExpressApp, LessonData } from './types';
import app from '../server.cjs';

describe('Lesson CRUD Endpoints', () => {
  let teacherToken: string;
  let teacher: { id: string; email: string; name: string; role: string; xp: number; level: number; streak: number };

  beforeEach(async () => {
    await setupTestDatabase();
    
    // Generate unique teacher for each test
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000000);
    const email = `test-teacher-${timestamp}-${randomSuffix}@example.com`;
    
    teacher = await createTestUser('teacher', {
      name: `Lesson Test Teacher ${timestamp}`,
      email: email,
      password: 'password123'
    });
    
    const verifiedTeacher = await prisma.user.findUnique({
      where: { id: teacher.id }
    });
    
    if (!verifiedTeacher) {
      console.error('Failed to find teacher after creation:', teacher.id);
      throw new Error('Failed to create teacher user for test');
    }
    
    console.log('Test teacher created and verified:', verifiedTeacher.id);
    
    teacherToken = jwt.sign(
      { 
        id: verifiedTeacher.id, 
        email: verifiedTeacher.email, 
        role: verifiedTeacher.role, 
        xp: verifiedTeacher.xp || 0, 
        level: verifiedTeacher.level || 1,
        streak: verifiedTeacher.streak || 0
      },
      process.env.JWT_SECRET || 'test-secret-key'
    );
    
    console.log('Generated token for teacher:', verifiedTeacher.id);
  });

  afterEach(async () => {
    await cleanupTestDatabase(); // Clean database after each test
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/lessons', () => {
    it('should create a new lesson', async () => {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const email = `test-teacher-create-${timestamp}-${randomSuffix}@example.com`;
      
      const createTestTeacher = await createTestUser('teacher', {
        name: `Create Test Teacher ${timestamp}`,
        email: email,
        password: 'password123'
      });
      
      console.log('Created dedicated teacher for create lesson test:', createTestTeacher.id);
      
      const verifiedTeacher = await prisma.user.findUnique({
        where: { id: createTestTeacher.id }
      });
      
      if (!verifiedTeacher) {
        console.error('Teacher not found after creation for create lesson test:', createTestTeacher.id);
        throw new Error(`Teacher ${createTestTeacher.id} not found in database. Test isolation may be broken.`);
      }
      
      console.log('Teacher verified in database for create lesson test:', verifiedTeacher.id);
      
      // Generate token for this specific test teacher
      const createTestToken = jwt.sign(
        { 
          id: verifiedTeacher.id, 
          email: verifiedTeacher.email, 
          role: verifiedTeacher.role, 
          xp: verifiedTeacher.xp || 0, 
          level: verifiedTeacher.level || 1,
          streak: verifiedTeacher.streak || 0
        },
        process.env.JWT_SECRET || 'test-secret-key'
      );
      
      const lessonData = {
        title: 'New Test Lesson',
        content: 'Test content',
        category: 'Science',
        date: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${createTestToken}`)
        .send(lessonData)
        .expect(201);

      console.log('Create lesson response:', response.body);

      expect(response.body).toMatchObject({
        title: lessonData.title,
        content: lessonData.content,
        category: lessonData.category,
        status: 'Draft',
        teacherId: createTestTeacher.id
      });

      const createdLesson = await prisma.lesson.findUnique({
        where: { id: response.body.id }
      });
      
      console.log('Created lesson in database:', createdLesson?.id, createdLesson?.title);
      
      expect(createdLesson).not.toBeNull();
      expect(createdLesson?.title).toBe(lessonData.title);
    });

    it('should reject lesson creation by student', async () => {
      const student = await createTestUser('student');
      const studentToken = jwt.sign(
        { id: student.id, email: student.email, role: student.role, xp: student.xp, level: student.level },
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
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const email = `test-teacher-update-${timestamp}-${randomSuffix}@example.com`;
      
      const updateTestTeacher = await createTestUser('teacher', {
        name: `Update Test Teacher ${timestamp}`,
        email: email,
        password: 'password123'
      });
      
      console.log('Created dedicated teacher for update test:', updateTestTeacher.id);
      
      const verifiedTeacher = await prisma.user.findUnique({
        where: { id: updateTestTeacher.id }
      });
      
      if (!verifiedTeacher) {
        console.error('Teacher not found after creation for update test:', updateTestTeacher.id);
        throw new Error(`Teacher ${updateTestTeacher.id} not found in database. Test isolation may be broken.`);
      }
      
      console.log('Teacher verified in database for update test:', verifiedTeacher.id);
      
      // Generate token for this specific test teacher
      const updateTestToken = jwt.sign(
        { 
          id: verifiedTeacher.id, 
          email: verifiedTeacher.email, 
          role: verifiedTeacher.role, 
          xp: verifiedTeacher.xp || 0, 
          level: verifiedTeacher.level || 1,
          streak: verifiedTeacher.streak || 0
        },
        process.env.JWT_SECRET || 'test-secret-key'
      );
      
      const lesson = await createTestLesson(updateTestTeacher.id);
      console.log('Created test lesson for update test:', lesson.id);
      
      const dbLesson = await prisma.lesson.findUnique({
        where: { id: lesson.id }
      });
      
      if (!dbLesson) {
        throw new Error(`Lesson not found in database: ${lesson.id}`);
      }
      
      console.log('Lesson verified in database:', dbLesson.id);
      
      const updateData = { title: 'Updated Title' };

      const response = await request(app)
        .put(`/api/lessons/${lesson.id}`)
        .set('Authorization', `Bearer ${updateTestToken}`)
        .send(updateData)
        .expect(200);

      console.log('Update lesson response status:', response.status);
      
      expect(response.body.title).toBe(updateData.title);

      const updatedLesson = await prisma.lesson.findUnique({
        where: { id: lesson.id }
      });
      
      console.log('Updated lesson in database:', updatedLesson?.id, updatedLesson?.title);
      
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
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const email = `test-teacher-delete-${timestamp}-${randomSuffix}@example.com`;
      
      const deleteTestTeacher = await createTestUser('teacher', {
        name: `Delete Test Teacher ${timestamp}`,
        email: email,
        password: 'password123'
      });
      
      console.log('Created dedicated teacher for delete test:', deleteTestTeacher.id);
      
      const verifiedTeacher = await prisma.user.findUnique({
        where: { id: deleteTestTeacher.id }
      });
      
      if (!verifiedTeacher) {
        console.error('Teacher not found after creation for delete test:', deleteTestTeacher.id);
        throw new Error(`Teacher ${deleteTestTeacher.id} not found in database. Test isolation may be broken.`);
      }
      
      console.log('Teacher verified in database for delete test:', verifiedTeacher.id);
      
      // Generate token for this specific test teacher
      const deleteTestToken = jwt.sign(
        { 
          id: verifiedTeacher.id, 
          email: verifiedTeacher.email, 
          role: verifiedTeacher.role, 
          xp: verifiedTeacher.xp || 0, 
          level: verifiedTeacher.level || 1,
          streak: verifiedTeacher.streak || 0
        },
        process.env.JWT_SECRET || 'test-secret-key'
      );
      
      const lesson = await createTestLesson(deleteTestTeacher.id);
      console.log('Created test lesson for delete test:', lesson.id);
      
      const dbLesson = await prisma.lesson.findUnique({
        where: { id: lesson.id }
      });
      
      if (!dbLesson) {
        throw new Error(`Lesson not found in database after creation: ${lesson.id}`);
      }
      
      console.log('Lesson verified in database:', dbLesson.id);
      
      await request(app)
        .delete(`/api/lessons/${lesson.id}`)
        .set('Authorization', `Bearer ${deleteTestToken}`)
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
