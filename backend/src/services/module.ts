import prisma from "../utils/prisma";

// Simple in-memory cache with basic eviction to prevent leaks
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50; // Modules are few, but safety first
const moduleCache = new Map<string, { data: any; expiresAt: number }>();
const moduleStructureCache = new Map<
  string,
  { data: any; expiresAt: number }
>();

let allModulesCache: { data: any[]; expiresAt: number } | null = null;

// Export for testing
export function clearModuleCache() {
  moduleCache.clear();
  moduleStructureCache.clear();
  allModulesCache = null;
}

export async function getAllModules(filter?: { level?: string }) {
  const now = Date.now();
  let modules;

  if (allModulesCache && allModulesCache.expiresAt > now) {
    modules = allModulesCache.data;
  } else {
    modules = await prisma.module.findMany({
      where: { published: true },
      orderBy: { level: "asc" },
    });

    allModulesCache = {
      data: modules,
      expiresAt: now + CACHE_TTL_MS,
    };
  }

  if (filter?.level) {
    return modules.filter((m: any) => m.level === filter.level);
  }

  return modules;
}

export async function getModuleStructure(slug: string) {
  const now = Date.now();

  // 1. Try Full Cache first (fastest, in memory)
  // If we have the full content in memory, use it (and strip content downstream if needed,
  // or just return it as it satisfies the structure shape).
  // The caller (getAggregatedProgress) discards content anyway, but passing full object is fine in-memory.
  const fullCached = moduleCache.get(slug);
  if (fullCached && fullCached.expiresAt > now) {
    return fullCached.data;
  }

  // 2. Try Structure Cache
  const structCached = moduleStructureCache.get(slug);
  if (structCached) {
    if (structCached.expiresAt > now) {
      return structCached.data;
    }
    moduleStructureCache.delete(slug);
  }

  // 3. Fetch from DB (Optimized: No Content)
  // ⚡ Bolt Optimization: Use select to exclude 'content' field to reduce DB payload size
  const structure = await prisma.module.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      level: true,
      published: true,
      badges: true,
      units: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              order: true,
              activities: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  title: true,
                  kind: true,
                  order: true,
                  lessonId: true,
                  unitId: true,
                  // content: false // Excluded!
                },
              },
            },
          },
        },
      },
    },
  });

  if (structure) {
    if (moduleStructureCache.size >= MAX_CACHE_SIZE) {
      moduleStructureCache.clear();
    }

    moduleStructureCache.set(slug, {
      data: structure,
      expiresAt: now + CACHE_TTL_MS,
    });
  }

  return structure;
}

export async function getModuleWithContent(slug: string) {
  const now = Date.now();
  const cached = moduleCache.get(slug);

  if (cached) {
    if (cached.expiresAt > now) {
      return cached.data;
    } else {
      moduleCache.delete(slug); // Clean up expired
    }
  }

  // ⚡ Bolt Optimization: Fetch and cache the expensive nested module structure
  // This query joins 4 tables (Module -> Unit -> Lesson -> Activity)
  const moduleData = await prisma.module.findUnique({
    where: { slug },
    include: {
      units: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              activities: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
      badges: true,
    },
  });

  if (moduleData) {
    // Basic eviction policy: if full, clear all (simplest implementation without new deps)
    if (moduleCache.size >= MAX_CACHE_SIZE) {
      moduleCache.clear();
    }

    moduleCache.set(slug, {
      data: moduleData,
      expiresAt: now + CACHE_TTL_MS,
    });
  }

  return moduleData;
}
