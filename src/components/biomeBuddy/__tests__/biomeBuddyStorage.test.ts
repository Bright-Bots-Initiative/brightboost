import { describe, expect, it } from "vitest";
import {
  diffBuilds,
  starterRecipe,
  type BuddyRecipe,
  type TestSummary,
} from "../biomeBuddyModel";
import {
  DRAFT_KEY,
  GALLERY_KEY,
  PROGRESS_KEY,
  clearDraft,
  coerceTestSummary,
  deleteBuddy,
  loadDraft,
  loadGallery,
  loadProgress,
  newBuddyId,
  saveBuddy,
  saveDraft,
  saveProgress,
  type DraftState,
  type SavedBuddy,
  type StorageLike,
} from "../biomeBuddyStorage";

function fakeStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

/** A storage whose writes always fail — the quota-exceeded device. */
function fullStorage(initial: Record<string, string> = {}): StorageLike {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: () => {
      throw new DOMException("QuotaExceededError");
    },
  };
}

function buddy(id: string, recipe: BuddyRecipe = starterRecipe()): SavedBuddy {
  return { id, recipe, savedAt: 1, lastTest: null };
}

/** A genuine walkthrough: starter → fins in water. */
function realSummary(): TestSummary {
  const next = starterRecipe("water");
  next.traits.movement = "fins";
  return diffBuilds(null, next);
}

function validDraft(): DraftState {
  const recipe = starterRecipe("air");
  recipe.traits.eyes = "compound_eyes";
  return {
    id: "bb-draft-1",
    band: "g35",
    recipe,
    // deliberately DIFFERENT from the recipe, so a reader that ignores it
    // (or copies the recipe) is caught
    lastTested: { biome: "earth", traits: { ...starterRecipe().traits } },
    lastTest: realSummary(),
    named: true,
  };
}

describe("ids", () => {
  it("newBuddyId is namespaced, unique and survives the reader's id check", () => {
    const a = newBuddyId();
    const b = newBuddyId();
    expect(a).toMatch(/^bb-/);
    expect(a).not.toBe(b);
    const storage = fakeStorage();
    saveBuddy(buddy(a), storage);
    expect(loadGallery(storage).map((x) => x.id)).toEqual([a]);
  });
});

describe("gallery", () => {
  it("create → reload → same record (stable id, recipe re-validated)", () => {
    const storage = fakeStorage();
    const recipe = starterRecipe("water");
    recipe.traits.nose = "gills";
    expect(saveBuddy(buddy("bb-one", recipe), storage)).toBe(true);
    const back = loadGallery(storage);
    expect(back).toHaveLength(1);
    expect(back[0].id).toBe("bb-one");
    expect(back[0].recipe).toEqual(recipe);
  });

  it("update = UPSERT by id (save-in-place never forks a copy)", () => {
    const storage = fakeStorage();
    saveBuddy(buddy("bb-one"), storage);
    const revised = starterRecipe("fire");
    revised.name = { adjective: "brave", noun: "digger" };
    saveBuddy({ ...buddy("bb-one", revised), savedAt: 2 }, storage);
    const back = loadGallery(storage);
    expect(back).toHaveLength(1);
    expect(back[0].recipe.biome).toBe("fire");
    expect(back[0].recipe.name.noun).toBe("digger");
    expect(back[0].savedAt).toBe(2);
  });

  it("delete removes exactly that id", () => {
    const storage = fakeStorage();
    saveBuddy(buddy("bb-one"), storage);
    saveBuddy(buddy("bb-two"), storage);
    expect(deleteBuddy("bb-one", storage)).toBe(true);
    expect(loadGallery(storage).map((b) => b.id)).toEqual(["bb-two"]);
    expect(deleteBuddy("bb-missing", storage)).toBe(true); // idempotent
  });

  it("skips corrupt ENTRIES and keeps the good ones — rejected by recipe validation, not by the id check", () => {
    const good = buddy("bb-good");
    const storage = fakeStorage({
      [GALLERY_KEY]: JSON.stringify([
        good,
        null,
        42,
        "string",
        { id: "bb-no-recipe" },
        {
          id: "bb-bad-recipe",
          recipe: { ...good.recipe, biome: "lava" },
          savedAt: 1,
        },
        {
          id: "bb-extra-field",
          recipe: { ...good.recipe, stats: {} },
          savedAt: 1,
        },
        {
          id: "bb-future-version",
          recipe: { ...good.recipe, version: 2 },
          savedAt: 1,
        },
        { id: "not-namespaced", recipe: good.recipe, savedAt: 1 },
        { id: "bb-bad-time", recipe: good.recipe, savedAt: "yesterday" },
        { id: "bb-good", recipe: good.recipe, savedAt: 9 }, // duplicate id → first wins
      ]),
    });
    const back = loadGallery(storage);
    expect(back.map((b) => b.id)).toEqual(["bb-good"]);
    expect(back[0].savedAt).toBe(1);
  });

  it("a corrupt whole blob reads as empty", () => {
    expect(loadGallery(fakeStorage({ [GALLERY_KEY]: "{not json" }))).toEqual(
      [],
    );
    expect(loadGallery(fakeStorage({ [GALLERY_KEY]: '{"a":1}' }))).toEqual([]);
    expect(loadGallery(fakeStorage({ [GALLERY_KEY]: "null" }))).toEqual([]);
  });

  it("keeps a genuine lastTest and drops a hostile one (the Buddy itself survives)", () => {
    const real = realSummary();
    const hostile = {
      ...real,
      changes: [
        {
          ...real.changes[0],
          changedContributions: [
            { category: "movement", option: "laser_fins", base: 1, mod: 1 },
          ],
        },
      ],
    };
    const storage = fakeStorage({
      [GALLERY_KEY]: JSON.stringify([
        { ...buddy("bb-real"), lastTest: real },
        { ...buddy("bb-hostile"), lastTest: hostile },
        { ...buddy("bb-garbage"), lastTest: "garbage" },
      ]),
    });
    const back = loadGallery(storage);
    expect(back.map((b) => b.id)).toEqual([
      "bb-real",
      "bb-hostile",
      "bb-garbage",
    ]);
    expect(back[0].lastTest).toEqual(real);
    expect(back[1].lastTest).toBeNull();
    expect(back[2].lastTest).toBeNull();
  });

  it("quota failure returns false and never throws; disabled storage returns false", () => {
    expect(saveBuddy(buddy("bb-one"), fullStorage())).toBe(false);
    expect(deleteBuddy("bb-one", fullStorage())).toBe(false);
    expect(saveBuddy(buddy("bb-one"), null)).toBe(false);
    expect(loadGallery(null)).toEqual([]);
  });
});

describe("coerceTestSummary (a stored walkthrough is re-validated, never trusted)", () => {
  it("round-trips a genuine summary byte for byte", () => {
    const real = realSummary();
    expect(coerceTestSummary(JSON.parse(JSON.stringify(real)))).toEqual(real);
    expect(real.changes.length).toBeGreaterThan(0); // the fixture is not trivial
  });

  it.each([
    ["not an object", 42],
    ["null", null],
    ["array", []],
    ["unknown biome", { ...realSummary(), biome: "lava" }],
    ["missing before", { ...realSummary(), before: undefined }],
    [
      "non-numeric stat",
      { ...realSummary(), after: { ...realSummary().after, sight: "high" } },
    ],
    [
      "NaN stat",
      {
        ...realSummary(),
        after: { ...realSummary().after, smell: Number.NaN },
      },
    ],
    ["changes not an array", { ...realSummary(), changes: {} }],
    [
      "five changes",
      {
        ...realSummary(),
        changes: [0, 1, 2, 3, 4].map(() => realSummary().changes[0]),
      },
    ],
    [
      "duplicate stat",
      {
        ...realSummary(),
        changes: [realSummary().changes[0], realSummary().changes[0]],
      },
    ],
    [
      "unknown stat",
      {
        ...realSummary(),
        changes: [{ ...realSummary().changes[0], stat: "luck" }],
      },
    ],
    [
      "unknown category",
      {
        ...realSummary(),
        changes: [
          {
            ...realSummary().changes[0],
            changedContributions: [
              { category: "touch", option: "whiskers", base: 1, mod: 1 },
            ],
          },
        ],
      },
    ],
    [
      "option of another category",
      {
        ...realSummary(),
        changes: [
          {
            ...realSummary().changes[0],
            changedContributions: [
              { category: "eyes", option: "fins", base: 1, mod: 1 },
            ],
          },
        ],
      },
    ],
    [
      "non-finite contribution",
      {
        ...realSummary(),
        changes: [
          {
            ...realSummary().changes[0],
            changedContributions: [
              { category: "movement", option: "fins", base: Infinity, mod: 1 },
            ],
          },
        ],
      },
    ],
  ])("refuses %s", (_label, value) => {
    expect(coerceTestSummary(value)).toBeNull();
  });

  it("clamps out-of-range numbers and normalises the flag instead of trusting them", () => {
    const real = realSummary();
    const out = coerceTestSummary({
      ...real,
      before: { ...real.before, sight: 900 },
      after: { ...real.after, hearing: -5 },
      unchanged: "yes",
    });
    expect(out?.before.sight).toBe(100);
    expect(out?.after.hearing).toBe(0);
    expect(out?.unchanged).toBe(false);
  });
});

describe("draft", () => {
  it("round-trips a full draft, including a lastTested that differs from the recipe and a real lastTest", () => {
    const storage = fakeStorage();
    const draft = validDraft();
    expect(saveDraft(draft, storage)).toBe(true);
    const back = loadDraft(storage);
    expect(back).toEqual(draft);
    expect(back?.lastTested).not.toEqual({
      biome: draft.recipe.biome,
      traits: draft.recipe.traits,
    });
  });

  it("returns null for corrupt or invalid drafts instead of crashing", () => {
    expect(loadDraft(fakeStorage({ [DRAFT_KEY]: "nope" }))).toBeNull();
    expect(
      loadDraft(fakeStorage({ [DRAFT_KEY]: JSON.stringify({ band: "k2" }) })),
    ).toBeNull();
    expect(
      loadDraft(
        fakeStorage({
          [DRAFT_KEY]: JSON.stringify({ band: "g99", recipe: starterRecipe() }),
        }),
      ),
    ).toBeNull();
    expect(
      loadDraft(
        fakeStorage({
          [DRAFT_KEY]: JSON.stringify({
            band: "k2",
            recipe: { ...starterRecipe(), pattern: "plaid" },
          }),
        }),
      ),
    ).toBeNull();
  });

  it("drops a corrupt lastTested and a hostile lastTest but keeps the draft", () => {
    const draft = validDraft();
    const storage = fakeStorage({
      [DRAFT_KEY]: JSON.stringify({
        ...draft,
        lastTested: { biome: "lava", traits: "x" },
        lastTest: { ...draft.lastTest, biome: "lava" },
      }),
    });
    const back = loadDraft(storage);
    expect(back?.recipe).toEqual(draft.recipe);
    expect(back?.lastTested).toBeNull();
    expect(back?.lastTest).toBeNull();
    expect(back?.named).toBe(true);
  });

  it("clearDraft removes a VALID draft (and blanks it when removeItem is missing)", () => {
    const storage = fakeStorage();
    saveDraft(validDraft(), storage);
    expect(loadDraft(storage)).not.toBeNull();
    clearDraft(storage);
    expect(storage.data[DRAFT_KEY]).toBeUndefined();
    expect(loadDraft(storage)).toBeNull();

    const noRemove: StorageLike & { data: Record<string, string> } = {
      data: {},
      getItem: (k) => noRemove.data[k] ?? null,
      setItem: (k, v) => {
        noRemove.data[k] = v;
      },
    };
    saveDraft(validDraft(), noRemove);
    expect(loadDraft(noRemove)).not.toBeNull();
    clearDraft(noRemove);
    expect(loadDraft(noRemove)).toBeNull();
  });
});

describe("progress", () => {
  it("defaults to zero tests and no band; tolerates garbage", () => {
    expect(loadProgress(fakeStorage())).toEqual({
      guidedTestsCompleted: 0,
      band: null,
    });
    expect(loadProgress(fakeStorage({ [PROGRESS_KEY]: "[]" }))).toEqual({
      guidedTestsCompleted: 0,
      band: null,
    });
    expect(
      loadProgress(
        fakeStorage({
          [PROGRESS_KEY]: JSON.stringify({
            guidedTestsCompleted: -4,
            band: "x",
          }),
        }),
      ),
    ).toEqual({ guidedTestsCompleted: 0, band: null });
    expect(
      loadProgress(
        fakeStorage({
          [PROGRESS_KEY]: JSON.stringify({
            guidedTestsCompleted: 2.7,
            band: "g68",
          }),
        }),
      ),
    ).toEqual({ guidedTestsCompleted: 2, band: "g68" });
  });

  it("round-trips and never throws on a full device", () => {
    const storage = fakeStorage();
    saveProgress({ guidedTestsCompleted: 3, band: "k2" }, storage);
    expect(loadProgress(storage)).toEqual({
      guidedTestsCompleted: 3,
      band: "k2",
    });
    expect(() =>
      saveProgress({ guidedTestsCompleted: 1, band: null }, fullStorage()),
    ).not.toThrow();
  });
});
