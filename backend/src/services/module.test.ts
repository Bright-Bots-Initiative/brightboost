import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAllModules,
  getModuleWithContent,
  getModuleStructure,
  clearModuleCache,
} from "./module";
import prisma from "../utils/prisma";

// Mock Prisma
vi.mock("../utils/prisma", () => ({
  default: {
    module: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("Module Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearModuleCache();
  });

  describe("getAllModules", () => {
    it("should fetch modules from DB on first call", async () => {
      const mockModules = [{ id: "1", title: "Module 1", level: "K-2" }];
      vi.mocked(prisma.module.findMany).mockResolvedValue(mockModules as any);

      const result = await getAllModules();

      expect(prisma.module.findMany).toHaveBeenCalledWith({
        where: { published: true },
        orderBy: { level: "asc" },
      });
      expect(result).toEqual(mockModules);
    });

    it("should return cached modules on second call", async () => {
      const mockModules = [{ id: "1", title: "Module 1", level: "K-2" }];
      vi.mocked(prisma.module.findMany).mockResolvedValue(mockModules as any);

      // First call to populate cache
      await getAllModules();
      expect(prisma.module.findMany).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await getAllModules();
      expect(prisma.module.findMany).toHaveBeenCalledTimes(1); // Still 1
      expect(result2).toEqual(mockModules);
    });

    it("should filter modules when filter argument is provided", async () => {
      const mockModules = [
        { id: "1", title: "Module 1", level: "K-2" },
        { id: "2", title: "Module 2", level: "3-5" },
      ];
      vi.mocked(prisma.module.findMany).mockResolvedValue(mockModules as any);

      // First call fetches all
      const result = await getAllModules({ level: "K-2" });

      // Should have fetched all from DB (because cache was empty)
      expect(prisma.module.findMany).toHaveBeenCalledTimes(1);

      // But returned only filtered
      expect(result).toHaveLength(1);
      expect(result[0].level).toBe("K-2");

      // Cache should still have all modules
      const resultAll = await getAllModules();
      expect(resultAll).toHaveLength(2);
      expect(prisma.module.findMany).toHaveBeenCalledTimes(1); // No new fetch
    });
  });

  describe("getModuleWithContent", () => {
    it("should fetch module from DB on first call", async () => {
      const mockModule = { slug: "slug-1", title: "Module 1" };
      vi.mocked(prisma.module.findUnique).mockResolvedValue(mockModule as any);

      const result = await getModuleWithContent("slug-1");

      expect(prisma.module.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: "slug-1" },
          include: expect.anything(),
        }),
      );
      expect(result).toEqual(mockModule);
    });
  });

  describe("getModuleStructure", () => {
    it("should fetch module from DB on first call using select (no content)", async () => {
      const mockStructure = { slug: "slug-1", title: "Module 1" };
      vi.mocked(prisma.module.findUnique).mockResolvedValue(
        mockStructure as any,
      );

      const result = await getModuleStructure("slug-1");

      expect(prisma.module.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: "slug-1" },
          select: expect.anything(), // Should use select, not include
        }),
      );
      // Ensure select was actually used (shallow check on implementation detail)
      const callArgs = vi.mocked(prisma.module.findUnique).mock.calls[0][0];
      expect(callArgs?.select).toBeDefined();
      expect(callArgs?.include).toBeUndefined();

      expect(result).toEqual(mockStructure);
    });

    it("should use moduleCache if available", async () => {
      const mockFull = { slug: "slug-1", title: "Module 1 Full" };
      vi.mocked(prisma.module.findUnique).mockResolvedValue(mockFull as any);

      // 1. Populate Full Cache
      await getModuleWithContent("slug-1");
      expect(prisma.module.findUnique).toHaveBeenCalledTimes(1);

      // 2. Call Structure
      const result = await getModuleStructure("slug-1");

      // Should NOT fetch again
      expect(prisma.module.findUnique).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockFull);
    });

    it("should use moduleStructureCache if available", async () => {
      const mockStructure = { slug: "slug-1", title: "Module 1 Structure" };
      vi.mocked(prisma.module.findUnique).mockResolvedValue(
        mockStructure as any,
      );

      // 1. Populate Structure Cache
      await getModuleStructure("slug-1");
      expect(prisma.module.findUnique).toHaveBeenCalledTimes(1);

      // 2. Call Structure Again
      const result = await getModuleStructure("slug-1");

      // Should NOT fetch again
      expect(prisma.module.findUnique).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStructure);
    });
  });
});
