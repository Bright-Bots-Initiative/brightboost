import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

/**
 * #877/#878 — the avatar repair path in GET /avatar/me is a second writer of
 * the Avatar row. It reads xp 0, computes replacement values from the
 * completed count, and used to issue an ABSOLUTE update from that earlier
 * read, so a completion committing in between was overwritten
 * (`progressRewards.db.test.ts` DB-REPAIR-1 shows it on real PostgreSQL).
 *
 * The write is now conditional on the row still being what was read. This
 * pins the shape of that condition; the race itself is proven in the
 * database suite.
 */
const prismaMock = vi.hoisted(() => ({
  avatar: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
  progress: { count: vi.fn() },
}));
vi.mock("../../utils/prisma", () => ({ default: prismaMock }));
vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return prismaMock;
    }
  },
}));

import app from "../../server";

const ZERO_XP = {
  id: "avatar-1",
  studentId: "student-123",
  stage: "GENERAL",
  archetype: null,
  level: 1,
  xp: 0,
  unlockedAbilities: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /avatar/me repair (#877)", () => {
  it("REPAIR-1: the repair write is conditional on the row still reading xp 0 at the observed level", async () => {
    prismaMock.avatar.findUnique
      .mockResolvedValueOnce(ZERO_XP) // the read that decides to repair
      .mockResolvedValue({ ...ZERO_XP, level: 2, xp: 200 }); // the refetch
    prismaMock.progress.count.mockResolvedValue(2);
    prismaMock.avatar.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .get("/api/avatar/me")
      .set("Authorization", "Bearer mock-token-for-mvp");

    expect(res.status).toBe(200);
    expect(prismaMock.avatar.update).not.toHaveBeenCalled();
    expect(prismaMock.avatar.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.avatar.updateMany.mock.calls[0][0]).toEqual({
      where: { studentId: "student-123", xp: 0, level: 1 },
      data: { level: 2, xp: 200 },
    });
    expect(res.body.avatar.xp).toBe(200);
  });

  it("REPAIR-2: when a reward landed between the read and the write, the repair matches nothing and the reply carries the committed reward", async () => {
    prismaMock.avatar.findUnique
      .mockResolvedValueOnce(ZERO_XP)
      .mockResolvedValue({ ...ZERO_XP, xp: 50 }); // what a concurrent completion committed
    prismaMock.progress.count.mockResolvedValue(2);
    prismaMock.avatar.updateMany.mockResolvedValue({ count: 0 }); // the guard failed

    const res = await request(app)
      .get("/api/avatar/me")
      .set("Authorization", "Bearer mock-token-for-mvp");

    expect(res.status).toBe(200);
    expect(res.body.avatar.xp).toBe(50);
  });

  it("REPAIR-3: an avatar with xp already above zero is never repaired", async () => {
    prismaMock.avatar.findUnique.mockResolvedValue({ ...ZERO_XP, xp: 50 });

    const res = await request(app)
      .get("/api/avatar/me")
      .set("Authorization", "Bearer mock-token-for-mvp");

    expect(res.status).toBe(200);
    expect(prismaMock.progress.count).not.toHaveBeenCalled();
    expect(prismaMock.avatar.updateMany).not.toHaveBeenCalled();
  });
});
