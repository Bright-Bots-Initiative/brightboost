import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Mock Prisma — prep content is a static in-file catalog; only the per-teacher
// checklist state touches the DB.
vi.mock("../utils/prisma", () => ({
  default: {
    teacherPrepChecklist: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
    },
  },
}));

// Mock auth middleware to allow role simulation (same pattern as modules.test.ts)
vi.mock("../utils/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/auth")>();
  return {
    ...actual,
    authenticateToken: (req: any, _res: any, next: any) => {
      if (req.user) return next();
      if (req.headers["x-test-role"]) {
        req.user = { id: "test-teacher", role: req.headers["x-test-role"] };
        return next();
      }
      next();
    },
  };
});

// Import app AFTER mocking
import app from "../server";
import { MODULE_PREP_DATA } from "./teacherPrep";

// Archived module slugs (mirrors HIDDEN_MODULE_SLUGS in src/constants/stemSets.ts —
// the backend cannot import frontend constants, so the two archived slugs are
// pinned here; a drift means this list needs a matching update).
const ARCHIVED_SLUGS = ["k2-stem-sequencing", "stem-1-intro"];

describe("teacher prep catalog (#K2 adult support)", () => {
  it("contains no archived module slugs", () => {
    for (const slug of ARCHIVED_SLUGS) {
      expect(MODULE_PREP_DATA).not.toHaveProperty(slug);
    }
  });

  it("covers exactly the active modules that have authored prep guides", () => {
    expect(Object.keys(MODULE_PREP_DATA).sort()).toEqual([
      "k2-stem-bounce-buds",
      "k2-stem-gotcha-gears",
      "k2-stem-rhyme-ride",
    ]);
  });

  it("GET /api/teacher/prep lists only catalog modules, all with hasPrep", async () => {
    const res = await request(app)
      .get("/api/teacher/prep")
      .set("x-test-role", "teacher");
    expect(res.status).toBe(200);
    const slugs = res.body.map((r: { moduleSlug: string }) => r.moduleSlug);
    expect(slugs.sort()).toEqual(Object.keys(MODULE_PREP_DATA).sort());
    expect(
      res.body.every((r: { hasPrep: boolean }) => r.hasPrep === true),
    ).toBe(true);
    expect(slugs).not.toContain("k2-stem-sequencing");
  });

  it("GET /api/teacher/prep/:slug 404s for the archived sequencing module", async () => {
    const res = await request(app)
      .get("/api/teacher/prep/k2-stem-sequencing")
      .set("x-test-role", "teacher");
    expect(res.status).toBe(404);
  });

  it("GET /api/teacher/prep/:slug serves an active module's prep data", async () => {
    const res = await request(app)
      .get("/api/teacher/prep/k2-stem-rhyme-ride")
      .set("x-test-role", "teacher");
    expect(res.status).toBe(200);
    expect(res.body.moduleSlug).toBe("k2-stem-rhyme-ride");
    expect(res.body.objectives.length).toBeGreaterThan(0);
    expect(res.body.pacingGuide.length).toBeGreaterThan(0);
  });
});
