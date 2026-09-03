/**
 * The student dashboard's "Continue / Play Next" scan (#856).
 *
 * Lifted out of `StudentDashboard.tsx` unchanged in ordering semantics so the
 * access policy can be applied to it and the ordering can be pinned by tests:
 * modules are visited in priority order (most recently progressed first, then
 * catalog order) and the first incomplete activity wins.
 *
 * The only behavioral addition is `isAllowed`: a target the access policy
 * refuses is skipped without being fetched, so Continue can never point at
 * hidden, wrong-grade or locked-set content.
 */

export type ProgressEntry = {
  moduleSlug?: string | null;
  activityId?: unknown;
  status?: string | null;
  updatedAt?: string | Date | null;
};

export type NextActivity = {
  moduleSlug: string;
  moduleTitle: string;
  unitId: string;
  unitTitle: string;
  lessonId: string;
  lessonTitle: string;
  activityId: string;
  activityTitle: string;
  kind: "INFO" | "INTERACT";
  orderKey: string;
};

export type CompletedModule = {
  slug: string;
  title: string;
};

export type ContinueScanResult = {
  nextOne: NextActivity | null;
  upNext: NextActivity[];
  completedModules: CompletedModule[];
};

/** How many follow-up activities the "Keep Playing" list shows after nextOne. */
const UP_NEXT_COUNT = 3;

export function sortNum(n: unknown, fallback = 9999): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

export function flattenModule(module: any): NextActivity[] {
  const out: NextActivity[] = [];
  const units = (module?.units || [])
    .slice()
    .sort((a: any, b: any) => sortNum(a.order) - sortNum(b.order));
  for (const u of units) {
    const lessons = (u?.lessons || [])
      .slice()
      .sort((a: any, b: any) => sortNum(a.order) - sortNum(b.order));
    for (const l of lessons) {
      const acts = (l?.activities || [])
        .slice()
        .sort((a: any, b: any) => sortNum(a.order) - sortNum(b.order));
      for (const a of acts) {
        out.push({
          moduleSlug: module.slug,
          moduleTitle: module.title,
          unitId: String(u.id),
          unitTitle: u.title,
          lessonId: String(l.id),
          lessonTitle: l.title,
          activityId: String(a.id),
          activityTitle: a.title,
          kind: a.kind,
          orderKey: `${sortNum(u.order)}.${sortNum(l.order)}.${sortNum(a.order)}`,
        });
      }
    }
  }
  return out;
}

/**
 * Build priority-ordered list of module slugs:
 * - First: modules with recent progress, sorted by most recent
 * - Then: remaining modules in catalog order
 */
export function buildModuleSlugPriority(
  modules: { slug: string }[],
  progress: ProgressEntry[],
): string[] {
  // Get slugs with progress, sorted by most recent
  const progressBySlug = new Map<string, Date>();
  for (const p of progress) {
    if (!p.moduleSlug || !p.updatedAt) continue;
    const date = new Date(p.updatedAt);
    if (isNaN(date.getTime())) continue;
    const existing = progressBySlug.get(p.moduleSlug);
    if (!existing || date > existing) {
      progressBySlug.set(p.moduleSlug, date);
    }
  }

  const progressedSlugs = Array.from(progressBySlug.entries())
    .sort((a, b) => b[1].getTime() - a[1].getTime())
    .map(([slug]) => slug);

  // Add remaining modules in catalog order
  const allSlugs = modules.map((m) => m.slug);
  const remainingSlugs = allSlugs.filter((s) => !progressBySlug.has(s));

  return [...progressedSlugs, ...remainingSlugs];
}

export interface ScanForNextActivityOptions {
  slugPriority: string[];
  progress: ProgressEntry[];
  /** Loads a module's structure; may reject (the slug is then skipped). */
  loadModule: (slug: string) => Promise<any>;
  /**
   * The access policy, applied *before* the module is fetched so refused
   * content costs nothing and can never become the Continue target.
   */
  isAllowed: (slug: string) => boolean;
  /** Lets the caller abort mid-scan when its component unmounts. */
  isCancelled?: () => boolean;
  /** Non-fatal load failures, reported the way the dashboard used to log them. */
  onLoadError?: (slug: string, error: unknown) => void;
}

/**
 * Scan modules in priority order for the first incomplete activity.
 *
 * Returns `null` when the scan was cancelled part-way (the caller should keep
 * its current state rather than render a partial result).
 */
export async function scanForNextActivity({
  slugPriority,
  progress,
  loadModule,
  isAllowed,
  isCancelled,
  onLoadError,
}: ScanForNextActivityOptions): Promise<ContinueScanResult | null> {
  let nextOne: NextActivity | null = null;
  let upNext: NextActivity[] = [];
  const completedModules: CompletedModule[] = [];

  for (const slug of slugPriority) {
    if (!isAllowed(slug)) continue;
    try {
      const deep = await loadModule(slug);
      if (isCancelled?.()) return null;

      const ordered = flattenModule(deep);
      if (ordered.length === 0) continue;

      const completedSet = new Set(
        progress
          .filter((p) => p?.moduleSlug === slug && p?.status === "COMPLETED")
          .map((p) => String(p.activityId)),
      );

      const firstIncomplete = ordered.find(
        (x) => !completedSet.has(String(x.activityId)),
      );

      if (firstIncomplete) {
        // Found the next activity to do
        nextOne = firstIncomplete;
        const startIdx = ordered.findIndex(
          (x) => x.activityId === firstIncomplete.activityId,
        );
        // Get activities AFTER nextOne (not including it)
        upNext = ordered.slice(startIdx + 1, startIdx + 1 + UP_NEXT_COUNT);
        break;
      } else {
        // Module is complete
        completedModules.push({ slug, title: deep.title || slug });
      }
    } catch (e) {
      // Skip module on fetch failure
      onLoadError?.(slug, e);
    }
  }

  return { nextOne, upNext, completedModules };
}
