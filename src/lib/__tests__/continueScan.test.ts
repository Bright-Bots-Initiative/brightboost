/**
 * #856 — the dashboard Continue / "Play Next" scan.
 *
 * Two properties are pinned here:
 * 1. **Parity.** With everything allowed, the scan produces exactly what the
 *    old inline loop produced: modules visited most-recently-progressed first
 *    then in catalog order, the first incomplete activity wins, `upNext` is the
 *    three activities after it, and fully-complete modules accumulate.
 * 2. **Enforcement.** A target the access policy refuses is never the Continue
 *    target — and is never even fetched.
 */
import { describe, it, expect, vi } from "vitest";
import {
  buildModuleSlugPriority,
  flattenModule,
  scanForNextActivity,
  type ProgressEntry,
} from "@/lib/continueScan";

function moduleFixture(slug: string, activityIds: string[]) {
  return {
    slug,
    title: `${slug} title`,
    units: [
      {
        id: `${slug}-u1`,
        title: "Unit 1",
        order: 1,
        lessons: [
          {
            id: `${slug}-l1`,
            title: "Lesson 1",
            order: 1,
            activities: activityIds.map((id, i) => ({
              id,
              title: `${id} title`,
              kind: i % 2 === 0 ? "INFO" : "INTERACT",
              order: i + 1,
            })),
          },
        ],
      },
    ],
  };
}

const CATALOG = {
  "mod-a": moduleFixture("mod-a", ["a1", "a2", "a3", "a4", "a5"]),
  "mod-b": moduleFixture("mod-b", ["b1", "b2"]),
  "locked-mod": moduleFixture("locked-mod", ["l1", "l2"]),
  "hidden-mod": moduleFixture("hidden-mod", ["h1", "h2"]),
};

function loaderFor(seen?: string[]) {
  return vi.fn(async (slug: string) => {
    seen?.push(slug);
    const found = (CATALOG as Record<string, unknown>)[slug];
    if (!found) throw new Error(`no module ${slug}`);
    return found;
  });
}

const ALLOW_ALL = () => true;

describe("buildModuleSlugPriority", () => {
  it("puts recently progressed modules first, then catalog order", () => {
    const progress: ProgressEntry[] = [
      { moduleSlug: "mod-b", updatedAt: "2026-01-02T00:00:00Z" },
      { moduleSlug: "locked-mod", updatedAt: "2026-01-03T00:00:00Z" },
    ];
    expect(
      buildModuleSlugPriority(
        [{ slug: "mod-a" }, { slug: "mod-b" }, { slug: "locked-mod" }],
        progress,
      ),
    ).toEqual(["locked-mod", "mod-b", "mod-a"]);
  });

  it("ignores progress rows with no slug or an unparseable date", () => {
    expect(
      buildModuleSlugPriority([{ slug: "mod-a" }], [
        { moduleSlug: null, updatedAt: "2026-01-02T00:00:00Z" },
        { moduleSlug: "mod-b", updatedAt: "not-a-date" },
        { moduleSlug: "mod-c" },
      ] as ProgressEntry[]),
    ).toEqual(["mod-a"]);
  });
});

describe("scanForNextActivity — parity on allowed-only fixtures", () => {
  it("picks the first incomplete activity in priority order", async () => {
    const result = await scanForNextActivity({
      slugPriority: ["mod-a", "mod-b"],
      progress: [
        { moduleSlug: "mod-a", activityId: "a1", status: "COMPLETED" },
        { moduleSlug: "mod-a", activityId: "a2", status: "COMPLETED" },
      ],
      loadModule: loaderFor(),
      isAllowed: ALLOW_ALL,
    });

    expect(result?.nextOne?.activityId).toBe("a3");
    // upNext is the three activities AFTER nextOne, not including it.
    expect(result?.upNext.map((a) => a.activityId)).toEqual(["a4", "a5"]);
    expect(result?.completedModules).toEqual([]);
  });

  it("caps upNext at three follow-ups", async () => {
    const result = await scanForNextActivity({
      slugPriority: ["mod-a"],
      progress: [],
      loadModule: loaderFor(),
      isAllowed: ALLOW_ALL,
    });
    expect(result?.nextOne?.activityId).toBe("a1");
    expect(result?.upNext.map((a) => a.activityId)).toEqual(["a2", "a3", "a4"]);
  });

  it("records fully-complete modules and moves on", async () => {
    const result = await scanForNextActivity({
      slugPriority: ["mod-b", "mod-a"],
      progress: [
        { moduleSlug: "mod-b", activityId: "b1", status: "COMPLETED" },
        { moduleSlug: "mod-b", activityId: "b2", status: "COMPLETED" },
      ],
      loadModule: loaderFor(),
      isAllowed: ALLOW_ALL,
    });

    expect(result?.completedModules).toEqual([
      { slug: "mod-b", title: "mod-b title" },
    ]);
    expect(result?.nextOne?.moduleSlug).toBe("mod-a");
  });

  it("skips a module that fails to load and reports it", async () => {
    const onLoadError = vi.fn();
    const result = await scanForNextActivity({
      slugPriority: ["ghost-mod", "mod-b"],
      progress: [],
      loadModule: loaderFor(),
      isAllowed: ALLOW_ALL,
      onLoadError,
    });

    expect(onLoadError).toHaveBeenCalledWith("ghost-mod", expect.any(Error));
    expect(result?.nextOne?.moduleSlug).toBe("mod-b");
  });

  it("returns null when the caller cancelled mid-scan", async () => {
    let cancelled = false;
    const result = await scanForNextActivity({
      slugPriority: ["mod-a", "mod-b"],
      progress: [],
      loadModule: async (slug) => {
        cancelled = true;
        return (CATALOG as Record<string, unknown>)[slug];
      },
      isAllowed: ALLOW_ALL,
      isCancelled: () => cancelled,
    });
    expect(result).toBeNull();
  });

  it("returns an empty result for an empty priority list", async () => {
    const loadModule = loaderFor();
    const result = await scanForNextActivity({
      slugPriority: [],
      progress: [],
      loadModule,
      isAllowed: ALLOW_ALL,
    });
    expect(result).toEqual({
      nextOne: null,
      upNext: [],
      completedModules: [],
    });
    expect(loadModule).not.toHaveBeenCalled();
  });
});

describe("scanForNextActivity — refused targets can never be Continue", () => {
  it("skips a locked module the old scan would have picked first", async () => {
    const seen: string[] = [];
    // The locked module has the most recent progress, so the *old* scan (which
    // filtered on specialization only) put it first and Continue pointed at it.
    const slugPriority = ["locked-mod", "mod-a"];
    const progress: ProgressEntry[] = [
      {
        moduleSlug: "locked-mod",
        activityId: "l1",
        status: "COMPLETED",
        updatedAt: "2026-01-03T00:00:00Z",
      },
    ];

    const before = await scanForNextActivity({
      slugPriority,
      progress,
      loadModule: loaderFor(),
      isAllowed: ALLOW_ALL,
    });
    expect(before?.nextOne?.moduleSlug).toBe("locked-mod");

    const after = await scanForNextActivity({
      slugPriority,
      progress,
      loadModule: loaderFor(seen),
      isAllowed: (slug) => slug !== "locked-mod",
    });

    expect(after?.nextOne?.moduleSlug).toBe("mod-a");
    expect(after?.nextOne?.activityId).toBe("a1");
    // Refused content is not merely hidden from the result — it is not fetched.
    expect(seen).toEqual(["mod-a"]);
  });

  it("skips a hidden module so Continue cannot dead-end bounce", async () => {
    const seen: string[] = [];
    const result = await scanForNextActivity({
      slugPriority: ["hidden-mod", "mod-b"],
      progress: [],
      loadModule: loaderFor(seen),
      isAllowed: (slug) => slug !== "hidden-mod",
    });
    expect(result?.nextOne?.moduleSlug).toBe("mod-b");
    expect(seen).toEqual(["mod-b"]);
  });

  it("yields no Continue target at all when every module is refused", async () => {
    const loadModule = loaderFor();
    const result = await scanForNextActivity({
      slugPriority: ["locked-mod", "hidden-mod"],
      progress: [],
      loadModule,
      isAllowed: () => false,
    });
    expect(result).toEqual({
      nextOne: null,
      upNext: [],
      completedModules: [],
    });
    expect(loadModule).not.toHaveBeenCalled();
  });

  it("does not count a refused module as a completed module", async () => {
    const result = await scanForNextActivity({
      slugPriority: ["locked-mod", "mod-a"],
      progress: [
        { moduleSlug: "locked-mod", activityId: "l1", status: "COMPLETED" },
        { moduleSlug: "locked-mod", activityId: "l2", status: "COMPLETED" },
      ],
      loadModule: loaderFor(),
      isAllowed: (slug) => slug !== "locked-mod",
    });
    expect(result?.completedModules).toEqual([]);
  });
});

describe("flattenModule ordering", () => {
  it("orders units, lessons and activities by their order field", () => {
    const flattened = flattenModule({
      slug: "s",
      title: "T",
      units: [
        {
          id: "u2",
          title: "U2",
          order: 2,
          lessons: [
            {
              id: "l1",
              title: "L1",
              order: 1,
              activities: [{ id: "z", title: "Z", kind: "INFO", order: 1 }],
            },
          ],
        },
        {
          id: "u1",
          title: "U1",
          order: 1,
          lessons: [
            {
              id: "l0",
              title: "L0",
              order: 1,
              activities: [
                { id: "b", title: "B", kind: "INFO", order: 2 },
                { id: "a", title: "A", kind: "INFO", order: 1 },
              ],
            },
          ],
        },
      ],
    });

    expect(flattened.map((x) => x.activityId)).toEqual(["a", "b", "z"]);
    expect(flattened.map((x) => x.orderKey)).toEqual([
      "1.1.1",
      "1.1.2",
      "2.1.1",
    ]);
  });
});
