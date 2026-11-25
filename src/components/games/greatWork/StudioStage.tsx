import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ELEMENTS, glyphCells, tips } from "@shared/greatwork-engine";
import type {
  Axial,
  MachineSpec,
  Part,
  SimState,
} from "@shared/greatwork-engine";
import { axialToPixel, hexVertices } from "./greatWorkView";
import type { Camera, Point } from "./greatWorkView";
import { partFootprint } from "./greatWorkModel";
import { drawAtom } from "./board/drawBoard";
import { useReducedGameEffects } from "../shared/useReducedGameEffects";

type Brush = CanvasRenderingContext2D;
const INK = "#082d39";
function circle(
  ctx: Brush,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke?: string,
  line = 2,
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = line;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
function path(
  ctx: Brush,
  points: readonly Point[],
  fill: string,
  stroke?: string,
  line = 2,
) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = line;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
function line(
  ctx: Brush,
  x: number,
  y: number,
  endX: number,
  endY: number,
  width: number,
  color: string,
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}
function base(ctx: Brush, at: Axial, c: Camera, color: string) {
  const poly = hexVertices(at, c, 0.86);
  path(
    ctx,
    poly.map((p) => ({ ...p, y: p.y + c.size * 0.16 })),
    "#153443",
    INK,
  );
  path(ctx, poly, color, INK, Math.max(2, c.size * 0.05));
}
function water(ctx: Brush, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.bezierCurveTo(-0.08, -0.57, -0.67, -0.17, -0.67, 0.25);
  ctx.bezierCurveTo(-0.67, 1.13, 0.66, 1.13, 0.66, 0.25);
  ctx.bezierCurveTo(0.66, -0.18, 0.22, -0.67, 0, -1);
  ctx.fillStyle = "#68e7ff";
  ctx.fill();
  ctx.lineWidth = 0.11;
  ctx.strokeStyle = "#123b51";
  ctx.stroke();
  line(ctx, -0.31, 0.19, -0.2, -0.04, 0.12, "#eaffff");
  ctx.restore();
}
function arm(
  ctx: Brush,
  origin: Point,
  end: Point,
  size: number,
  held: boolean,
) {
  const angle = Math.atan2(end.y - origin.y, end.x - origin.x),
    len = Math.hypot(end.x - origin.x, end.y - origin.y);
  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.rotate(angle);
  line(ctx, 0, size * 0.11, len, size * 0.11, size * 0.48, "#102f39");
  line(ctx, 0, 0, len, 0, size * 0.44, INK);
  line(ctx, 0, 0, len, 0, size * 0.32, "#eea63e");
  line(
    ctx,
    size * 0.25,
    -size * 0.07,
    len - size * 0.25,
    -size * 0.07,
    size * 0.07,
    "#ffe69a",
  );
  const gap = held ? 0.24 : 0.4;
  for (const dir of [-1, 1]) {
    line(
      ctx,
      len - size * 0.24,
      0,
      len + size * 0.03,
      dir * size * gap,
      size * 0.17,
      INK,
    );
    line(
      ctx,
      len + size * 0.03,
      dir * size * gap,
      len + size * 0.22,
      dir * size * (gap - 0.05),
      size * 0.17,
      INK,
    );
    line(
      ctx,
      len - size * 0.24,
      0,
      len + size * 0.03,
      dir * size * gap,
      size * 0.085,
      "#ffcc68",
    );
    line(
      ctx,
      len + size * 0.03,
      dir * size * gap,
      len + size * 0.22,
      dir * size * (gap - 0.05),
      size * 0.085,
      "#ffcc68",
    );
  }
  circle(ctx, 0, 0, size * 0.42, "#194756", INK);
  circle(ctx, 0, 0, size * 0.3, "#ffc96b", INK, size * 0.045);
  circle(ctx, 0, 0, size * 0.13, "#2a6470");
  line(ctx, -size * 0.065, 0, size * 0.065, 0, size * 0.04, "#adf2db");
  ctx.restore();
}
function paint(
  ctx: Brush,
  w: number,
  h: number,
  parts: readonly Part[],
  state: SimState | null,
  previous: SimState | null,
  fraction: number,
  labels: { input: string; output: string },
) {
  const unit: Camera = { width: w, height: h, size: 1, x: 0, y: 0 };
  const cells = parts.flatMap((p) => [
    ...partFootprint(p),
    ...(p.kind === "arm" ? tips(p) : []),
  ]);
  const pts = (cells.length ? cells : [{ q: 0, r: 0 }]).map((p) =>
    axialToPixel(p, unit),
  );
  const xs = pts.map((p) => p.x),
    ys = pts.map((p) => p.y),
    loX = Math.min(...xs),
    hiX = Math.max(...xs),
    loY = Math.min(...ys),
    hiY = Math.max(...ys);
  const s = Math.min(
    61,
    (w - 28) / (hiX - loX + 3.2),
    (h - 32) / (hiY - loY + 3.0),
  );
  const c: Camera = {
    ...unit,
    size: s,
    x: w / 2 - ((loX + hiX) * s) / 2,
    y: h / 2 - ((loY + hiY) * s) / 2 - 3,
  };
  ctx.clearRect(0, 0, w, h);
  const wash = ctx.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, "#214e55");
  wash.addColorStop(0.56, "#173d49");
  wash.addColorStop(1, "#102e3b");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Draw only visible lattice rows, even when a large design is displayed.
  const grid = Math.max(25, s);
  for (let r = -1; r < h / (grid * 1.5) + 2; r++) {
    for (let q = -1; q < w / (grid * 1.73) + 2; q++) {
      const x = q * grid * 1.732 + (r % 2) * grid * 0.866,
        y = r * grid * 1.5;
      const corners = hexVertices(
        { q: 0, r: 0 },
        { ...c, x, y, size: grid },
        0.97,
      );
      ctx.beginPath();
      corners.forEach((v, i) =>
        i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y),
      );
      ctx.closePath();
      ctx.strokeStyle = "#ffffff13";
      ctx.lineWidth = 1;
      ctx.stroke();
      circle(ctx, x, y, 1.5, "#9ac8b94a");
    }
  }
  // A registration mark at each corner frames the working area.
  for (const [x, y, dx, dy] of [
    [13, 13, 1, 1],
    [w - 13, 13, -1, 1],
    [13, h - 13, 1, -1],
    [w - 13, h - 13, -1, -1],
  ]) {
    line(ctx, x, y, x + 10 * dx, y, 2, "#81b7b0");
    line(ctx, x, y, x, y + 10 * dy, 2, "#81b7b0");
  }
  for (const part of parts) {
    if (part.kind === "arm") continue;
    if (part.kind === "glyph") {
      for (const cell of glyphCells(part.glyph)) base(ctx, cell, c, "#9f83ba");
      const at = axialToPixel(part.glyph.anchor, c);
      ctx.fillStyle = INK;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${s * 0.52}px sans-serif`;
      ctx.fillText("✦", at.x, at.y);
      continue;
    }
    if (part.kind === "track") {
      for (const cell of part.cells) base(ctx, cell, c, "#8a999f");
      continue;
    }
    const input = part.kind === "dispenser",
      p = axialToPixel(part.at, c);
    base(ctx, part.at, c, input ? "#57bfc0" : "#d6a95d");
    circle(
      ctx,
      p.x,
      p.y,
      s * 0.48,
      input ? "#24596a" : "#8a693d",
      INK,
      s * 0.045,
    );
    circle(
      ctx,
      p.x,
      p.y,
      s * 0.36,
      input ? "#153949" : "#524b39",
      input ? "#85dfdd" : "#f3ca6f",
      s * 0.065,
    );
    if (input && !state?.atoms.size) {
      if (part.element === "water") water(ctx, p.x, p.y, s * 0.24);
      else {
        ctx.fillStyle = "white";
        ctx.font = `bold ${s * 0.38}px sans-serif`;
        ctx.fillText(ELEMENTS[part.element].icon, p.x, p.y);
      }
    } else if (!input) {
      ctx.strokeStyle = "#f4ce7e";
      ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.13, p.y - s * 0.02);
      ctx.lineTo(p.x, p.y + s * 0.09);
      ctx.lineTo(p.x + s * 0.13, p.y - s * 0.02);
      ctx.stroke();
    }
    const label = input ? labels.input : labels.output;
    ctx.font = `800 ${Math.max(10, Math.min(13, s * 0.26))}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tagW = ctx.measureText(label).width + 14,
      tagY = p.y + s * 0.83;
    ctx.fillStyle = INK;
    ctx.fillRect(p.x - tagW / 2, tagY - 9, tagW, 18);
    ctx.fillStyle = input ? "#a5efea" : "#ffe5a5";
    ctx.fillText(label, p.x, tagY);
  }
  const arms = state
    ? [...state.arms.values()]
    : parts.filter((p) => p.kind === "arm");
  for (const a of arms) {
    const origin = axialToPixel(a.anchor, c),
      prior = previous?.arms.get(a.id);
    for (const [i, tip] of tips(a).entries()) {
      const end = axialToPixel(tip, c);
      if (prior && fraction < 1) {
        const oldTip = tips(prior)[i];
        if (oldTip) {
          const start = axialToPixel(oldTip, c);
          const before = Math.atan2(start.y - origin.y, start.x - origin.x),
            after = Math.atan2(end.y - origin.y, end.x - origin.x);
          const delta = Math.atan2(
            Math.sin(after - before),
            Math.cos(after - before),
          );
          const len = Math.hypot(end.x - origin.x, end.y - origin.y);
          end.x = origin.x + Math.cos(before + delta * fraction) * len;
          end.y = origin.y + Math.sin(before + delta * fraction) * len;
        }
      }
      arm(ctx, origin, end, s, "held" in a && a.held.length > 0);
    }
  }
  if (state) {
    for (const bond of state.bonds) {
      const a = state.atoms.get(bond.a),
        b = state.atoms.get(bond.b);
      if (a && b) {
        const ap = axialToPixel(a.at, c),
          bp = axialToPixel(b.at, c);
        line(ctx, ap.x, ap.y, bp.x, bp.y, Math.max(2, s * 0.12), "#cde3d4");
      }
    }
    for (const a of state.atoms.values()) {
      const start = previous?.atoms.get(a.id)?.at;
      const at = start
        ? {
            q: start.q + (a.at.q - start.q) * fraction,
            r: start.r + (a.at.r - start.r) * fraction,
          }
        : a.at;
      const p = axialToPixel(at, c);
      if (a.element === "water") water(ctx, p.x, p.y, s * 0.36);
      else drawAtom(ctx, at, a.element, c);
    }
    if (state.error?.kind === "collision") {
      const p = axialToPixel(state.error.at, c);
      circle(ctx, p.x, p.y, s * 0.5, "#ffe4c4", "#bd582c");
      ctx.fillStyle = "#7a320f";
      ctx.font = `bold ${s * 0.62}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("!", p.x, p.y);
    }
  }
}

export function StudioStage({
  program,
  fixedParts,
  state,
}: {
  program: MachineSpec;
  fixedParts: readonly Part[];
  state: SimState | null;
}) {
  const { t } = useTranslation();
  const element = useRef<HTMLCanvasElement>(null);
  const prior = useRef<SimState | null>(null);
  const { reducedEffects } = useReducedGameEffects();
  useEffect(() => {
    const canvas = element.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const previous = prior.current;
    prior.current = state;
    const animate =
      !reducedEffects &&
      !!state &&
      previous?.tick === state.tick - 1 &&
      previous.program === state.program;
    const start = performance.now();
    let frame = 0;
    const parts = [...fixedParts, ...program.parts];
    function render() {
      if (!canvas || !ctx) return;
      const w = canvas.clientWidth,
        h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (
        canvas.width !== Math.round(w * dpr) ||
        canvas.height !== Math.round(h * dpr)
      ) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const f = animate ? Math.min(1, (performance.now() - start) / 260) : 1;
      paint(ctx, w, h, parts, state, previous, 1 - (1 - f) ** 3, {
        input: t("games.greatWork.parts.dispenser"),
        output: t("games.greatWork.parts.acceptor"),
      });
      if (f < 1) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(render);
      }
    }
    render();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(render);
    observer?.observe(canvas);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [program, fixedParts, state, t, reducedEffects]);
  return (
    <canvas
      className="gws-stage"
      ref={element}
      role="img"
      aria-label={t("games.greatWork.studio.boardAlt")}
    />
  );
}
