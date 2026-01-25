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

// Import app AFTER mocking
import app from "../server";

describe("Module Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/module/:slug", () => {
    it("should return full module content by default", async () => {
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

      expect(moduleServiceMock.getModuleWithContent).toHaveBeenCalledWith("test-module");
      expect(moduleServiceMock.getModuleStructure).not.toHaveBeenCalled();
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

      expect(moduleServiceMock.getModuleStructure).toHaveBeenCalledWith("test-module");
      expect(moduleServiceMock.getModuleWithContent).not.toHaveBeenCalled();
    });
  });
});
