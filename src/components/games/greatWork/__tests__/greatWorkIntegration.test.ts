import { describe, expect, it, vi } from "vitest";
import {
  createSimState,
  step,
  resultOf,
  runMachine,
  glyphCells,
} from "@shared/greatwork-engine";
import type { LevelSpec, MachineSpec, Part } from "@shared/greatwork-engine";
import { resolveBandConfig, effectiveBandConfig } from "../greatWorkBandConfig";
import {
  BUILDER_BOUNDS,
  starterMachine,
  makePart,
  placePart,
  movePart,
  turnPart,
  removePart,
  editTape,
  partFootprint,
  programFitsConfig,
} from "../greatWorkModel";
import { EnginePlayback } from "../transport/playback";
import type { PlaybackClock } from "../transport/playback";
import { fitCamera, engineArea } from "../greatWorkView";
import { drawBoard } from "../board/drawBoard";
import type { BoardContext, BoardScene } from "../board/drawBoard";
import { drawAreaOverlay } from "../board/drawAreaOverlay";
const level: LevelSpec = {
  key: "builder-integration",
  mode: "open",
  fixedParts: [],
  bounds: BUILDER_BOUNDS,
  maxTicks: 30,
};
const k2 = resolveBandConfig("k2");
const g35 = resolveBandConfig("g3_5");
function clock() {
  let next = 0;
  const jobs = new Map<number, { callback: () => void; ms: number }>();
  const scheduler: PlaybackClock = {
    set(callback, ms) {
      const id = ++next;
      jobs.set(id, { callback, ms });
      return id;
    },
    clear(id) {
      jobs.delete(Number(id));
    },
  };
  return {
    scheduler,
    jobs,
    tick() {
      const entry = [...jobs.entries()][0];
      if (!entry) throw Error("No pending timer");
      jobs.delete(entry[0]);
      entry[1].callback();
    },
  };
}
function recordingContext() {
  const calls: unknown[][] = [];
  const context = new Proxy(
    {},
    {
      get(_target, name) {
        return (...args: unknown[]) => {
          calls.push([String(name), ...args]);
        };
      },
      set(_target, name, value) {
        calls.push(["set", String(name), value]);
        return true;
      },
    },
  ) as BoardContext;
  return { context, calls };
}
describe("builder edits against the merged engine", () => {
  it("builds a runnable machine through actual placement and tape-edit commands", () => {
    let program: MachineSpec = { parts: [], tapes: [] };
    program = placePart(
      level,
      program,
      { kind: "arm" },
      { q: 0, r: 0 },
      0,
      k2,
    )!;
    program = placePart(
      level,
      program,
      { kind: "dispenser", element: "fire" },
      { q: 1, r: 0 },
      0,
      k2,
    )!;
    program = placePart(
      level,
      program,
      { kind: "acceptor" },
      { q: 0, r: 1 },
      0,
      k2,
    )!;
    for (const [index, instruction] of (
      ["GRAB", "ROTATE_CW", "DROP"] as const
    ).entries())
      program = editTape(program, 1, { type: "put", index, instruction }, k2)!;
    const result = runMachine(level, program);
    expect(result.produced).toHaveLength(1);
    expect(result.produced[0].molecule.atoms[0].element).toBe("fire");
    expect(result.produced[0].count).toBe(1);
  });
  it("rejects placing a second source in an occupied source cell", () => {
    expect(
      placePart(
        level,
        starterMachine(),
        { kind: "dispenser", element: "water" },
        { q: 1, r: 0 },
        0,
        k2,
      ),
    ).toBeNull();
  });
  it("rejects placements outside the lesson bounds", () => {
    expect(
      placePart(
        level,
        starterMachine(),
        { kind: "acceptor" },
        { q: 8, r: 0 },
        0,
        k2,
      ),
    ).toBeNull();
  });
  it.each([0, 1, 2, 3, 4, 5] as const)(
    "previews the full engine-owned growth footprint facing %i",
    (facing) => {
      const part = makePart(
        { kind: "glyph", glyph: "growth" },
        4,
        { q: -2, r: -1 },
        facing,
      );
      if (part.kind !== "glyph") throw Error("Expected glyph");
      expect(partFootprint(part)).toEqual(glyphCells(part.glyph));
      expect(partFootprint(part).length).toBeGreaterThan(1);
    },
  );
  it("moves and rotates a part without editing the original design", () => {
    const initial = starterMachine(),
      frozen = JSON.stringify(initial);
    const moved = movePart(level, initial, 1, { q: -2, r: 0 })!;
    const turned = turnPart(level, moved, 1, 1)!;
    expect(turned.parts.find((p) => p.id === 1)).toMatchObject({
      anchor: { q: -2, r: 0 },
      facing: 1,
      reach: 1,
      grabbers: 1,
    });
    expect(JSON.stringify(initial)).toBe(frozen);
  });
  it("removes only the selected arm and that arm's tape", () => {
    const initial = starterMachine();
    const withArm = placePart(
      level,
      initial,
      { kind: "arm" },
      { q: -3, r: 0 },
      0,
      g35,
    )!;
    const removed = removePart(withArm, 1);
    expect(removed.parts.map((p) => p.id)).toEqual([2, 3, 4]);
    expect(removed.tapes.map((t) => t.armId)).toEqual([4]);
    expect(initial.tapes).toHaveLength(1);
  });
  it("removes and reorders individual instructions without clearing the tape", () => {
    const initial = starterMachine();
    const reordered = editTape(
      initial,
      1,
      { type: "reorder", from: 0, to: 2 },
      k2,
    )!;
    expect(reordered.tapes[0].chips).toEqual(["ROTATE_CW", "DROP", "GRAB"]);
    expect(
      editTape(reordered, 1, { type: "remove", index: 1 }, k2)?.tapes[0].chips,
    ).toEqual(["ROTATE_CW", "GRAB"]);
    expect(initial.tapes[0].chips).toEqual(["GRAB", "ROTATE_CW", "DROP"]);
  });
  it("refuses hidden instructions, a fourth K–2 slot, and invalid indexes", () => {
    const initial = starterMachine();
    expect(
      editTape(
        initial,
        1,
        { type: "put", index: 0, instruction: "REPEAT" },
        k2,
      ),
    ).toBeNull();
    expect(
      editTape(initial, 1, { type: "put", index: 3, instruction: "GRAB" }, k2),
    ).toBeNull();
    expect(editTape(initial, 1, { type: "remove", index: -1 }, k2)).toBeNull();
    expect(
      editTape(initial, 1, { type: "reorder", from: 0, to: 7 }, k2),
    ).toBeNull();
  });
  it("honors lesson part, glyph and instruction restrictions", () => {
    expect(
      placePart(
        level,
        starterMachine(),
        { kind: "acceptor" },
        { q: -2, r: 1 },
        0,
        k2,
        { parts: ["arm"] },
      ),
    ).toBeNull();
    expect(
      placePart(
        level,
        starterMachine(),
        { kind: "glyph", glyph: "growth" },
        { q: -2, r: 1 },
        0,
        k2,
        { glyphs: ["simplify"] },
      ),
    ).toBeNull();
    expect(
      editTape(
        starterMachine(),
        1,
        { type: "put", index: 0, instruction: "DROP" },
        k2,
        { instructions: ["GRAB"] },
      ),
    ).toBeNull();
  });
  it("does not truncate a machine when its grade band narrows", () => {
    const expanded = editTape(
      starterMachine(),
      1,
      { type: "put", index: 3, instruction: "RESET" },
      g35,
    )!;
    expect(programFitsConfig(expanded, g35)).toBe(true);
    expect(programFitsConfig(expanded, k2)).toBe(false);
    expect(expanded.tapes[0].chips).toHaveLength(4);
  });
  it("keeps R1 reach/grabber capabilities narrow even with wider engine types", () => {
    const initial = starterMachine();
    const parts = initial.parts.map((part) =>
      part.kind === "arm" ? { ...part, reach: 2 as const } : part,
    ) as Part[];
    expect(programFitsConfig({ ...initial, parts }, g35)).toBe(false);
    expect(effectiveBandConfig("k2", g35).maxTapeSlots).toBe(3);
    expect(effectiveBandConfig("k2", g35).instructions).toEqual(
      k2.instructions,
    );
  });
});
describe("playback lifetime, timers and drawing", () => {
  it("advances on timers only, and double Run does not create duplicate timers", () => {
    const c = clock(),
      driver = new EnginePlayback(level, starterMachine(), c.scheduler);
    driver.run();
    driver.run();
    expect(c.jobs.size).toBe(1);
    expect(driver.get().state?.tick).toBe(0);
    c.tick();
    expect(driver.get().state?.tick).toBe(1);
    expect(c.jobs.size).toBe(1);
    driver.dispose();
  });
  it("Pause cancels future work and a stale callback cannot advance a paused run", () => {
    const c = clock(),
      driver = new EnginePlayback(level, starterMachine(), c.scheduler);
    driver.run();
    const stale = [...c.jobs.values()][0].callback;
    driver.pause();
    stale();
    expect(c.jobs.size).toBe(0);
    expect(driver.get().state?.tick).toBe(0);
    expect(driver.get().mode).toBe("paused");
    driver.dispose();
  });
  it.each([
    [0.5, 1300],
    [1, 650],
    [2, 325],
  ] as const)(
    "speed %s uses %s ms without changing simulation ticks",
    (speed, ms) => {
      const c = clock(),
        driver = new EnginePlayback(level, starterMachine(), c.scheduler);
      driver.setSpeed(speed);
      driver.run();
      expect([...c.jobs.values()][0].ms).toBe(ms);
      c.tick();
      expect(driver.get().state?.tick).toBe(1);
      driver.dispose();
    },
  );
  it("publishes the actual engine result once and refuses a duplicate finish", () => {
    const c = clock(),
      done = vi.fn(),
      program = starterMachine(),
      driver = new EnginePlayback(level, program, c.scheduler, done);
    driver.run();
    for (let i = 0; i < 40 && c.jobs.size; i++) c.tick();
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith(runMachine(level, program));
    driver.stepOnce();
    driver.run();
    expect(done).toHaveBeenCalledTimes(1);
    expect(c.jobs.size).toBe(0);
    driver.dispose();
  });
  it("Reset retains the design, restores tick zero, and invalidates the old timer", () => {
    const c = clock(),
      program = starterMachine(),
      driver = new EnginePlayback(level, program, c.scheduler);
    const initial = driver.get().state;
    driver.run();
    const stale = [...c.jobs.values()][0].callback;
    c.tick();
    driver.reset();
    stale();
    expect(driver.get().state).toEqual(initial);
    expect(driver.program).toEqual(program);
    expect(driver.get().mode).toBe("idle");
    expect(c.jobs.size).toBe(0);
    driver.dispose();
  });
  it("dispose cancels timers and disconnects listeners", () => {
    const c = clock(),
      driver = new EnginePlayback(level, starterMachine(), c.scheduler),
      listener = vi.fn();
    driver.subscribe(listener);
    driver.run();
    listener.mockClear();
    const stale = [...c.jobs.values()][0].callback;
    driver.dispose();
    stale();
    driver.run();
    expect(c.jobs.size).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });
  it("invalid designs stay stopped instead of scheduling a run", () => {
    const driver = new EnginePlayback(level, {
      parts: [makePart({ kind: "arm" }, 1, { q: 100, r: 0 }, 0)],
      tapes: [],
    });
    expect(driver.get().mode).toBe("errored");
    driver.run();
    expect(driver.get().state).toBeNull();
    driver.dispose();
  });
  it("draws precisely the engine's area, including swept cells", () => {
    let state = createSimState(level, starterMachine());
    state = step(step(state));
    const { context, calls } = recordingContext();
    drawAreaOverlay(
      context,
      engineArea(state),
      fitCamera(BUILDER_BOUNDS, 720, 430),
    );
    expect(calls.filter((row) => row[0] === "fill")).toHaveLength(
      resultOf(state).area,
    );
    expect(engineArea(state)).toBe(state.areaClaimed);
  });
  it("Reset recreates the initial full drawing command trace", () => {
    const driver = new EnginePlayback(level, starterMachine());
    const scene = (): BoardScene => ({
      program: driver.program,
      state: driver.get().state,
      fixedParts: [],
      bounds: BUILDER_BOUNDS,
      camera: fitCamera(BUILDER_BOUNDS, 720, 430),
      cursor: { q: 0, r: 0 },
      selected: null,
      area: true,
      labels: { input: "IN", output: "OUT", arm: "Arm" },
    });
    const before = recordingContext();
    drawBoard(before.context, scene());
    driver.stepOnce();
    driver.stepOnce();
    driver.reset();
    const after = recordingContext();
    drawBoard(after.context, scene());
    expect(after.calls).toEqual(before.calls);
    driver.dispose();
  });
});
