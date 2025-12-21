
import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import * as classesService from '../services/classes';

// Mock the classes service
vi.mock('../services/classes', () => ({
  createClass: vi.fn(),
  listClasses: vi.fn(),
  joinClass: vi.fn(),
}));

import app from '../server';

describe('POST /api/classes/join IDOR Vulnerability', () => {
  const teacherId = "teacher-123";
  const attackerId = "attacker-student";
  const victimId = "victim-student";
  const inviteCode = "SEC101_INVITE";

  beforeAll(() => {
    process.env.ALLOW_DEV_ROLE_HEADER = "1";
  });

  it('should call joinClass with the AUTHENTICATED user ID (FIXED)', async () => {
    // Setup the mock to return success
    // Cast to any to bypass type checking of the mock which expects void because joinClass is mocked as throwing in the implementation file I modified earlier to please compiler
    vi.mocked(classesService.joinClass).mockResolvedValue({
      classId: "class-123",
      alreadyEnrolled: false
    } as any);

    // Attacker is logged in as attackerId
    // But sends victimId in the body
    const response = await request(app)
      .post('/api/classes/join')
      .set('x-role', 'student')
      .set('x-user-id', attackerId)
      .send({
        inviteCode: inviteCode,
        studentId: victimId
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);

    // Verify that joinClass was called with the ATTACKER's ID (ignoring the body)
    expect(classesService.joinClass).toHaveBeenCalledWith(inviteCode, attackerId);

    // It should NOT have been called with victim's ID
    expect(classesService.joinClass).not.toHaveBeenCalledWith(inviteCode, victimId);
  });
});
