import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock the module service
const moduleServiceMock = vi.hoisted(() => ({
  getModuleWithContent: vi.fn(),
  getModuleStructure: vi.fn(),
  getAllModules: vi.fn(),
}));

vi.mock("../services/module", () => moduleServiceMock);

// Mock Prisma (needed because server.ts imports routes which might import other things)
vi.mock("../utils/prisma", () => ({
  default: {
    // Add minimal mocks if needed
  },
}));

// Mock auth middleware to allow role simulation
vi.mock("../utils/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/auth")>();
  return {
    ...actual,
    authenticateToken: (req: any, res: any, next: any) => {
      // Skip if already authenticated (e.g. by devRoleShim)
      if (req.user) return next();

      if (req.headers["x-test-role"]) {
        req.user = { id: "test-user", role: req.headers["x-test-role"] };
        return next();
      }

      next();
    },
  };
});

// Import app AFTER mocking
import app from "../server";

describe("Module Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/modules", () => {
    it("should return modules with cache headers", async () => {
      moduleServiceMock.getAllModules.mockResolvedValue([
        { id: "1", title: "M1", published: true },
      ]);

      const response = await request(app)
        .get("/api/modules")
        .set("Authorization", "Bearer mock-token-for-mvp");

      expect(response.status).toBe(200);
      expect(response.headers["cache-control"]).toBe("private, max-age=300");
      expect(response.headers["pragma"]).toBeUndefined();
      expect(response.headers["expires"]).toBeUndefined();
    });
  });

  describe("GET /api/module/:slug", () => {
    it("should return full module content by default and cache it if published", async () => {
      // Setup mock
      moduleServiceMock.getModuleWithContent.mockResolvedValue({
        id: "1",
        slug: "test-module",
        title: "Test Module",
        content: "some-heavy-content",
        published: true,
      });

      const response = await request(app)
        .get("/api/module/test-module")
        .set("Authorization", "Bearer mock-token-for-mvp");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: "1",
        slug: "test-module",
        title: "Test Module",
        content: "some-heavy-content",
        published: true,
      });
      // Verify cache headers
      expect(response.headers["cache-control"]).toBe("private, max-age=300");

      expect(moduleServiceMock.getModuleWithContent).toHaveBeenCalledWith(
        "test-module",
      );
      expect(moduleServiceMock.getModuleStructure).not.toHaveBeenCalled();
    });

    it("should NOT cache unpublished modules (teacher view)", async () => {
      // Setup mock
      moduleServiceMock.getModuleWithContent.mockResolvedValue({
        id: "1",
        slug: "draft-module",
        title: "Draft Module",
        published: false,
      });

      const response = await request(app)
        .get("/api/module/draft-module")
        // Use a random token so devRoleShim skips, and x-test-role triggers our auth mock
        .set("Authorization", "Bearer teacher-token")
        .set("x-test-role", "teacher");

      expect(response.status).toBe(200);
      expect(response.body.slug).toBe("draft-module");

      // Should NOT have our cache header (should inherit nocache)
      expect(response.headers["cache-control"]).toContain("no-store");
    });

    it("should return module structure when structure=true query param is present", async () => {
      // Setup mock
      moduleServiceMock.getModuleStructure.mockResolvedValue({
        id: "1",
        slug: "test-module",
        title: "Test Module",
        published: true,
        // No content
      });

      const response = await request(app)
        .get("/api/module/test-module?structure=true")
        .set("Authorization", "Bearer mock-token-for-mvp");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: "1",
        slug: "test-module",
        title: "Test Module",
        published: true,
      });

      expect(moduleServiceMock.getModuleStructure).toHaveBeenCalledWith(
        "test-module",
      );
      expect(moduleServiceMock.getModuleWithContent).not.toHaveBeenCalled();
    });
  });
});
