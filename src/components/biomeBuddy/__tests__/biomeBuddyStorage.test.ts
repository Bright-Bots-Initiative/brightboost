import { describe, expect, it } from "vitest";
import { starterRecipe, type BuddyRecipe } from "../biomeBuddyModel";
import {
  DRAFT_KEY,
  GALLERY_KEY,
  PROGRESS_KEY,
  clearDraft,
  deleteBuddy,
  loadDraft,
  loadGallery,
  loadProgress,
  newBuddyId,
  saveBuddy,
  saveDraft,
  saveProgress,
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

  it("skips corrupt ENTRIES and keeps the good ones (never crashes)", () => {
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

  it("a lastTest blob that is not a summary is dropped, the Buddy is kept", () => {
    const storage = fakeStorage({
      [GALLERY_KEY]: JSON.stringify([
        { ...buddy("bb-one"), lastTest: "garbage" },
      ]),
    });
    expect(loadGallery(storage)[0].lastTest).toBeNull();
  });

  it("quota failure returns false and never throws; disabled storage returns false", () => {
    expect(saveBuddy(buddy("bb-one"), fullStorage())).toBe(false);
    expect(deleteBuddy("bb-one", fullStorage())).toBe(false);
    expect(saveBuddy(buddy("bb-one"), null)).toBe(false);
    expect(loadGallery(null)).toEqual([]);
  });
});

describe("draft", () => {
  it("round-trips and validates the recipe on read", () => {
    const storage = fakeStorage();
    const recipe = starterRecipe("air");
    expect(
      saveDraft(
        {
          id: null,
          band: "k2",
          recipe,
          lastTested: { biome: "air", traits: recipe.traits },
          lastTest: null,
          named: false,
        },
        storage,
      ),
    ).toBe(true);
    const back = loadDraft(storage);
    expect(back?.recipe).toEqual(recipe);
    expect(back?.band).toBe("k2");
    expect(back?.id).toBeNull();
    expect(back?.lastTested).toEqual({ biome: "air", traits: recipe.traits });
    expect(back?.named).toBe(false);
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

  it("drops a corrupt lastTested but keeps the draft", () => {
    const storage = fakeStorage({
      [DRAFT_KEY]: JSON.stringify({
        band: "g35",
        recipe: starterRecipe(),
        lastTested: { biome: "lava", traits: "x" },
        named: true,
      }),
    });
    const back = loadDraft(storage);
    expect(back?.lastTested).toBeNull();
    expect(back?.named).toBe(true);
  });

  it("clearDraft removes the key (or blanks it when removeItem is missing)", () => {
    const storage = fakeStorage({ [DRAFT_KEY]: "x" });
    clearDraft(storage);
    expect(storage.data[DRAFT_KEY]).toBeUndefined();
    const noRemove: StorageLike & { data: Record<string, string> } = {
      data: { [DRAFT_KEY]: "x" },
      getItem: (k) => noRemove.data[k] ?? null,
      setItem: (k, v) => {
        noRemove.data[k] = v;
      },
    };
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
