import prisma from "../utils/prisma";

// Simple in-memory cache with basic eviction to prevent leaks
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50; // Modules are few, but safety first
const moduleCache = new Map<string, { data: any; expiresAt: number }>();

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
