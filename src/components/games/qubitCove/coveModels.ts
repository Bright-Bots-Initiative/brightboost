import type { BeaconId, Platform } from "./world";
import { band, box, drum, gem, point, ring, type Mesh } from "./coveMesh";

const grass = {
  hub: "#91cc70",
  zero: "#72c7a2",
  one: "#cac973",
  mix: "#a4c381",
};
const navy = "#284c63";
const cream = "#f7e8c1";
const brass = "#e8b75a";

export function island(p: Platform): Mesh {
  const m: Mesh = [];
  const { rx, rz, kind, theme } = p;
  if (kind === "bridge") {
    const alongX = rx > rz,
      length = alongX ? rx : rz,
      width = alongX ? rz : rx;
    const planks = Math.ceil(length * 3.5);
    const board = (length * 2) / planks;
    for (let i = 0; i < planks; i++) {
      const distance = -length + board * (i + 0.5);
      box(
        m,
        alongX ? distance : 0,
        -0.24,
        alongX ? 0 : distance,
        alongX ? board - 0.035 : 2 * width,
        0.24,
        alongX ? 2 * width : board - 0.035,
        i % 3 === 0 ? "#e9b77b" : "#d6a66e",
        0.045,
      );
    }
    for (const side of [-1, 1]) {
      box(
        m,
        alongX ? 0 : side * width * 0.69,
        -0.43,
        alongX ? side * width * 0.69 : 0,
        alongX ? length * 2 : 0.19,
        0.19,
        alongX ? 0.19 : length * 2,
        "#775f58",
      );
    }
    return m;
  }

  const n = kind === "stone" ? 9 : 24;
  const rockDepth = kind === "stone" ? 1.32 : Math.min(3.6, rz * 0.9);
  const layer = (height: number, radius: number) =>
    ring(0, height, 0, rx * radius, rz * radius, n, 0.13);
  const tip = layer(-rockDepth, 0.24);
  const ridge = layer(-rockDepth * 0.6, 0.79);
  const bezel = layer(-0.63, 0.956);
  // Varied cliff seams stay below the exact flat collision footprint.
  for (let i = 0; i < n; i++) {
    const v = Math.sin(i * 13 + 4) * Math.cos(i * 42 + 2);
    tip[i].y += v * 0.24;
    ridge[i].y += v * 0.36;
    ridge[i].x *= 1 + v * 0.08;
    bezel[i].y += v * 0.07;
  }
  const top = layer(0, 1),
    lip = layer(-0.19, 1),
    earth = layer(-0.41, 0.985);
  const cliff = ["#779596", "#729296", "#87a09c", "#6d8790", "#7c9292"];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    m.push({ points: [tip[i], tip[j], ridge[i]], color: cliff[(i + 2) % 5] });
    m.push({ points: [tip[j], ridge[j], ridge[i]], color: cliff[i % 5] });
    m.push({
      points: [ridge[i], ridge[j], bezel[j]],
      color: cliff[(i + 3) % 5],
    });
    m.push({
      points: [ridge[i], bezel[j], bezel[i]],
      color: cliff[(i + 4) % 5],
    });
  }
  band(m, bezel, earth, "#ac9379");
  band(m, earth, lip, "#dfc28f");
  band(m, lip, top, "#7daa64");
  m.push({ points: top, color: grass[theme] });
  return m;
}

export function fern(): Mesh {
  const m: Mesh = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 2.4;
    const x = Math.cos(a) * 0.38,
      z = Math.sin(a) * 0.38;
    m.push({
      points: [
        point(-z * 0.23, 0.02, x * 0.23),
        point(x * 0.66, 0.36, z * 0.66),
        point(x, 0.53 + (i % 2) * 0.16, z),
        point(x * 0.7, 0.19, z * 0.7),
        point(z * 0.2, 0.02, -x * 0.2),
      ],
      color: i % 2 ? "#349e70" : "#66b875",
    });
  }
  return m;
}

export function tree(variant: number): Mesh {
  const m: Mesh = [];
  drum(m, 0, 0, 0, 0.14, 0.14, 1.04, 0.1, 0.1, "#966d51", 7);
  if (variant === 0) {
    gem(m, 0, 1.48, 0, 0.64, 0.79, 0.6, "#439f81", 7);
    gem(m, -0.22, 1.81, 0.13, 0.44, 0.51, 0.42, "#63ba82");
  } else if (variant === 1) {
    drum(m, 0, 0.6, 0, 0.65, 0.59, 1.05, 0.1, 0.1, "#338f82", 7);
    drum(m, 0, 1.21, 0, 0.47, 0.46, 0.99, 0, 0, "#5db69a", 7);
  } else {
    gem(m, 0, 1.42, 0, 0.65, 0.65, 0.6, "#65af8b", 8);
    gem(m, -0.35, 1.57, 0.12, 0.4, 0.44, 0.39, "#88c38c");
    gem(m, 0.17, 1.95, -0.03, 0.42, 0.52, 0.42, "#65b68b");
  }
  return m;
}

export function beaconBody(id: BeaconId, lit: boolean): Mesh {
  const m: Mesh = [];
  // Each beacon has a different silhouette and the same brass lamp housing.
  if (id === "mix") {
    drum(m, 0, 0, 0, 1.07, 0.96, 0.22, 1.02, 0.91, navy);
    drum(m, 0, 0.22, 0, 0.86, 0.75, 0.88, 0.72, 0.64, cream);
    drum(m, 0, 1.1, 0, 0.72, 0.64, 0.43, 0.65, 0.58, "#de7053");
    drum(m, 0, 1.53, 0, 0.65, 0.58, 0.96, 0.5, 0.46, cream);
    drum(m, 0, 2.49, 0, 0.58, 0.54, 0.15, 0.63, 0.57, navy);
    drum(
      m,
      0,
      2.64,
      0,
      0.47,
      0.43,
      0.67,
      0.47,
      0.43,
      lit ? "#fff09b" : "#87d9dc",
      8,
    );
    for (const s of [-1, 1]) {
      box(m, s * 0.38, 2.65, 0.22, 0.07, 0.67, 0.07, navy);
      box(m, s * 0.38, 2.65, -0.22, 0.07, 0.67, 0.07, navy);
    }
    drum(m, 0, 3.31, 0, 0.77, 0.71, 0.52, 0.12, 0.1, "#db7950", 10);
    gem(m, 0, 3.98, 0, 0.13, 0.2, 0.13, brass, 6);
    box(m, 0, 0.24, 0.67, 0.43, 0.63, 0.15, navy, 0.06);
    for (const side of [-1, 1]) {
      box(m, side * 0.3, 1.85, 0.45, 0.15, 0.26, 0.09, navy, 0.025);
    }
  } else if (id === "zero") {
    drum(m, 0, 0, 0, 0.85, 0.75, 0.2, 0.85, 0.75, navy);
    drum(m, 0, 0.2, 0, 0.71, 0.62, 0.89, 0.56, 0.5, "#73c5b9", 10);
    drum(m, 0, 1.09, 0, 0.69, 0.62, 0.16, 0.64, 0.58, cream, 10);
    box(m, 0, 1.25, 0, 0.38, 0.64, 0.38, navy, 0.06);
    for (const side of [-1, 1]) {
      box(m, side * 0.51, 0.81, 0, 0.14, 1.08, 0.22, brass, 0.045);
      gem(m, side * 0.51, 1.94, 0, 0.14, 0.19, 0.14, cream, 7);
    }
    gem(m, 0, 1.94, 0, 0.43, 0.51, 0.39, lit ? "#fff2a5" : "#72efdc", 8);
    drum(m, 0, 2.38, 0, 0.13, 0.13, 0.15, 0.07, 0.07, brass, 8);
  } else {
    drum(m, 0, 0, 0, 0.94, 0.76, 0.2, 0.9, 0.73, navy, 9);
    drum(m, 0, 0.2, 0, 0.71, 0.59, 0.65, 0.66, 0.57, "#e3ad76", 8);
    drum(m, 0, 0.85, 0, 0.72, 0.6, 0.17, 0.72, 0.6, navy, 8);
    drum(m, 0, 1.02, 0, 0.5, 0.45, 0.71, 0.4, 0.39, "#ec8059", 8);
    drum(m, 0, 1.73, 0, 0.49, 0.44, 0.16, 0.52, 0.45, cream, 8);
    gem(m, 0, 2.19, 0, 0.39, 0.51, 0.38, lit ? "#fff2a5" : "#ffcc69", 8);
    for (const side of [-1, 1]) {
      const x = side * 0.85;
      box(m, x * 0.72, 0.4, -0.08, 0.1, 0.7, 0.13, navy);
      box(m, x, 1.06, -0.08, 0.65, 0.13, 0.64, "#567f9a", 0.06);
      for (const edge of [-0.24, 0, 0.24])
        box(m, x + edge, 1.193, -0.08, 0.025, 0.015, 0.6, "#c3dcce");
    }
  }
  return m;
}

export function robot(walk: number, walking: boolean, air: boolean): Mesh {
  const m: Mesh = [];
  // Two boots and articulated arms make running legible at classroom-screen sizes.
  const stride = walking && !air ? Math.sin(walk) : 0;
  const bob = walking && !air ? Math.abs(Math.cos(walk)) * 0.055 : 0;
  for (const s of [-1, 1]) {
    const forward = stride * s * 0.23 + (air ? s * 0.09 : 0);
    box(
      m,
      s * 0.22,
      0.025 + (air ? 0.1 : 0),
      0.05 + forward,
      0.34,
      0.24,
      0.46,
      "#dc714c",
      0.07,
    );
    box(m, s * 0.22, 0.21, forward * 0.6, 0.19, 0.28, 0.22, navy, 0.035);
    const armY = 0.47 + bob + (air ? 0.36 : 0);
    box(m, s * 0.54, armY, -forward * 0.74, 0.18, 0.36, 0.2, "#508587", 0.04);
    gem(
      m,
      s * (air ? 0.63 : 0.55),
      armY - 0.015,
      -forward * 0.85 + 0.02,
      0.15,
      0.145,
      0.15,
      "#dd9758",
      6,
    );
  }
  box(m, 0, 0.43 + bob, -0.23, 0.67, 0.6, 0.26, "#ab634a", 0.09);
  box(m, 0, 0.53 + bob, -0.38, 0.42, 0.35, 0.13, brass, 0.04);
  box(m, 0, 0.45 + bob, 0.02, 0.81, 0.67, 0.58, "#50adab", 0.12);
  box(m, 0, 0.51 + bob, 0.3, 0.38, 0.36, 0.07, cream, 0.04);
  box(m, 0, 0.71 + bob, 0.34, 0.18, 0.07, 0.04, "#e1a858");
  box(m, 0, 0.98 + bob, 0.025, 0.8, 0.13, 0.58, "#e78354", 0.1);
  box(m, 0.31, 0.76 + bob, 0.23, 0.17, 0.26, 0.13, "#e78354", 0.03);
  box(m, 0, 1.14 + bob, 0, 1.11, 0.65, 0.78, cream, 0.13);
  box(m, 0, 1.23 + bob, 0.395, 0.86, 0.42, 0.11, "#254b5c", 0.06);
  for (const side of [-1, 1]) {
    box(m, side * 0.214, 1.39 + bob, 0.455, 0.12, 0.16, 0.03, "#aff8e5", 0.014);
    box(
      m,
      side * 0.555,
      1.32 + bob,
      -0.015,
      0.105,
      0.23,
      0.31,
      "#338b94",
      0.03,
    );
  }
  box(m, 0, 1.78 + bob, -0.04, 0.75, 0.08, 0.56, "#81c4b6", 0.09);
  box(m, 0.28, 1.82 + bob, -0.1, 0.066, 0.25, 0.066, navy);
  gem(m, 0.28, 2.08 + bob, -0.1, 0.117, 0.135, 0.117, "#ffd065", 7);
  return m;
}
