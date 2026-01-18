import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAllModules, getModuleWithContent, clearModuleCache } from "./module";
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

        expect(prisma.module.findUnique).toHaveBeenCalledWith(expect.objectContaining({
            where: { slug: "slug-1" }
        }));
        expect(result).toEqual(mockModule);
    });
  });
});
