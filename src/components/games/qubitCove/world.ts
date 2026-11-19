/** Heights mark the walking surface. The camera looks toward negative z. */
export interface Point {
  x: number;
  y: number;
  z: number;
}

export type BeaconId = "zero" | "one" | "mix";

export interface Platform extends Point {
  id: string;
  kind: "island" | "stone" | "bridge";
  theme: "hub" | BeaconId;
  rx: number;
  rz: number;
}

export interface Beacon extends Point {
  id: BeaconId;
}

export interface Pickup extends Point {
  id: string;
}

export const spawn: Point = { x: 0, y: 0, z: 2.65 };

// The west pier can be walked. The two other trails teach jumping with broad
// landing areas at successively higher elevations.
export const platforms: readonly Platform[] = [
  {
    id: "harbor",
    kind: "island",
    theme: "hub",
    x: 0,
    y: 0,
    z: 0,
    rx: 4.8,
    rz: 4.2,
  },
  {
    id: "pier",
    kind: "bridge",
    theme: "zero",
    x: -6.65,
    y: 0.04,
    z: 0,
    rx: 2.65,
    rz: 1.03,
  },
  {
    id: "west",
    kind: "island",
    theme: "zero",
    x: -11,
    y: 0.08,
    z: 0,
    rx: 3.05,
    rz: 2.95,
  },
  {
    id: "east-step",
    kind: "stone",
    theme: "one",
    x: 5.95,
    y: 0.38,
    z: 0.2,
    rx: 1.12,
    rz: 1.18,
  },
  {
    id: "east-shelf",
    kind: "stone",
    theme: "one",
    x: 8.02,
    y: 0.67,
    z: -0.05,
    rx: 1.05,
    rz: 1.3,
  },
  {
    id: "east",
    kind: "island",
    theme: "one",
    x: 11.55,
    y: 0.97,
    z: 0,
    rx: 2.95,
    rz: 2.85,
  },
  {
    id: "north-dock",
    kind: "bridge",
    theme: "mix",
    x: 0,
    y: 0.04,
    z: -4.85,
    rx: 1.12,
    rz: 1.2,
  },
  {
    id: "north-step",
    kind: "stone",
    theme: "mix",
    x: 0.05,
    y: 0.52,
    z: -7.14,
    rx: 1.62,
    rz: 1.05,
  },
  {
    id: "north",
    kind: "island",
    theme: "mix",
    x: 0,
    y: 0.82,
    z: -10.97,
    rx: 3.35,
    rz: 2.86,
  },
];

export const beacons: readonly Beacon[] = [
  { id: "zero", x: -11, y: 0.08, z: -0.46 },
  { id: "one", x: 11.62, y: 0.97, z: -0.46 },
  { id: "mix", x: 0, y: 0.82, z: -11.3 },
];

export const pickups: readonly Pickup[] = [
  { id: "pier-1", x: -3.5, y: 0.65, z: 0 },
  { id: "pier-2", x: -5.85, y: 0.69, z: 0 },
  { id: "pier-3", x: -8.25, y: 0.73, z: 0 },
  { id: "east-1", x: 3.75, y: 0.65, z: 0.1 },
  { id: "east-2", x: 5.95, y: 1.2, z: 0.2 },
  { id: "east-3", x: 8.02, y: 1.49, z: -0.05 },
  { id: "north-1", x: 0, y: 0.69, z: -3.4 },
  { id: "north-2", x: 0, y: 0.69, z: -5.42 },
  { id: "north-3", x: 0.05, y: 1.34, z: -7.14 },
];

export function contains(platform: Platform, x: number, z: number) {
  const dx = (x - platform.x) / platform.rx;
  const dz = (z - platform.z) / platform.rz;
  return platform.kind === "bridge"
    ? Math.abs(dx) <= 1 && Math.abs(dz) <= 1
    : dx * dx + dz * dz <= 1;
}

export function beaconLanding(id: BeaconId): Point {
  const beacon = beacons.find((entry) => entry.id === id)!;
  return { x: beacon.x, y: beacon.y, z: beacon.z + 1.0 };
}
