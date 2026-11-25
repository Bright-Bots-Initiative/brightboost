import type { GameState } from "./engine";
import {
  beacons,
  contains,
  pickups,
  platforms,
  spawn,
  type Beacon,
  type Platform,
  type Point,
} from "./world";
import { box, gem, place, point, type Mesh } from "./coveMesh";
import { beaconBody, fern, island, robot, tree } from "./coveModels";
import { drawHorizon } from "./coveHorizon";

const TAU = Math.PI * 2;
const flatten = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
interface ScenicObject {
  mesh: Mesh;
  anchor: Point;
  radius: number;
}

function buildGarden() {
  const objects: ScenicObject[] = [];
  const add = (
    mesh: Mesh,
    x: number,
    y: number,
    z: number,
    scale: number,
    angle: number,
    radius: number,
  ) => {
    objects.push({
      mesh: place(mesh, x, y, z, angle, scale),
      anchor: point(x, y, z),
      radius: radius * scale,
    });
  };
  for (const p of platforms.filter((p) => p.kind === "island")) {
    const plants =
      p.theme === "hub"
        ? [
            [-0.75, -0.47, 0.9],
            [0.72, -0.51, 1.06],
            [-0.75, 0.45, 0.62],
            [0.69, 0.56, 0.7],
          ]
        : [
            [-0.63, -0.46, 0.8],
            [0.66, -0.45, 0.92],
            [0.7, 0.35, 0.56],
          ];
    plants.forEach(([x, z, s], i) =>
      add(
        tree((i + (p.theme === "one" ? 1 : 0)) % 3),
        p.x + x * p.rx,
        p.y,
        p.z + z * p.rz,
        s,
        i,
        0.5,
      ),
    );
    for (let i = 0; i < 13; i++) {
      const a = i * 2.4 + 0.35;
      const x = p.x + Math.cos(a) * p.rx * 0.84,
        z = p.z + Math.sin(a) * p.rz * 0.84;
      if (p.theme === "hub" && (Math.abs(z) < 0.76 || Math.abs(x) < 0.73))
        continue;
      const m: Mesh = [];
      if (i % 4 === 0) {
        gem(m, 0, 0.14, 0, 0.29, 0.18, 0.21, "#a7b4a3", 6);
        gem(m, 0.25, 0.08, 0.09, 0.15, 0.1, 0.14, "#bdc6af", 6);
      } else if (i % 3 === 0) m.push(...fern());
      else {
        for (let j = 0; j < 3; j++) {
          const xx = Math.cos(j * 2.4 + i) * 0.14,
            zz = Math.sin(j * 2.4) * 0.16;
          box(m, xx, 0, zz, 0.035, 0.14, 0.035, "#47875e");
          gem(
            m,
            xx,
            0.18,
            zz,
            0.085,
            0.07,
            0.08,
            i % 2 === 0 ? "#fff2bc" : "#f99985",
            5,
          );
        }
      }
      add(m, x, p.y, z, 0.91 + (i % 4) * 0.1, a, 0.21);
    }
  }
  return objects;
}

export function createCoveRenderer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return { draw: () => {} };
  const g = ctx;
  const terrain = platforms.map((p) => ({
    p,
    mesh: place(island(p), p.x, p.y, p.z),
  }));
  const decor = buildGarden();
  const stations = beacons.map((b) => ({
    b,
    unlit: place(beaconBody(b.id, false), b.x, b.y, b.z),
    lit: place(beaconBody(b.id, true), b.x, b.y, b.z),
  }));
  const standingRobot = robot(0, false, false);
  const airborneRobot = robot(0, false, true);
  const crystal: Mesh = [];
  gem(crystal, 0, 0, 0, 0.24, 0.37, 0.24, "#ffce59", 5);
  const tilt = 0.52,
    cs = Math.cos(tilt),
    sn = Math.sin(tilt);
  let width = 0,
    height = 0,
    dpr = 0,
    focal = 0,
    trackX = spawn.x,
    trackZ = 0;
  let cameraZ = 0,
    cameraY = 0,
    lastSeconds: number | undefined,
    walkPhase = 0;
  let heading = 0;
  const projected = (p: Point) => {
    const vz = cameraZ - p.z,
      vy = cameraY - p.y;
    const depth = Math.max(1, cs * vz + sn * vy);
    const scale = focal / depth;
    return {
      x: width * 0.5 + (p.x - trackX) * scale,
      y: height * 0.58 + (cs * vy - sn * vz) * scale,
      depth,
      scale,
    };
  };

  let cameraRevision = 0,
    steadyFrames = 0;
  const sprites = new WeakMap<
    Mesh,
    {
      revision: number;
      image: HTMLCanvasElement;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  >();
  function mesh(faces: Mesh, stationary = false) {
    const reuse = stationary && steadyFrames >= 2;
    if (reuse) {
      const sprite = sprites.get(faces);
      if (sprite?.revision === cameraRevision) {
        g.drawImage(
          sprite.image,
          sprite.x,
          sprite.y,
          sprite.width,
          sprite.height,
        );
        return;
      }
    }
    let left = Infinity,
      right = -Infinity,
      top = Infinity,
      bottom = -Infinity;
    // Sort the faces of each small solid in camera space. Shared vertices across
    // adjacent facets project to identical positions, keeping seams very fine.
    const ordered = faces
      .map((f) => {
        let depth = 0;
        const points = f.points.map((p) => {
          const v = projected(p);
          depth += v.depth;
          return v;
        });
        // Back-facing facets of the opaque solids need no paint.
        let area = 0;
        for (let i = 0; i < points.length; i++) {
          const p = points[i],
            q = points[(i + 1) % points.length];
          area += p.x * q.y - q.x * p.y;
          if (reuse) {
            left = Math.min(left, p.x);
            right = Math.max(right, p.x);
            top = Math.min(top, p.y);
            bottom = Math.max(bottom, p.y);
          }
        }
        return { points, color: f.color, depth: depth / points.length, area };
      })
      .filter((f) => f.area > 0.024);
    ordered.sort((a, b) => b.depth - a.depth);
    let target: CanvasRenderingContext2D = g;
    let sprite: HTMLCanvasElement | undefined;
    if (reuse && ordered.length) {
      left = Math.floor(left) - 1;
      top = Math.floor(top) - 1;
      right = Math.ceil(right) + 1;
      bottom = Math.ceil(bottom) + 1;
      sprite = document.createElement("canvas");
      sprite.width = Math.max(1, Math.ceil((right - left) * dpr));
      sprite.height = Math.max(1, Math.ceil((bottom - top) * dpr));
      const context = sprite.getContext("2d");
      if (context) {
        target = context;
        target.setTransform(dpr, 0, 0, dpr, -left * dpr, -top * dpr);
      } else sprite = undefined;
    }
    for (const face of ordered) {
      target.beginPath();
      face.points.forEach((p, i) =>
        i ? target.lineTo(p.x, p.y) : target.moveTo(p.x, p.y),
      );
      target.closePath();
      target.fillStyle = face.color;
      target.fill();
      // Fractional overdraw closes anti-aliasing seams between adjacent faces.
      target.strokeStyle = face.color;
      target.lineWidth = 0.48;
      target.lineJoin = "round";
      target.stroke();
    }
    if (sprite) {
      const entry = {
        revision: cameraRevision,
        image: sprite,
        x: left,
        y: top,
        width: sprite.width / dpr,
        height: sprite.height / dpr,
      };
      sprites.set(faces, entry);
      g.drawImage(sprite, entry.x, entry.y, entry.width, entry.height);
    }
  }
  function ellipse(
    x: number,
    y: number,
    z: number,
    rx: number,
    rz: number,
    color: string,
    stroke?: string,
  ) {
    g.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * TAU;
      const p = projected(point(x + Math.cos(a) * rx, y, z + Math.sin(a) * rz));
      if (i) g.lineTo(p.x, p.y);
      else g.moveTo(p.x, p.y);
    }
    g.closePath();
    g.fillStyle = color;
    g.fill();
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = 1.15;
      g.stroke();
    }
  }
  function polygon(points: Point[], color: string) {
    g.beginPath();
    points.forEach((v, i) => {
      const p = projected(v);
      if (i) g.lineTo(p.x, p.y);
      else g.moveTo(p.x, p.y);
    });
    g.closePath();
    g.fillStyle = color;
    g.fill();
  }
  function line(points: Point[], color: string, thickness: number) {
    g.beginPath();
    points.forEach((v, i) => {
      const p = projected(v);
      if (i) g.lineTo(p.x, p.y);
      else g.moveTo(p.x, p.y);
    });
    g.strokeStyle = color;
    g.lineWidth = thickness;
    g.lineJoin = "round";
    g.lineCap = "round";
    g.stroke();
  }
  function groundArt(p: Platform) {
    const y = p.y + 0.018;
    if (p.kind === "stone") {
      ellipse(
        p.x,
        y,
        p.z,
        p.rx * 0.68,
        p.rz * 0.65,
        p.theme === "mix" ? "#b4c99b" : "#d2cf8e",
      );
      return;
    }
    if (p.kind !== "island") return;
    if (p.theme === "hub") {
      for (const [dx, dz, length] of [
        [-1, 0, p.rx],
        [1, 0, p.rx],
        [0, -1, p.rz],
      ]) {
        const a = point(-dz * 0.55, y, dx * 0.55),
          b = point(dz * 0.55, y, -dx * 0.55);
        polygon(
          [
            a,
            b,
            point(b.x + dx * (length - 0.13), y, b.z + dz * (length - 0.13)),
            point(a.x + dx * (length - 0.13), y, a.z + dz * (length - 0.13)),
          ],
          "#cbd18a",
        );
        for (let i = 0; i < 3; i++) {
          const d = 1.62 + i * 0.85;
          const cx = dx * d,
            cz = dz * d;
          // Arrow-shaped stone inlays point toward each trail.
          polygon(
            [
              point(cx - dz * 0.23, y, cz + dx * 0.23),
              point(cx + dx * 0.2, y, cz + dz * 0.2),
              point(cx + dz * 0.23, y, cz - dx * 0.23),
              point(cx + dx * 0.035, y, cz + dz * 0.035),
            ],
            "#f2e7b4",
          );
        }
      }
      ellipse(0, y, 0, 1.42, 1.34, "#d4d49d");
      ellipse(0, y + 0.005, 0, 1.08, 1.02, "#789e93", "#e6ddb2");
      ellipse(0, y + 0.008, 0, 0.82, 0.77, "#94b5a3");
      polygon(
        [
          point(0, y + 0.01, -0.67),
          point(0.23, y + 0.01, -0.14),
          point(0.63, y + 0.01, 0),
          point(0.14, y + 0.01, 0.14),
          point(0, y + 0.01, 0.64),
          point(-0.18, y + 0.01, 0.14),
          point(-0.58, y + 0.01, 0),
          point(-0.18, y + 0.01, -0.13),
        ],
        "#f3db93",
      );
    } else {
      ellipse(p.x, y, p.z - 0.2, 1.44, 1.18, "#ddd19b");
      ellipse(p.x, y + 0.01, p.z - 0.2, 1.21, 0.99, "#91a694", "#fff0c5");
    }
  }
  function mark(b: Beacon, lit: boolean, seconds: number) {
    const wp = point(b.x, b.y + 0.57, b.z + (b.id === "mix" ? 0.86 : 0.77));
    const s = projected(wp),
      r = Math.max(7, s.scale * (b.id === "mix" ? 0.42 : 0.37));
    g.save();
    g.translate(s.x, s.y);
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.fillStyle = "#243e50";
    g.fill();
    g.strokeStyle = lit ? "#ffe69a" : "#eee3bc";
    g.lineWidth = Math.max(1.4, r * 0.15);
    g.stroke();
    g.fillStyle = "#fff7db";
    g.font = `900 ${r * (b.id === "mix" ? 1.04 : 1.59)}px system-ui,sans-serif`;
    g.textBaseline = "middle";
    g.textAlign = "center";
    g.fillText(
      b.id === "zero" ? "0" : b.id === "one" ? "1" : "0·1",
      0,
      r * 0.06,
    );
    g.restore();
    const top = projected(
      point(
        b.x,
        b.y + (b.id === "mix" ? 3.02 : b.id === "one" ? 2.18 : 1.91),
        b.z,
      ),
    );
    const rad = top.scale * (lit ? 1.14 : 0.59);
    const glow = g.createRadialGradient(
      top.x,
      top.y,
      0,
      top.x,
      top.y,
      Math.max(1, rad),
    );
    glow.addColorStop(0, lit ? "#fff9bdc4" : "#fff4c591");
    glow.addColorStop(1, "#ffffcf00");
    g.fillStyle = glow;
    g.fillRect(top.x - rad, top.y - rad, rad * 2, rad * 2);
    if (lit) {
      for (let i = 0; i < 3; i++) {
        const a = seconds * 1.4 + (i * TAU) / 3;
        sparkle(
          top.x + Math.cos(a) * rad * 0.74,
          top.y + Math.sin(a) * rad * 0.44,
          rad * 0.1,
        );
      }
    }
  }
  function sparkle(x: number, y: number, r: number) {
    g.fillStyle = "#fff5bc";
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        radius = i % 2 ? r * 0.26 : r;
      const sx = x + Math.sin(a) * radius,
        sy = y + Math.cos(a) * radius;
      if (i) g.lineTo(sx, sy);
      else g.moveTo(sx, sy);
    }
    g.closePath();
    g.fill();
  }

  function flag(
    x: number,
    y: number,
    z: number,
    seconds: number,
    color: string,
    size = 1,
  ) {
    const a = projected(point(x, y, z));
    line(
      [point(x, y, z), point(x, y + 1.5 * size, z)],
      "#795b4a",
      Math.max(1, a.scale * 0.065),
    );
    const wave = Math.sin(seconds * 2 + x) * 0.07;
    polygon(
      [
        point(x, y + 1.48 * size, z),
        point(x + 0.4 * size, y + (1.5 + wave) * size, z + 0.035),
        point(x + 0.82 * size, y + (1.36 + wave) * size, z),
        point(x + 0.43 * size, y + (1.24 + wave) * size, z),
        point(x, y + 1.15 * size, z),
      ],
      color,
    );
  }
  // The broad sky and opaque terrain do not change while the camera rests.
  const ground = document.createElement("canvas");
  const groundContext = ground.getContext("2d");
  let cachedX = NaN,
    cachedZ = NaN;
  return {
    draw(state: GameState, seconds: number, reducedMotion = false) {
      const w = canvas.clientWidth,
        h = canvas.clientHeight;
      if (!w || !h) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.8);
      if (w !== width || h !== height || ratio !== dpr) {
        width = w;
        height = h;
        dpr = ratio;
        canvas.width = Math.round(w * ratio);
        canvas.height = Math.round(h * ratio);
        ground.width = canvas.width;
        ground.height = canvas.height;
        cachedX = NaN;
        g.setTransform(ratio, 0, 0, ratio, 0, 0);
        focal = Math.min(h * 1.23, w * 0.95);
      }
      const dt =
        lastSeconds === undefined
          ? 0
          : Math.max(0, Math.min(0.1, seconds - lastSeconds));
      const first = lastSeconds === undefined;
      lastSeconds = seconds;
      const follow = first || reducedMotion ? 1 : 1 - Math.exp(-4.8 * dt);
      const desiredX = state.player.x * 0.8,
        desiredZ = (state.player.z - spawn.z) * 0.74;
      trackX += (desiredX - trackX) * follow;
      trackZ += (desiredZ - trackZ) * follow;
      if (Math.abs(trackX - desiredX) < 0.008) trackX = desiredX;
      if (Math.abs(trackZ - desiredZ) < 0.008) trackZ = desiredZ;
      cameraZ = 19.2 + trackZ;
      cameraY = 11.45;
      const t = reducedMotion ? 0 : seconds;
      if (state.moving && !reducedMotion) walkPhase += dt * 11.5;
      // Rotate by the shortest arc. The robot keeps facing its last travel direction.
      heading +=
        Math.atan2(
          Math.sin(state.facing - heading),
          Math.cos(state.facing - heading),
        ) * (first || reducedMotion ? 1 : 1 - Math.exp(-15 * dt));

      if (!groundContext || cachedX !== trackX || cachedZ !== trackZ) {
        steadyFrames = 0;
        cameraRevision++;
        drawHorizon(g, width, height, trackX);
        for (const { p } of terrain.filter(({ p }) => p.kind === "island")) {
          ellipse(
            p.x + 0.63,
            -4.65,
            p.z + 0.43,
            p.rx * 0.9,
            p.rz * 0.76,
            "#398f9629",
          );
          ellipse(
            p.x + 0.6,
            -4.65,
            p.z + 0.4,
            p.rx * 0.68,
            p.rz * 0.5,
            "#438c8c23",
          );
        }
        const sorted = [...terrain].sort(
          (a, b) => a.p.z - b.p.z || (a.p.kind === "bridge" ? 1 : -1),
        );
        for (const { p, mesh: surface } of sorted) {
          mesh(surface);
          groundArt(p);
        }
        for (const obj of decor)
          ellipse(
            obj.anchor.x,
            obj.anchor.y + 0.025,
            obj.anchor.z,
            obj.radius,
            obj.radius * 0.72,
            "#4a7a6e33",
          );
        for (const b of beacons)
          ellipse(b.x + 0.18, b.y + 0.024, b.z + 0.12, 1.04, 0.71, "#507c6e42");
        if (groundContext) {
          groundContext.drawImage(canvas, 0, 0);
          cachedX = trackX;
          cachedZ = trackZ;
        }
      } else {
        steadyFrames++;
        g.drawImage(ground, 0, 0, width, height);
      }

      const p = state.player;
      const below = platforms
        .filter((is) => contains(is, p.x, p.z) && is.y <= p.y + 0.1)
        .sort((a, b) => b.y - a.y)[0];
      const actors: { z: number; draw: () => void }[] = [];
      if (below) {
        const altitude = Math.max(0, p.y - below.y);
        const size = 0.52 / (1 + 0.12 * altitude);
        ellipse(
          p.x,
          below.y + 0.032,
          p.z,
          size,
          size * 0.73,
          `rgba(38,76,74,${0.34 / (1 + 0.35 * altitude)})`,
        );
      }
      for (const obj of decor) {
        const pos = projected(obj.anchor);
        if (pos.x < -60 || pos.x > width + 60) continue;
        actors.push({
          z: obj.anchor.z,
          draw: () => {
            const inFront =
              obj.anchor.z > p.z &&
              Math.abs(obj.anchor.x - p.x) < 0.77 &&
              flatten(obj.anchor, p) < 2.5;
            g.globalAlpha = inFront ? 0.55 : 1;
            mesh(obj.mesh, true);
            g.globalAlpha = 1;
          },
        });
      }
      for (const station of stations) {
        const { b } = station;
        actors.push({
          z: b.z,
          draw: () => {
            const lit = state.lit.includes(b.id);
            const inFront =
              b.z > p.z && Math.abs(b.x - p.x) < 0.85 && flatten(b, p) < 2.45;
            g.globalAlpha = inFront ? 0.58 : 1;
            mesh(lit ? station.lit : station.unlit, true);
            mark(b, lit, t);
            g.globalAlpha = 1;
          },
        });
      }
      for (const [i, item] of pickups.entries()) {
        if (state.collected.includes(item.id)) continue;
        const y = item.y + 0.13 * Math.sin(t * 2.7 + i);
        actors.push({
          z: item.z,
          draw: () => {
            const top = projected(point(item.x, y, item.z));
            const shine = 0.5 + 0.5 * Math.sin(t * 3.1 + i);
            mesh(place(crystal, item.x, y, item.z, 0.48 + t * 1.28 + i));
            if (shine > 0.64)
              sparkle(
                top.x + top.scale * 0.14,
                top.y - top.scale * 0.24,
                top.scale * 0.11 * shine,
              );
          },
        });
      }
      const flags = [
        [-3.98, 0, -1.15, "#e57e5b"],
        [-8.47, 0.08, 1.13, "#47aaa1"],
        [1.32, 0, -3.61, "#e79357"],
        [-1.26, 0.82, -9.48, "#a98ad8"],
      ] as const;
      for (const [x, y, z, color] of flags)
        actors.push({ z, draw: () => flag(x, y, z, t, color, 0.87) });
      actors.push({
        z: p.z,
        draw: () => {
          let spin = 0;
          if (state.cometJump) {
            const arc = Math.min(1, state.cometTime / 0.66);
            spin = reducedMotion ? 0 : TAU * (arc * arc * (3 - 2 * arc));
            const backX = -Math.sin(heading),
              backZ = -Math.cos(heading);
            for (const side of [-1, 1]) {
              const streak = Array.from({ length: 5 }, (_, i) => {
                const d = i / 4;
                return point(
                  p.x +
                    backX * d * 0.95 +
                    Math.cos(heading) * side * (0.19 + 0.14 * d),
                  p.y + 0.29 - d * 0.64,
                  p.z +
                    backZ * d * 0.95 -
                    Math.sin(heading) * side * (0.19 + 0.14 * d),
                );
              });
              line(
                streak,
                side > 0 ? "#ffe39a" : "#b7fff3",
                Math.max(2, projected(p).scale * 0.09),
              );
              const tail = projected(streak[4]);
              sparkle(tail.x, tail.y, Math.max(2, tail.scale * 0.095));
            }
          }
          const body = !state.grounded
            ? airborneRobot
            : state.moving && !reducedMotion
              ? robot(walkPhase, true, false)
              : standingRobot;
          mesh(place(body, p.x, p.y, p.z, heading + spin));
        },
      });
      actors.sort((a, b) => a.z - b.z);
      actors.forEach((actor) => actor.draw());
    },
  };
}
