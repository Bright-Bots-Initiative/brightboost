import { describe, expect, it } from "vitest";
import {
  DRAFT_KEY,
  GALLERY_KEY,
  loadDraft,
  loadGallery,
  loadSeen,
  newRiverId,
  restoreCells,
  saveDraft,
  saveRiver,
  saveSeen,
  snapshotCells,
  uniqueName,
  type SavedRiver,
  type StorageLike,
} from "../waterworksStorage";
import { freshGrid, tapCell } from "../waterworksSim";

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

function river(id: string, name: string): SavedRiver {
  return {
    id,
    name,
    band: "k2",
    cells: snapshotCells(freshGrid("k2")),
    savedAt: 1,
  };
}

describe("snapshot / restore", () => {
  it("round-trips parts and gate states; water is never persisted", () => {
    let g = freshGrid("k2");
    g = tapCell(g, 2, 2, "gate");
    g = tapCell(g, 2, 2, "channel"); // toggle the gate closed
    g = tapCell(g, 4, 4, "field");
    const restored = restoreCells(snapshotCells(g));
    expect(restored[2][2].type).toBe("gate");
    expect(restored[2][2].gateOpen).toBe(false);
    expect(restored[4][4].type).toBe("field");
    expect(restored[4][4].water).toBe(0);
  });

  it("an unknown saved cell type restores as land (forward-compat)", () => {
    const cells = snapshotCells(freshGrid("k2"));
    cells[0][0] = { t: "volcano" as never };
    expect(restoreCells(cells)[0][0].type).toBe("land");
  });

  it("normalizes fixed sources and houses even when a local snapshot moved them", () => {
    const cells = snapshotCells(freshGrid("k2"));
    cells[0][0] = { t: "source" };
    cells[3][0] = { t: "field" };
    cells[1][10] = { t: "channel" };
    const restored = restoreCells(cells);
    expect(restored[0][0].type).toBe("land");
    expect(restored[3][0].type).toBe("source");
    expect(restored[1][10].type).toBe("house");
  });
});

describe("gallery — resilience (design §5)", () => {
  it("a corrupt whole blob reads as empty, never crashes", () => {
    const s = fakeStorage({ [GALLERY_KEY]: "not json {{{" });
    expect(loadGallery(s)).toEqual([]);
  });

  it("a corrupt ENTRY is skipped; valid neighbors survive", () => {
    const good = river("a", "Good River");
    const s = fakeStorage({
      [GALLERY_KEY]: JSON.stringify([
        good,
        { junk: true },
        null,
        42,
        { id: "b" },
      ]),
    });
    const loaded = loadGallery(s);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("a");
  });

  it("skips entries with an invalid band or timestamp", () => {
    const good = river("a", "Good River");
    const s = fakeStorage({
      [GALLERY_KEY]: JSON.stringify([
        good,
        { ...good, id: "bad-band", band: "k9" },
        { ...good, id: "bad-time", savedAt: "yesterday" },
      ]),
    });
    expect(loadGallery(s).map((entry) => entry.id)).toEqual(["a"]);
  });

  it("QUOTA DEGRADATION is graceful: saveRiver returns false and never throws", () => {
    const s = fullStorage();
    expect(() => saveRiver(river("a", "Big"), s)).not.toThrow();
    expect(saveRiver(river("a", "Big"), s)).toBe(false);
  });

  it("missing storage (privacy mode) degrades the same way", () => {
    expect(loadGallery(null)).toEqual([]);
    expect(saveRiver(river("a", "X"), null)).toBe(false);
    expect(loadDraft(null)).toBeNull();
  });
});

describe("gallery — save-in-place (the leads' fork bug, fixed)", () => {
  it("saving the same id twice UPSERTS — rename never forks a new copy", () => {
    const s = fakeStorage();
    expect(saveRiver(river("a", "小河"), s)).toBe(true);
    expect(saveRiver({ ...river("a", "小河 improved"), savedAt: 2 }, s)).toBe(
      true,
    );
    const gallery = loadGallery(s);
    expect(gallery).toHaveLength(1);
    expect(gallery[0].name).toBe("小河 improved");
  });

  it("different ids append", () => {
    const s = fakeStorage();
    saveRiver(river("a", "One"), s);
    saveRiver(river("b", "Two"), s);
    expect(loadGallery(s)).toHaveLength(2);
  });

  it("newRiverId is unique-ish", () => {
    expect(newRiverId()).not.toBe(newRiverId());
  });
});

describe("uniqueName — duplicate guard", () => {
  const gallery = [river("a", "小河"), river("b", "小河 2")];

  it("auto-suffixes instead of blocking (case-insensitive)", () => {
    expect(uniqueName("小河", gallery)).toBe("小河 3");
    expect(uniqueName("New River", gallery)).toBe("New River");
  });

  it("a build renaming to its OWN current name is not a duplicate", () => {
    expect(uniqueName("小河", gallery, "a")).toBe("小河");
  });

  it("reserves room for a suffix when a duplicate name is already 24 characters", () => {
    const maxName = "abcdefghijklmnopqrstuvwx";
    const result = uniqueName(maxName, [river("max", maxName)]);
    expect(result).toBe("abcdefghijklmnopqrstuv 2");
    expect(Array.from(result)).toHaveLength(24);
  });
});

describe("draft — autosave-on-navigate", () => {
  it("round-trips the working build including unlock progress", () => {
    const s = fakeStorage();
    const ok = saveDraft(
      {
        id: null,
        name: "",
        band: "k2",
        cells: snapshotCells(freshGrid("k2")),
        progress: {
          anyFieldWateredEver: true,
          twoFieldsInOneRun: false,
          floodSeenEver: true,
          runsCompleted: 4,
          completedTargetIds: ["k2Water1"],
        },
      },
      s,
    );
    expect(ok).toBe(true);
    const draft = loadDraft(s);
    expect(draft?.band).toBe("k2");
    expect(draft?.progress.floodSeenEver).toBe(true);
    expect(draft?.progress.runsCompleted).toBe(4);
    expect(draft?.progress.completedTargetIds).toEqual(["k2Water1"]);
    expect(draft?.id).toBeNull();
  });

  it("rejects a corrupt or wrong-shape draft as null (fresh start, no crash)", () => {
    expect(loadDraft(fakeStorage({ [DRAFT_KEY]: "]]]" }))).toBeNull();
    expect(
      loadDraft(
        fakeStorage({ [DRAFT_KEY]: JSON.stringify({ band: "k9", cells: [] }) }),
      ),
    ).toBeNull();
  });
});

describe("seen flags", () => {
  it("corrupt flags read as empty; saving never throws on a full device", () => {
    expect(loadSeen(fakeStorage({ "waterworks:seen:v1": "{bad" }))).toEqual({});
    expect(loadSeen(fakeStorage({ "waterworks:seen:v1": "5" }))).toEqual({});
    const s = fullStorage();
    expect(() => saveSeen({ help: true }, s)).not.toThrow();
  });
});
