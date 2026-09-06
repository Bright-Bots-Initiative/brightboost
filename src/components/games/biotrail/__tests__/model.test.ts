import { describe, it, expect } from "vitest";
import {
  EMPTY_CONTROLS,
  LEVELS,
  STARTER,
  ISLAND_IDS,
  isIslandOpen,
  makePlayer,
  spawnPlayer,
  parseBuild,
  stepPlayer,
  type Tool,
  type Level,
  type Player,
} from "../model";
describe("BioTrail exploration rules", () => {
  it("opens either branch after the meadow and reunites at the lab", () => {
    expect(ISLAND_IDS.filter((id) => isIslandOpen(id, []))).toEqual(["meadow"]);
    expect(isIslandOpen("lab", ["meadow"])).toBe(false);
    expect(isIslandOpen("lab", ["meadow", "marsh"])).toBe(true);
    expect(isIslandOpen("lab", ["meadow", "canopy"])).toBe(true);
    expect(isIslandOpen("lab", ["canopy"])).toBe(false);
  });
  it("round-trips a bounded build and rejects corrupted or fabricated branches", () => {
    const build = {
      ...STARTER,
      name: "Sky seed",
      tool: "glide",
      completed: ["meadow", "canopy", "lab"],
      reflection: "changed",
    };
    expect(parseBuild(JSON.stringify(build))).toEqual(build);
    for (const bad of [
      "{",
      JSON.stringify({ ...build, tool: "fly" }),
      JSON.stringify({ ...build, completed: ["lab"] }),
      JSON.stringify({ ...build, name: "x".repeat(33) }),
      JSON.stringify({ ...build, completed: ["meadow", "secret"] }),
      " ".repeat(4097),
    ])
      expect(parseBuild(bad)).toBeNull();
  });
  it("spring legs jump higher and gliding wings slow descent", () => {
    const standing = { ...makePlayer(), y: 285, grounded: true };
    const controls = { left: false, right: false, jump: true };
    const spring = stepPlayer(
      standing,
      controls,
      LEVELS.meadow,
      "spring",
      1 / 60,
    );
    const wing = stepPlayer(standing, controls, LEVELS.meadow, "glide", 1 / 60);
    expect(spring.vy).toBeLessThan(wing.vy);
    const falling = { ...makePlayer(), x: 365, y: 80, vy: 400 };
    expect(
      stepPlayer(falling, controls, LEVELS.canopy, "glide", 1 / 60).vy,
    ).toBe(95);
    expect(
      stepPlayer(falling, controls, LEVELS.canopy, "spring", 1 / 60).vy,
    ).toBeGreaterThan(400);
  });
  it("lands without tunneling and returns to a reached checkpoint", () => {
    const land = stepPlayer(
      { ...makePlayer(), y: 280, vy: 600 },
      { left: false, right: false, jump: false },
      LEVELS.meadow,
      "spring",
      1 / 60,
    );
    expect(land.y).toBe(285);
    expect(land.grounded).toBe(true);
    const reset = stepPlayer(
      { ...makePlayer(), x: 730, y: 480, checkpoint: true },
      { left: false, right: true, jump: false },
      LEVELS.meadow,
      "spring",
      1 / 60,
    );
    expect(reset.x).toBe(LEVELS.meadow.checkpoint.x);
    expect(reset.returns).toBe(1);
    expect(reset.finished).toBe(false);
  });
  for (const id of ISLAND_IDS) {
    for (const tool of ["spring", "glide"] as const) {
      it(`completes ${id} with ${tool} using continuous controls and no falls`, () => {
        replay(LEVELS[id], tool, ROUTES[id][tool]);
      });
    }
  }
  it("makes the marsh's high shortcut reachable by spring legs, but not wings", () => {
    const spring = firstLanding(LEVELS.marsh, "spring", 225, "tap");
    const glide = firstLanding(LEVELS.marsh, "glide", 225, "hold");
    expect(support(spring, LEVELS.marsh)).toBe(1);
    expect(glide.returns > 0 || support(glide, LEVELS.marsh) !== 1).toBe(true);
  });
  it("lets wings take the direct canopy crossing while spring legs land on the lower route", () => {
    const glide = firstLanding(LEVELS.canopy, "glide", 210, "hold");
    const spring = firstLanding(LEVELS.canopy, "spring", 295, "tap");
    expect(support(glide, LEVELS.canopy)).toBe(1);
    expect(support(spring, LEVELS.canopy)).toBe(5);
    expect(glide.returns).toBe(0);
    expect(spring.returns).toBe(0);
  });
  it.each(ISLAND_IDS)(
    "respawns safely at the actual checkpoint height in %s",
    (id) => {
      const level = LEVELS[id];
      let p = stepPlayer(
        { ...spawnPlayer(level, true), y: 480 },
        EMPTY_CONTROLS,
        level,
        "spring",
        1 / 60,
      );
      expect(p.x).toBe(level.checkpoint.x);
      for (let i = 0; i < 120; i++)
        p = stepPlayer(p, EMPTY_CONTROLS, level, "spring", 1 / 60);
      expect(p.y + 40).toBe(level.checkpoint.y);
      expect(p.returns).toBe(1);
      expect(p.grounded).toBe(true);
    },
  );
  it("requires the landmark's surface height before activating a checkpoint or goal", () => {
    const base = LEVELS.marsh;
    const level = {
      ...base,
      platforms: [
        ...base.platforms,
        { x: 980, y: 325, w: 90 },
        { x: 1700, y: 325, w: 100 },
      ],
    };
    const lowCheckpoint = stepPlayer(
      makePlayer(level.checkpoint.x, 325),
      EMPTY_CONTROLS,
      level,
      "spring",
      1 / 60,
    );
    const highCheckpoint = stepPlayer(
      makePlayer(level.checkpoint.x, level.checkpoint.y),
      EMPTY_CONTROLS,
      level,
      "spring",
      1 / 60,
    );
    expect(lowCheckpoint.checkpoint).toBe(false);
    expect(highCheckpoint.checkpoint).toBe(true);
    const lowGoal = stepPlayer(
      makePlayer(level.goal.x, 325),
      EMPTY_CONTROLS,
      level,
      "spring",
      1 / 60,
    );
    const highGoal = stepPlayer(
      makePlayer(level.goal.x, level.goal.y),
      EMPTY_CONTROLS,
      level,
      "spring",
      1 / 60,
    );
    expect(lowGoal.finished).toBe(false);
    expect(highGoal.finished).toBe(true);
  });
});

type Hop = readonly [
  from: number,
  to: number,
  launchX: number,
  mode: "tap" | "hold" | "walk",
];
// Hand-playable routes: walk to a launch, then move right through each landing.
// These exercise the real physics continuously, including the nonpreferred suit.
const ROUTES = {
  meadow: {
    spring: [
      [0, 1, 175, "tap"],
      [1, 2, 555, "tap"],
      [2, 3, 935, "tap"],
    ],
    glide: [
      [0, 1, 150, "hold"],
      [1, 2, 510, "hold"],
      [2, 3, 860, "hold"],
    ],
  },
  marsh: {
    spring: [
      [0, 1, 175, "tap"],
      [1, 2, 340, "walk"],
      [2, 3, 795, "tap"],
      [3, 4, 960, "walk"],
      [4, 5, 1445, "tap"],
    ],
    glide: [
      [0, 6, 60, "hold"],
      [6, 1, 255, "tap"],
      [1, 7, 410, "hold"],
      [7, 3, 890, "tap"],
      [3, 8, 1050, "hold"],
      [8, 5, 1530, "tap"],
    ],
  },
  canopy: {
    spring: [
      [0, 4, 0, "walk"],
      [4, 1, 435, "tap"],
      [1, 6, 620, "walk"],
      [6, 2, 1075, "tap"],
      [2, 3, 1470, "tap"],
    ],
    glide: [
      [0, 1, 150, "hold"],
      [1, 2, 805, "hold"],
      [2, 3, 1330, "hold"],
    ],
  },
  lab: {
    spring: [
      [0, 1, 155, "tap"],
      [1, 7, 320, "walk"],
      [7, 2, 650, "tap"],
      [2, 3, 980, "tap"],
      [3, 4, 1200, "tap"],
      [4, 5, 1455, "tap"],
    ],
    glide: [
      [0, 7, 260, "hold"],
      [7, 2, 650, "hold"],
      [2, 3, 995, "hold"],
      [3, 4, 1215, "hold"],
      [4, 5, 1410, "hold"],
    ],
  },
} as const;
function support(p: Player, level: Level): number {
  return level.platforms.findIndex(
    (f) => Math.abs(p.y + 40 - f.y) < 0.01 && p.x + 26 > f.x && p.x < f.x + f.w,
  );
}
function firstLanding(
  level: Level,
  tool: Tool,
  x: number,
  mode: "tap" | "hold",
): Player {
  let p = { ...makePlayer(x, level.start.y), grounded: true };
  for (let n = 0; n < 300; n++) {
    p = stepPlayer(
      p,
      { left: false, right: true, jump: mode === "hold" || n === 0 },
      level,
      tool,
      1 / 60,
    );
    if (p.grounded || p.returns) return p;
  }
  throw new Error("The attempt did not resolve");
}
function replay(level: Level, tool: Tool, hops: readonly Hop[]) {
  let p = stepPlayer(spawnPlayer(level), EMPTY_CONTROLS, level, tool, 1 / 60);
  for (const [from, to, launchX, mode] of hops) {
    for (let n = 0; n < 1000 && Math.abs(p.x - launchX) > 2.1; n++) {
      p = stepPlayer(
        p,
        { left: p.x > launchX, right: p.x < launchX, jump: false },
        level,
        tool,
        1 / 60,
      );
    }
    expect(Math.abs(p.x - launchX)).toBeLessThanOrEqual(2.1);
    expect(support(p, level)).toBe(from);
    let landed = false;
    for (let n = 1; n <= 300; n++) {
      p = stepPlayer(
        p,
        {
          left: false,
          right: true,
          jump: mode === "hold" || (mode === "tap" && n === 1),
        },
        level,
        tool,
        1 / 60,
      );
      expect(p.returns).toBe(0);
      if (p.grounded && (mode !== "walk" || support(p, level) !== from)) {
        expect(support(p, level)).toBe(to);
        landed = true;
        break;
      }
    }
    expect(landed).toBe(true);
  }
  for (let n = 0; n < 1000 && !p.finished; n++)
    p = stepPlayer(
      p,
      { left: false, right: true, jump: false },
      level,
      tool,
      1 / 60,
    );
  expect(p.finished).toBe(true);
  expect(p.returns).toBe(0);
}
