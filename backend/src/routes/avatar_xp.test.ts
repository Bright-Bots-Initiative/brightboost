
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// 1. Hoist the mock object
const prismaMock = vi.hoisted(() => ({
  avatar: {
    findUnique: vi.fn(),
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

  it("should return 0 xp if avatar not found", async () => {
    // Mock prisma to return null
    prismaMock.avatar.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/user/xp")
      .set("Authorization", "Bearer mock-token-for-mvp");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ currentXp: 0 });
    // The dev role shim sets ID to "student-123"
    expect(prismaMock.avatar.findUnique).toHaveBeenCalledWith({
      where: { studentId: "student-123" },
      select: { xp: true },
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
