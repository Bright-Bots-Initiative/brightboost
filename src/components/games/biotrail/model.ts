export type Tool = "spring" | "glide";
export type IslandId = "meadow" | "marsh" | "canopy" | "lab";
export const ISLAND_IDS: IslandId[] = ["meadow", "marsh", "canopy", "lab"];
export type Build = {
  version: 1;
  name: string;
  tool: Tool;
  completed: IslandId[];
  reflection: string;
};
export const STARTER: Build = {
  version: 1,
  name: "",
  tool: "spring",
  completed: [],
  reflection: "",
};
export function parseBuild(raw: string | null): Build | null {
  if (!raw || raw.length > 4096) return null;
  try {
    const v = JSON.parse(raw) as Build;
    if (
      !v ||
      v.version !== 1 ||
      typeof v.name !== "string" ||
      v.name.length > 32 ||
      !["spring", "glide"].includes(v.tool) ||
      !Array.isArray(v.completed) ||
      v.completed.length > 4 ||
      !v.completed.every((id) => ISLAND_IDS.includes(id)) ||
      typeof v.reflection !== "string" ||
      !["", "higher", "slower", "changed"].includes(v.reflection)
    )
      return null;
    const completed = [...new Set(v.completed)];
    // A manipulated draft cannot claim a later island without its prerequisites.
    if (
      completed.some((id) => id !== "meadow") &&
      !completed.includes("meadow")
    )
      return null;
    if (
      completed.includes("lab") &&
      !completed.some((id) => id === "marsh" || id === "canopy")
    )
      return null;
    return {
      version: 1,
      name: v.name,
      tool: v.tool,
      completed,
      reflection: v.reflection,
    };
  } catch {
    return null;
  }
}
export function isIslandOpen(id: IslandId, completed: IslandId[]): boolean {
  if (id === "meadow") return true;
  if (!completed.includes("meadow")) return false;
  return (
    id !== "lab" || completed.includes("marsh") || completed.includes("canopy")
  );
}
export type Platform = { x: number; y: number; w: number };
export type Landmark = { x: number; y: number };
export type Level = {
  id: IslandId;
  width: number;
  platforms: Platform[];
  start: Landmark;
  checkpoint: Landmark;
  goal: Landmark;
  observations: string[];
  sky: string;
  ground: string;
  suggested: Tool;
};
const ground = (x: number, w: number, y = 325): Platform => ({ x, w, y });
export const LEVELS: Record<IslandId, Level> = {
  meadow: {
    id: "meadow",
    width: 1560,
    // Gentle gaps and low flower beds: a shared practice space for both tools.
    platforms: [
      ground(0, 340),
      ground(415, 300),
      ground(795, 300),
      ground(1175, 385),
      ground(235, 110, 280),
      ground(590, 100, 275),
      ground(945, 110, 280),
    ],
    start: { x: 45, y: 325 },
    checkpoint: { x: 830, y: 325 },
    goal: { x: 1450, y: 325 },
    observations: ["spring", "compare", "habitat"],
    sky: "#def3ed",
    ground: "#3c9260",
    suggested: "spring",
  },
  marsh: {
    id: "marsh",
    width: 1840,
    // Spring legs clear each 110 px rise in one jump. Wings use 55 px stairs.
    platforms: [
      ground(0, 300),
      ground(340, 220, 215),
      ground(650, 250),
      ground(960, 290, 215),
      ground(1330, 210),
      ground(1610, 230, 215),
      ground(255, 80, 270),
      ground(890, 65, 270),
      ground(1530, 75, 270),
    ],
    start: { x: 45, y: 325 },
    checkpoint: { x: 1000, y: 215 },
    goal: { x: 1730, y: 215 },
    observations: ["spring", "marsh", "compare"],
    sky: "#e3f0ef",
    ground: "#327f81",
    suggested: "spring",
  },
  canopy: {
    id: "canopy",
    width: 2030,
    // High launch branches and long descending glides. Lower stumps are a
    // slower spring route; they never obstruct the broad gliding corridor.
    platforms: [
      ground(0, 300, 195),
      ground(620, 340, 245),
      ground(1300, 330, 305),
      ground(1720, 310),
      ground(350, 115, 335),
      ground(510, 100),
      ground(1010, 110, 340),
      ground(1170, 110, 335),
    ],
    start: { x: 45, y: 195 },
    checkpoint: { x: 700, y: 245 },
    goal: { x: 1910, y: 325 },
    observations: ["glide", "canopy", "compare"],
    sky: "#edf5cf",
    ground: "#648640",
    suggested: "glide",
  },
  lab: {
    id: "lab",
    width: 1920,
    // A greenhouse combines a high shortcut, a broad descending crossing,
    // and an uneven staircase. Each tool has a different way through.
    platforms: [
      ground(0, 280),
      ground(320, 240, 215),
      ground(850, 260),
      ground(1190, 150, 270),
      ground(1410, 180, 215),
      ground(1710, 210, 255),
      ground(245, 65, 270),
      ground(650, 105, 345),
    ],
    start: { x: 45, y: 325 },
    checkpoint: { x: 890, y: 325 },
    goal: { x: 1810, y: 255 },
    observations: ["lab", "compare", "design"],
    sky: "#eeedf9",
    ground: "#6e70a1",
    suggested: "glide",
  },
};
export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  jumpHeld: boolean;
  checkpoint: boolean;
  finished: boolean;
  returns: number;
};
export const makePlayer = (x = 45, floorY = 325): Player => ({
  x,
  y: floorY - 40,
  vx: 0,
  vy: 0,
  grounded: false,
  jumpHeld: false,
  checkpoint: false,
  finished: false,
  returns: 0,
});
/** Spawn at the same surface the checkpoint flag marks, including raised ledges. */
export function spawnPlayer(level: Level, checkpoint = false): Player {
  const anchor = checkpoint ? level.checkpoint : level.start;
  return { ...makePlayer(anchor.x, anchor.y), checkpoint };
}
export type Controls = { left: boolean; right: boolean; jump: boolean };
export const EMPTY_CONTROLS: Controls = {
  left: false,
  right: false,
  jump: false,
};
/** Deterministic 60 Hz platform physics, swept downward collisions, bounded dt. */
export function stepPlayer(
  p: Player,
  controls: Controls,
  level: Level,
  tool: Tool,
  dt: number,
): Player {
  if (p.finished) return p;
  const s = { ...p };
  const step = Math.max(0, Math.min(Number.isFinite(dt) ? dt : 0, 1 / 30));
  s.vx = (Number(controls.right) - Number(controls.left)) * 245;
  if (controls.jump && !s.jumpHeld && s.grounded) {
    s.vy = tool === "spring" ? -570 : -470;
    s.grounded = false;
  }
  s.jumpHeld = controls.jump;
  s.vy += 1280 * step;
  if (tool === "glide" && controls.jump && s.vy > 95) s.vy = 95;
  s.x = Math.max(0, Math.min(level.width - 30, s.x + s.vx * step));
  const previousBottom = s.y + 40;
  s.y += s.vy * step;
  s.grounded = false;
  for (const platform of level.platforms) {
    if (
      s.vy >= 0 &&
      s.x + 26 > platform.x &&
      s.x < platform.x + platform.w &&
      previousBottom <= platform.y + 1 &&
      s.y + 40 >= platform.y
    ) {
      s.y = platform.y - 40;
      s.vy = 0;
      s.grounded = true;
    }
  }
  if (
    s.grounded &&
    s.x >= level.checkpoint.x &&
    Math.abs(s.y + 40 - level.checkpoint.y) < 1
  )
    s.checkpoint = true;
  if (s.y > 460)
    return {
      ...spawnPlayer(level, s.checkpoint),
      returns: s.returns + 1,
    };
  if (
    s.x >= level.goal.x &&
    s.grounded &&
    Math.abs(s.y + 40 - level.goal.y) < 1
  )
    s.finished = true;
  return s;
}
