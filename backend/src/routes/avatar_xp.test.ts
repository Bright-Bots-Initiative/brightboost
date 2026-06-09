import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// 1. Hoist the mock object.
//
// /user/xp uses ensureAvatarWithBackfill, which:
//   - calls prisma.avatar.findUnique to look for an existing avatar, and
//   - if none, calls prisma.progress.count then prisma.avatar.create to
//     backfill an Explorer avatar from completed progress.
// Mocking findUnique alone leaves count/create undefined → the handler's
// try/catch reports 500. Cover the whole backfill path so tests can
// assert the user-visible behavior (xp=0 when no progress, real xp when
// the avatar exists).
const prismaMock = vi.hoisted(() => ({
  avatar: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  progress: {
    count: vi.fn(),
  },
}));

// 2. Mock the module to return the hoisted object as default
vi.mock("../utils/prisma", () => ({
  default: prismaMock,
}));

// 3. Import app AFTER mocks so it uses the mocked prisma
import app from "../server";

describe("GET /api/user/xp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/user/xp");
    expect(res.status).toBe(401);
  });

  it("returns xp=0 when the student has no avatar and no completed progress (backfill creates a fresh Explorer)", async () => {
    // No existing avatar.
    prismaMock.avatar.findUnique.mockResolvedValue(null);
    // No completed progress → backfilled XP is 0, level stays at 1.
    prismaMock.progress.count.mockResolvedValue(0);
    // Backfill creates a fresh Explorer avatar with xp=0.
    prismaMock.avatar.create.mockResolvedValue({ xp: 0 });

    const res = await request(app)
      .get("/api/user/xp")
      .set("Authorization", "Bearer mock-token-for-mvp");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ currentXp: 0 });
    // The dev role shim sets ID to "student-123"
    expect(prismaMock.avatar.findUnique).toHaveBeenCalledWith({
      where: { studentId: "student-123" },
    });
  });

  it("should return correct xp if avatar exists", async () => {
    // Mock prisma to return avatar
    prismaMock.avatar.findUnique.mockResolvedValue({ xp: 150 });

    const res = await request(app)
      .get("/api/user/xp")
      .set("Authorization", "Bearer mock-token-for-mvp");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ currentXp: 150 });
  });
});
