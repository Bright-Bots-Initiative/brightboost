import { describe, it, expect } from 'vitest';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000';

interface StreakData {
  xp: number;
  badges: string[];
  streakDays: number;
}

describe('GET /api/gamification/streak', () => {
  it('returns correct JSON structure with 200 status', async () => {
    const response = await fetch(`${API_URL}/api/gamification/streak`);
    const data = await response.json() as StreakData;
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('xp');
    expect(data).toHaveProperty('badges');
    expect(data).toHaveProperty('streakDays');
    expect(typeof data.xp).toBe('number');
    expect(Array.isArray(data.badges)).toBe(true);
    expect(typeof data.streakDays).toBe('number');
  });

  it('returns keys in correct order (xp, badges, streakDays)', async () => {
    const response = await fetch(`${API_URL}/api/gamification/streak`);
    const data = await response.json() as StreakData;
    const keys = Object.keys(data);
    
    expect(keys).toEqual(['xp', 'badges', 'streakDays']);
  });

  it('ignores query parameters and still returns 200', async () => {
    const response = await fetch(`${API_URL}/api/gamification/streak?extra=param&another=value`);
    
    expect(response.status).toBe(200);
  });

  it('returns 405 for POST method', async () => {
    const response = await fetch(`${API_URL}/api/gamification/streak`, {
      method: 'POST'
    });
    
    expect(response.status).toBe(405);
  });

  it('returns 405 for PUT method', async () => {
    const response = await fetch(`${API_URL}/api/gamification/streak`, {
      method: 'PUT'
    });
    
    expect(response.status).toBe(405);
  });
});
