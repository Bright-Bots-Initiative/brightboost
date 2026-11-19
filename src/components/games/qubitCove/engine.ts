import {
  beaconLanding,
  beacons,
  contains,
  pickups,
  platforms,
  spawn,
  type BeaconId,
  type Point,
  type Platform,
} from "./world";

export interface GameInput {
  x: number;
  z: number;
  jump: boolean;
}

export interface GameState {
  player: Point;
  facing: number;
  grounded: boolean;
  moving: boolean;
  collected: readonly string[];
  lit: readonly BeaconId[];
  checkpoint: "hub" | BeaconId;
  rescues: number;
  verticalSpeed: number;
  jumpHeld: boolean;
  jumpBuffer: number;
  normalJump: boolean;
  cometJump: boolean;
  cometTime: number;
  cometWindow: number;
  coyote: number;
  remainder: number;
}

const TICK = 1 / 120;
const WALK_SPEED = 5.9;
const GRAVITY = 24;
const JUMP_SPEED = 8.9;
const COMET_SPEED = 10.5;
const COMET_WINDOW = 0.3;
const LEDGE_GRACE = 0.15;
const STEP_HEIGHT = 0.14;

export function createGame(): GameState {
  return {
    player: { ...spawn },
    facing: 0,
    grounded: true,
    moving: false,
    collected: [],
    lit: [],
    checkpoint: "hub",
    rescues: 0,
    verticalSpeed: 0,
    jumpHeld: false,
    jumpBuffer: 0,
    normalJump: false,
    cometJump: false,
    cometTime: 0,
    cometWindow: 0,
    coyote: LEDGE_GRACE,
    remainder: 0,
  };
}

function placePlayer(state: GameState, checkpoint: GameState["checkpoint"]) {
  state.player =
    checkpoint === "hub" ? { ...spawn } : beaconLanding(checkpoint);
  state.checkpoint = checkpoint;
  state.facing = checkpoint === "hub" ? 0 : Math.PI;
  state.grounded = true;
  state.moving = false;
  state.verticalSpeed = 0;
  state.jumpBuffer = 0;
  state.normalJump = false;
  state.cometJump = false;
  state.cometTime = 0;
  state.cometWindow = 0;
  state.coyote = LEDGE_GRACE;
}

export function guideToBeacon(state: GameState, id: BeaconId): GameState {
  const next = { ...state, remainder: 0 };
  placePlayer(next, id);
  return next;
}

export function nearbyBeacon(state: GameState): BeaconId | null {
  if (!state.grounded) return null;
  const { x, y, z } = state.player;
  return (
    beacons.find(
      (beacon) =>
        Math.abs(y - beacon.y) < STEP_HEIGHT &&
        Math.hypot(x - beacon.x, z - beacon.z) <= 1.85,
    )?.id ?? null
  );
}

export function lightBeacon(state: GameState, id: BeaconId): GameState {
  if (state.lit.includes(id) || nearbyBeacon(state) !== id) return state;
  return { ...state, lit: [...state.lit, id] };
}

function tick(state: GameState, dx: number, dz: number) {
  const p = state.player;
  const previousY = p.y;
  if (state.grounded) state.coyote = LEDGE_GRACE;
  if (state.jumpBuffer > 0 && state.coyote > 0) {
    state.cometJump = state.cometWindow > 0 && (dx !== 0 || dz !== 0);
    state.normalJump = !state.cometJump;
    state.verticalSpeed = state.cometJump ? COMET_SPEED : JUMP_SPEED;
    state.cometWindow = 0;
    state.grounded = false;
    state.jumpBuffer = 0;
    state.coyote = 0;
  }
  state.cometWindow = Math.max(0, state.cometWindow - TICK);
  if (state.cometJump) state.cometTime += TICK;
  state.coyote = Math.max(0, state.coyote - TICK);
  state.jumpBuffer = Math.max(0, state.jumpBuffer - TICK);
  state.verticalSpeed -= GRAVITY * TICK;
  const nextY = p.y + state.verticalSpeed * TICK;
  const maxStep = state.grounded ? STEP_HEIGHT : 0.001;
  const canEnter = (x: number, z: number) =>
    !platforms.some(
      (surface) =>
        surface.y > Math.max(previousY, nextY) + maxStep &&
        contains(surface, x, z) &&
        !contains(surface, p.x, p.z),
    );

  // Resolve axes separately so a diagonal approach can slide along a ledge.
  const previousX = p.x;
  const previousZ = p.z;
  if (dx && canEnter(p.x + dx, p.z)) p.x += dx;
  if (dz && canEnter(p.x, p.z + dz)) p.z += dz;
  state.moving = previousX !== p.x || previousZ !== p.z;
  if (dx || dz) state.facing = Math.atan2(dx, dz);

  let floor: Platform | undefined;
  if (state.verticalSpeed <= 0) {
    for (const surface of platforms) {
      if (
        contains(surface, p.x, p.z) &&
        surface.y <= previousY + maxStep &&
        surface.y >= nextY &&
        (!floor || floor.y < surface.y)
      )
        floor = surface;
    }
  }
  state.grounded = Boolean(floor);
  if (floor) {
    if (state.normalJump) state.cometWindow = COMET_WINDOW;
    state.normalJump = false;
    state.cometJump = false;
    state.cometTime = 0;
    p.y = floor.y;
    state.verticalSpeed = 0;
    if (floor.kind === "island") state.checkpoint = floor.theme;
  } else {
    p.y = nextY;
  }

  if (p.y < -3.5) {
    state.rescues += 1;
    placePlayer(state, state.checkpoint);
    return;
  }

  for (const pickup of pickups) {
    if (
      Math.abs(p.y + 0.6 - pickup.y) < 1.0 &&
      Math.hypot(p.x - pickup.x, p.z - pickup.z) < 0.72 &&
      !state.collected.includes(pickup.id)
    ) {
      state.collected = [...state.collected, pickup.id];
    }
  }
}

/** Simulate elapsed seconds on fixed ticks. Clamp a resumed/background frame. */
export function stepGame(
  state: GameState,
  input: GameInput,
  dt: number,
): GameState {
  if (!Number.isFinite(dt) || dt <= 0) return state;
  const next: GameState = { ...state, player: { ...state.player } };
  const strength = Math.max(1, Math.hypot(input.x, input.z));
  const dx = (input.x / strength) * WALK_SPEED * TICK;
  const dz = (input.z / strength) * WALK_SPEED * TICK;
  if (input.jump && !state.jumpHeld) next.jumpBuffer = 0.14;
  next.jumpHeld = input.jump;
  next.remainder += Math.min(dt, 0.1);
  while (next.remainder + 1e-10 >= TICK) {
    tick(next, dx, dz);
    next.remainder = Math.max(0, next.remainder - TICK);
  }
  return next;
}
