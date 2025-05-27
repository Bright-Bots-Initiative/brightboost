import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestDatabase, teardownTestDatabase, cleanupTestDatabase, createTestUser, createTestBadge, prisma } from './utils/database';
import { TestExpressApp, GamificationProfile, XpResponse, StreakResponse, BadgeResponse, BadgeData } from './types';
import app from '../server.cjs';

describe('Gamification Endpoints', () => {
  let userToken: string;
  let user: { id: string; email: string; name: string; role: string; xp: number; level: number; streak: number };

  beforeEach(async () => {
    await setupTestDatabase();
    
    try {
      // Generate truly unique user for each test
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const email = `test-gamification-${timestamp}-${randomSuffix}@example.com`;
      
      user = await createTestUser('student', {
        name: `Gamification Test User ${timestamp}`,
        email: email,
        password: 'password123'
      });
      
      console.log('Created test student:', user.id, 'with email:', email);
      
      const verifiedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      
      if (!verifiedUser) {
        console.error('Failed to find user after creation:', user.id);
        throw new Error('Failed to create student user for test');
      }
      
      console.log('Test student verified in database:', verifiedUser.id);
      
      userToken = jwt.sign(
        { 
          id: verifiedUser.id, 
          email: verifiedUser.email, 
          role: verifiedUser.role, 
          xp: verifiedUser.xp || 0, 
          level: verifiedUser.level || 1,
          streak: verifiedUser.streak || 0
        },
        process.env.JWT_SECRET || 'test-secret-key'
      );
      
      console.log('Generated token for user:', verifiedUser.id);
    } catch (error) {
      console.error('Error in gamification test setup:', error);
      throw error;
    }
  });

  afterEach(async () => {
    await cleanupTestDatabase(); // Clean database after each test
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/gamification/profile', () => {
    it('should return user gamification profile', async () => {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const email = `test-profile-${timestamp}-${randomSuffix}@example.com`;
      
      const profileTestUser = await createTestUser('student', {
        name: `Profile Test User ${timestamp}`,
        email: email,
        password: 'password123'
      });
      
      console.log('Created dedicated test user for profile test:', profileTestUser.id, 'with email:', email);
      
      const verifiedUser = await prisma.user.findUnique({
        where: { id: profileTestUser.id }
      });
      
      if (!verifiedUser) {
        console.error('User not found after creation for profile test:', profileTestUser.id);
        throw new Error(`Test user ${profileTestUser.id} not found in database. Test isolation may be broken.`);
      }
      
      console.log('User verified in database for profile test:', verifiedUser.id);
      
      // Generate token for this specific test user
      const profileTestToken = jwt.sign(
        { 
          id: verifiedUser.id, 
          email: verifiedUser.email, 
          role: verifiedUser.role, 
          xp: verifiedUser.xp || 0, 
          level: verifiedUser.level || 1,
          streak: verifiedUser.streak || 0
        },
        process.env.JWT_SECRET || 'test-secret-key'
      );
      
      const response = await request(app)
        .get('/api/gamification/profile')
        .set('Authorization', `Bearer ${profileTestToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: profileTestUser.id,
        name: profileTestUser.name,
        xp: 0,
        level: 1,
        streak: 0
      });
    });

    it('should return 404 for non-existent user', async () => {
      const nonexistentId = `nonexistent-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      
      const fakeToken = jwt.sign(
        { 
          id: nonexistentId, 
          email: `fake-${Date.now()}@example.com`, 
          role: 'student',
          xp: 0,
          level: 1,
          streak: 0
        },
        process.env.JWT_SECRET || 'test-secret-key'
      );
      
      console.log(`Testing with non-existent user ID: ${nonexistentId}`);

      const userExists = await prisma.user.findUnique({
        where: { id: nonexistentId }
      });
      
      expect(userExists).toBeNull();

      await request(app)
        .get('/api/gamification/profile')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(404);
    });
  });

  describe('POST /api/gamification/award-xp', () => {
    it('should award XP and update level', async () => {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const email = `test-award-xp-${timestamp}-${randomSuffix}@example.com`;
      
      const xpTestUser = await createTestUser('student', {
        name: `Award XP Test User ${timestamp}`,
        email: email,
        password: 'password123'
      });
      
      console.log('Created dedicated test user for award-xp test:', xpTestUser.id, 'with email:', email);
      
      const verifiedUser = await prisma.user.findUnique({
        where: { id: xpTestUser.id }
      });
      
      if (!verifiedUser) {
        console.error('User not found in database after creation for award-xp test:', xpTestUser.id);
        throw new Error(`Test user ${xpTestUser.id} not found in database. Test isolation may be broken.`);
      }
      
      console.log('User verified in database for award-xp test:', verifiedUser.id);
      
      // Generate token for this specific test user
      const xpTestToken = jwt.sign(
        { 
          id: verifiedUser.id, 
          email: verifiedUser.email, 
          role: verifiedUser.role, 
          xp: verifiedUser.xp || 0, 
          level: verifiedUser.level || 1,
          streak: verifiedUser.streak || 0
        },
        process.env.JWT_SECRET || 'test-secret-key'
      );
      
      const response = await request(app)
        .post('/api/gamification/award-xp')
        .set('Authorization', `Bearer ${xpTestToken}`)
        .send({ amount: 60, reason: 'Test completion' })
        .expect(200);

      console.log('Award XP response:', response.body);
      
      expect(response.body).toMatchObject({
        success: true,
        xp: 60,
        xpGained: 60,
        leveledUp: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updatedUser = await prisma.user.findUnique({
        where: { id: xpTestUser.id }
      });
      
      console.log('Updated user XP in database:', updatedUser?.xp);
      
      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.xp).toBe(60);
    });

    it('should reject invalid XP amount', async () => {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const email = `test-invalid-xp-${timestamp}-${randomSuffix}@example.com`;
      
      const invalidXpTestUser = await createTestUser('student', {
        name: `Invalid XP Test User ${timestamp}`,
        email: email,
        password: 'password123'
      });
      
      console.log('Created dedicated test user for invalid XP test:', invalidXpTestUser.id);
      
      const verifiedUser = await prisma.user.findUnique({
        where: { id: invalidXpTestUser.id }
      });
      
      if (!verifiedUser) {
        console.error('User not found after creation for invalid XP test:', invalidXpTestUser.id);
        throw new Error(`Test user ${invalidXpTestUser.id} not found in database. Test isolation may be broken.`);
      }
      
      console.log('User verified in database for invalid XP test:', verifiedUser.id);
      
      // Generate token for this specific test user
      const invalidXpTestToken = jwt.sign(
        { 
          id: verifiedUser.id, 
          email: verifiedUser.email, 
          role: verifiedUser.role, 
          xp: verifiedUser.xp || 0, 
          level: verifiedUser.level || 1,
          streak: verifiedUser.streak || 0
        },
        process.env.JWT_SECRET || 'test-secret-key'
      );
      
      await request(app)
        .post('/api/gamification/award-xp')
        .set('Authorization', `Bearer ${invalidXpTestToken}`)
        .send({ amount: -10 })
        .expect(400);
    });
  });

  describe('POST /api/gamification/update-streak', () => {
    it('should update user streak', async () => {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const email = `test-streak-${timestamp}-${randomSuffix}@example.com`;
      
      const streakTestUser = await createTestUser('student', {
        name: `Streak Test User ${timestamp}`,
        email: email,
        password: 'password123'
      });
      
      console.log('Created dedicated test user for streak test:', streakTestUser.id, 'with email:', email);
      
      const verifiedUser = await prisma.user.findUnique({
        where: { id: streakTestUser.id }
      });
      
      if (!verifiedUser) {
        console.error('User not found after creation for streak test:', streakTestUser.id);
        throw new Error(`Test user ${streakTestUser.id} not found in database. Test isolation may be broken.`);
      }
      
      console.log('User verified in database for streak test:', verifiedUser.id);
      
      // Generate token for this specific test user
      const streakTestToken = jwt.sign(
        { 
          id: verifiedUser.id, 
          email: verifiedUser.email, 
          role: verifiedUser.role, 
          xp: verifiedUser.xp || 0, 
          level: verifiedUser.level || 1,
          streak: verifiedUser.streak || 0
        },
        process.env.JWT_SECRET || 'test-secret-key'
      );
      
      const decodedToken = jwt.verify(streakTestToken, process.env.JWT_SECRET || 'test-secret-key');
      console.log('Decoded token:', decodedToken);
      
      const userBeforeRequest = await prisma.user.findUnique({
        where: { id: verifiedUser.id }
      });
      
      if (!userBeforeRequest) {
        console.error('User not found right before streak update request:', verifiedUser.id);
        throw new Error(`User disappeared from database before streak update: ${verifiedUser.id}`);
      }
      
      console.log('Updating streak for user:', verifiedUser.id);
      
      const response = await request(app)
        .post('/api/gamification/update-streak')
        .set('Authorization', `Bearer ${streakTestToken}`)
        .expect(200);

      console.log('Update streak response:', response.body);
      
      expect(response.body).toMatchObject({
        success: true,
        streak: 1,
        streakXp: 5
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: streakTestUser.id }
      });
      expect(updatedUser?.streak).toBe(1);
    });
  });

  describe('POST /api/gamification/award-badge', () => {
    it('should award badge to user', async () => {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const email = `test-badge-${timestamp}-${randomSuffix}@example.com`;
      
      const badgeTestUser = await createTestUser('student', {
        name: `Badge Test User ${timestamp}`,
        email: email,
        password: 'password123'
      });
      
      console.log('Created dedicated test user for badge test:', badgeTestUser.id, 'with email:', email);
      
      const verifiedUser = await prisma.user.findUnique({
        where: { id: badgeTestUser.id }
      });
      
      if (!verifiedUser) {
        console.error('User not found after creation for badge test:', badgeTestUser.id);
        throw new Error(`Test user ${badgeTestUser.id} not found in database. Test isolation may be broken.`);
      }
      
      console.log('User verified in database for badge test:', verifiedUser.id);
      
      // Generate token for this specific test user
      const badgeTestToken = jwt.sign(
        { 
          id: verifiedUser.id, 
          email: verifiedUser.email, 
          role: verifiedUser.role, 
          xp: verifiedUser.xp || 0, 
          level: verifiedUser.level || 1,
          streak: verifiedUser.streak || 0
        },
        process.env.JWT_SECRET || 'test-secret-key'
      );
      
      const testBadge = await createTestBadge('Test Badge');
      console.log('Created test badge:', testBadge.id, testBadge.name);
      
      const dbBadge = await prisma.badge.findUnique({
        where: { id: testBadge.id }
      });
      
      if (!dbBadge) {
        throw new Error(`Badge not found in database: ${testBadge.id}`);
      }
      
      console.log('Badge verified in database:', dbBadge.id);
      
      const badgeData = {
        badgeId: testBadge.id,
        badgeName: testBadge.name
      };

      const response = await request(app)
        .post('/api/gamification/award-badge')
        .set('Authorization', `Bearer ${badgeTestToken}`)
        .send(badgeData)
        .expect(200);

      console.log('Award badge response:', response.body);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Badge awarded successfully',
        badge: {
          id: badgeData.badgeId,
          name: badgeData.badgeName
        }
      });
      
      const userWithBadges = await prisma.user.findUnique({
        where: { id: badgeTestUser.id },
        include: { badges: true }
      });
      
      expect(userWithBadges?.badges).toHaveLength(1);
      expect(userWithBadges?.badges[0].id).toBe(testBadge.id);
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
