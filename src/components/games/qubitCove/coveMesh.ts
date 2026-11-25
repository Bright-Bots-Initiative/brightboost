// Small, flat-shaded meshes share the same perspective projection as the play field.
import type { Point } from "./world";

export interface Face {
  points: Point[];
  color: string;
}
export type Mesh = Face[];
export const point = (x: number, y: number, z: number): Point => ({ x, y, z });
const TAU = Math.PI * 2;

const tones = new Map<string, string>();
export function tint(hex: string, brightness: number) {
  const key = hex + brightness.toFixed(2);
  const cached = tones.get(key);
  if (cached) return cached;
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * brightness)));
  const color = `rgb(${channel(n >> 16)},${channel((n >> 8) & 255)},${channel(n & 255)})`;
  tones.set(key, color);
  return color;
}

export function ring(
  x: number,
  y: number,
  z: number,
  rx: number,
  rz: number,
  sides: number,
  angle = 0,
) {
  return Array.from({ length: sides }, (_, i) => {
    const a = angle + (i * TAU) / sides;
    return point(x + rx * Math.cos(a), y, z + rz * Math.sin(a));
  });
}

export function band(mesh: Mesh, bottom: Point[], top: Point[], color: string) {
  for (let i = 0; i < bottom.length; i++) {
    const j = (i + 1) % bottom.length;
    const dx = top[j].x - top[i].x;
    const dz = top[j].z - top[i].z;
    const length = Math.hypot(dx, dz);
    const gain = length ? 0.88 + (0.15 * (-dz + 0.6 * -dx)) / length : 1;
    mesh.push({
      points: [bottom[i], bottom[j], top[j], top[i]],
      color: tint(color, gain),
    });
  }
}

export function drum(
  mesh: Mesh,
  x: number,
  y: number,
  z: number,
  bottomX: number,
  bottomZ: number,
  height: number,
  topX: number,
  topZ: number,
  color: string,
  sides = 12,
  angle = 0,
  capColor = color,
) {
  const bottom = ring(x, y, z, bottomX, bottomZ, sides, angle);
  const top = ring(x, y + height, z, topX, topZ, sides, angle);
  band(mesh, bottom, top, color);
  if (topX > 0 && topZ > 0) mesh.push({ points: top, color: capColor });
}

export function box(
  mesh: Mesh,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  color: string,
  bevel = 0,
) {
  const shape = (h: number, w: number, d: number) => {
    const b = Math.min(bevel, w / 3, d / 3);
    const corners = b
      ? [
          [-w + b, -d],
          [w - b, -d],
          [w, -d + b],
          [w, d - b],
          [w - b, d],
          [-w + b, d],
          [-w, d - b],
          [-w, -d + b],
        ]
      : [
          [-w, -d],
          [w, -d],
          [w, d],
          [-w, d],
        ];
    return corners.map(([cx, cz]) => point(x + cx, h, z + cz));
  };
  const bottom = shape(y, width / 2, depth / 2);
  const top = shape(y + height, width / 2, depth / 2);
  band(mesh, bottom, top, color);
  mesh.push({ points: top, color: tint(color, 1.07) });
}

export function gem(
  mesh: Mesh,
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  color: string,
  sides = 7,
) {
  drum(mesh, x, y - ry, z, 0, 0, ry * 0.87, rx, rz, color, sides, 0.18);
  drum(
    mesh,
    x,
    y - 0.13 * ry,
    z,
    rx,
    rz,
    ry * 0.7,
    rx * 0.82,
    rz * 0.82,
    color,
    sides,
    0.18,
  );
  drum(
    mesh,
    x,
    y + 0.57 * ry,
    z,
    rx * 0.82,
    rz * 0.82,
    ry * 0.43,
    rx * 0.24,
    rz * 0.24,
    color,
    sides,
    0.18,
  );
}

export function place(
  mesh: Mesh,
  x: number,
  y: number,
  z: number,
  angle = 0,
  size = 1,
): Mesh {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return mesh.map((face) => ({
    color: face.color,
    points: face.points.map((p) =>
      point(
        x + size * (p.x * c + p.z * s),
        y + size * p.y,
        z + size * (-p.x * s + p.z * c),
      ),
    ),
  }));
}
