import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server';

describe('Security Enhancements', () => {
  it('should have helmet security headers', async () => {
    const res = await request(app).get('/health');
    // Basic helmet headers
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should have rate limiting headers', async () => {
    const res = await request(app).get('/health');
    // We configured standardHeaders: true and legacyHeaders: true
    // Checking for legacy headers as they are easy to verify
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });
});
