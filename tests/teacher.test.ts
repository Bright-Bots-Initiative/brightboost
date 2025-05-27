import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestDatabase, teardownTestDatabase, cleanupTestDatabase, createTestUser, createTestLesson, prisma } from './utils/database';
import { TestExpressApp, UserData } from './types';
import app from '../server.cjs';

process.env.NODE_ENV = 'test';

describe('Teacher Dashboard Endpoints', () => {
  let teacherToken: string;
  let teacher: { id: string; email: string; name: string; role: string; xp: number; level: number; streak: number };

  beforeEach(async () => {
    await setupTestDatabase();
    
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000000);
    const email = `test-teacher-${timestamp}-${randomSuffix}@example.com`;
    
    teacher = await createTestUser('teacher', {
      email: email,
      password: 'password123'
    });
    
    console.log('Created test teacher with ID:', teacher.id, 'with email:', email);
    
    const verifiedTeacher = await prisma.user.findUnique({
      where: { id: teacher.id }
    });
    
    if (!verifiedTeacher) {
      console.error('Failed to find teacher after creation:', teacher.id);
      throw new Error('Failed to create teacher user for test');
    }
    
    console.log('Test teacher verified in database:', verifiedTeacher.id);
    
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

  describe('GET /api/teacher/dashboard', () => {
    it('should return teacher dashboard data', async () => {
      const dbTeacher = await prisma.user.findUnique({
        where: { id: teacher.id }
      });
      
      if (!dbTeacher) {
        console.error('Teacher not found before lesson creation:', teacher.id);
        throw new Error(`Teacher ${teacher.id} not found in database. Test isolation may be broken.`);
      }
      
      console.log('Teacher verified before lesson creation:', dbTeacher.id);
      
      const lesson = await createTestLesson(dbTeacher.id, {
        title: `Test Lesson ${Date.now()}`,
        content: 'Test content for dashboard',
        category: 'Science',
        status: 'Published',
        date: new Date().toISOString()
      });
      
      console.log('Created test lesson for teacher dashboard test:', lesson.id);
      
      const dbLesson = await prisma.lesson.findUnique({
        where: { id: lesson.id },
        include: { teacher: true }
      });
      
      if (!dbLesson) {
        throw new Error(`Lesson not found in database: ${lesson.id}`);
      }
      
      console.log('Lesson verified in database:', dbLesson.id, 'with teacherId:', dbLesson.teacherId);
      
      const decodedToken = jwt.verify(teacherToken, process.env.JWT_SECRET || 'test-secret-key') as { id: string; email: string; role: string; xp: number; level: number; streak: number };
      console.log('Teacher token contains role:', decodedToken.role, 'with ID:', decodedToken.id);
      
      const response = await request(app)
        .get('/api/teacher/dashboard')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      console.log('Teacher dashboard response:', response.body);

      expect(response.body).toHaveProperty('lessons');
      
      if (response.body.lessons.length === 0) {
        console.error('Teacher dashboard returned empty lessons array');
        
        const lessonStillExists = await prisma.lesson.findUnique({
          where: { id: lesson.id }
        });
        
        console.log('Lesson still exists in database:', !!lessonStillExists);
        
        if (lessonStillExists) {
          console.log('Lesson teacherId:', lessonStillExists.teacherId);
          console.log('Teacher ID in token:', decodedToken.id);
          
          if (lessonStillExists.teacherId !== decodedToken.id) {
            console.error('Teacher ID mismatch! Lesson belongs to a different teacher.');
          }
        }
        
        const allLessons = await prisma.lesson.findMany({
          include: { teacher: true }
        });
        
        console.log('All lessons in database:', allLessons.map(l => ({ id: l.id, teacherId: l.teacherId })));
      }
      
      expect(response.body.lessons).toHaveLength(1);
      expect(response.body.lessons[0]).toMatchObject({
        title: lesson.title,
        category: lesson.category
      });
    });

    it('should reject non-teacher access', async () => {
      const student = await createTestUser('student');
      const studentToken = jwt.sign(
        { id: student.id, email: student.email, role: student.role, xp: student.xp, level: student.level },
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
