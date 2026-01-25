import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock the module service
const moduleServiceMock = vi.hoisted(() => ({
  getModuleWithContent: vi.fn(),
  getModuleStructure: vi.fn(),
  getAllModules: vi.fn(),
}));

vi.mock("../src/services/module", () => moduleServiceMock);

// Mock Prisma
vi.mock("../src/utils/prisma", () => ({
  default: {},
}));

// Import app
import app from "../src/server";

describe("Sentinel Security - Module Access Control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Should prevent students from accessing unpublished modules (return 404)", async () => {
    // Setup mock to return an unpublished module
    moduleServiceMock.getModuleWithContent.mockResolvedValue({
      id: "draft-1",
      slug: "draft-module",
      title: "Secret Draft",
      published: false,
      content: "secret-content",
    });

    const response = await request(app)
      .get("/api/module/draft-module")
      .set("Authorization", "Bearer mock-token-for-mvp"); // Role: student

    // Expect 404 to hide existence of the resource
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "not_found",
    });
  });

  it("Should allow teachers to access unpublished modules", async () => {
     // Setup mock
     moduleServiceMock.getModuleWithContent.mockResolvedValue({
      id: "draft-1",
      slug: "draft-module",
      title: "Secret Draft",
      published: false,
      content: "secret-content",
    });

    // Use dev role shim feature to simulate teacher
    process.env.ALLOW_DEV_ROLE_HEADER = "1";
    process.env.NODE_ENV = "test";

    const response = await request(app)
      .get("/api/module/draft-module")
      .set("x-role", "teacher")
      .set("x-user-id", "teacher-1");

    expect(response.status).toBe(200);
  });
});
