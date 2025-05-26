import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestDatabase, teardownTestDatabase, createTestUser, prisma } from './utils/database';

const app = require('../server.cjs');

describe('Gamification Endpoints', () => {
  let userToken: string;
  let user: any;

  beforeEach(async () => {
    await setupTestDatabase();
    user = await createTestUser('student');
    userToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'test-secret-key'
    );
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/gamification/profile', () => {
    it('should return user gamification profile', async () => {
      const response = await request(app)
        .get('/api/gamification/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: user.id,
        name: user.name,
        xp: 0,
        level: 'Explorer',
        streak: 0
      });
    });

    it('should return 404 for non-existent user', async () => {
      const fakeToken = jwt.sign(
        { id: 'nonexistent-id', email: 'fake@example.com', role: 'student' },
        process.env.JWT_SECRET || 'test-secret-key'
      );

      await request(app)
        .get('/api/gamification/profile')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(404);
    });
  });

  describe('POST /api/gamification/award-xp', () => {
    it('should award XP and update level', async () => {
      const response = await request(app)
        .post('/api/gamification/award-xp')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 60, reason: 'Test completion' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        xp: 60,
        xpGained: 60,
        leveledUp: true
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      expect(updatedUser?.xp).toBe(60);
    });

    it('should reject invalid XP amount', async () => {
      await request(app)
        .post('/api/gamification/award-xp')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: -10 })
        .expect(400);
    });
  });

  describe('POST /api/gamification/update-streak', () => {
    it('should update user streak', async () => {
      const response = await request(app)
        .post('/api/gamification/update-streak')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        streak: 1,
        streakXp: 5
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      expect(updatedUser?.streak).toBe(1);
    });
  });

  describe('POST /api/gamification/award-badge', () => {
    it('should award badge to user', async () => {
      const badgeData = {
        badgeId: 'test-badge',
        badgeName: 'Test Badge'
      };

      const response = await request(app)
        .post('/api/gamification/award-badge')
        .set('Authorization', `Bearer ${userToken}`)
        .send(badgeData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Badge awarded successfully',
        badge: {
          id: badgeData.badgeId,
          name: badgeData.badgeName
        }
      });
    });

    it('should reject missing badge information', async () => {
      await request(app)
        .post('/api/gamification/award-badge')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);
    });
  });
});
