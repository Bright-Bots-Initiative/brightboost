import { tips, glyphCells, ELEMENTS, GLYPHS } from "@shared/greatwork-engine";
import type {
  Axial,
  MachineSpec,
  Part,
  SimState,
  ElementId,
  Molecule,
  BoardBounds,
} from "@shared/greatwork-engine";
import { axialToPixel, hexVertices } from "../greatWorkView";
import type { Camera } from "../greatWorkView";
import { partAnchor, partFootprint } from "../greatWorkModel";
import { drawAreaOverlay } from "./drawAreaOverlay";
export type BoardContext = Pick<
  CanvasRenderingContext2D,
  | "beginPath"
  | "moveTo"
  | "lineTo"
  | "closePath"
  | "fill"
  | "stroke"
  | "save"
  | "restore"
  | "fillStyle"
  | "strokeStyle"
  | "lineWidth"
  | "setLineDash"
  | "clearRect"
  | "fillRect"
  | "arc"
  | "font"
  | "textAlign"
  | "textBaseline"
  | "fillText"
  | "globalAlpha"
  | "lineCap"
  | "lineJoin"
>;
export interface BoardScene {
  program: MachineSpec;
  fixedParts: readonly Part[];
  state: SimState | null;
  bounds: BoardBounds;
  walls?: readonly Axial[];
  camera: Camera;
  cursor: Axial;
  selected: number | null;
  area: boolean;
  preview?: { part: Part; legal: boolean } | null;
  labels: { input: string; output: string; arm: string };
}
export const ELEMENT_COLORS: Readonly<Record<ElementId, string>> =
  Object.freeze({
    essence: "#edf2f4",
    fire: "#f5b176",
    water: "#91cce7",
    air: "#d5e7e6",
    earth: "#c9b197",
    grass: "#a6ca84",
    life: "#88c2a5",
    death: "#d8bdde",
    balance: "#cbcaef",
    omni: "#f3d796",
    copper: "#c18b68",
    silver: "#d0dbe3",
    gold: "#f1ce64",
    platinum: "#bacddb",
    emerald: "#73c5a0",
    diamond: "#b6dded",
    catalyst: "#edb9de",
  });
export function pathHex(
  ctx: BoardContext,
  at: Axial,
  c: Camera,
  scale = 0.96,
): void {
  ctx.beginPath();
  hexVertices(at, c, scale).forEach((p, i) =>
    i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
  );
  ctx.closePath();
}
function segment(ctx: BoardContext, a: Axial, b: Axial, c: Camera): void {
  const p = axialToPixel(a, c),
    q = axialToPixel(b, c);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(q.x, q.y);
  ctx.stroke();
}
export function drawAtom(
  ctx: BoardContext,
  at: Axial,
  element: ElementId,
  c: Camera,
): void {
  const p = axialToPixel(at, c),
    r = c.size * 0.48;
  ctx.fillStyle = ELEMENT_COLORS[element];
  ctx.strokeStyle = "#264954";
  ctx.lineWidth = 1.5;
  // Shape differs by catalogue identity, independently of the fill colour.
  const ids = Object.keys(ELEMENTS) as ElementId[],
    i = ids.indexOf(element);
  ctx.beginPath();
  if (i % 4 === 0) {
    ctx.moveTo(p.x, p.y - r);
    ctx.lineTo(p.x + r, p.y);
    ctx.lineTo(p.x, p.y + r);
    ctx.lineTo(p.x - r, p.y);
    ctx.closePath();
  } else if (i % 4 === 1) {
    ctx.moveTo(p.x, p.y - r);
    ctx.lineTo(p.x + r, p.y + r * 0.8);
    ctx.lineTo(p.x - r, p.y + r * 0.8);
    ctx.closePath();
  } else if (i % 4 === 2) {
    for (let n = 0; n < 6; n++) {
      const a = (n * Math.PI) / 3;
      const x = p.x + r * Math.cos(a),
        y = p.y + r * Math.sin(a);
      if (n) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
  } else {
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#173e4b";
  ctx.font = `600 ${Math.max(9, c.size * 0.49)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ELEMENTS[element].icon, p.x, p.y + 0.4);
}
function drawPart(ctx: BoardContext, part: Part, scene: BoardScene): void {
  const c = scene.camera,
    selected = scene.selected === part.id;
  ctx.save();
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.strokeStyle = selected ? "#b46b22" : "#7695a0";
  if (part.kind === "glyph") {
    const cells = glyphCells(part.glyph),
      def = GLYPHS[part.glyph.kind];
    cells.forEach((at, i) => {
      ctx.fillStyle = "#edf0fb";
      pathHex(ctx, at, c, 0.83);
      ctx.fill();
      ctx.stroke();
      const p = axialToPixel(at, c);
      ctx.fillStyle = "#53618a";
      ctx.font = `700 ${Math.max(8, c.size * 0.35)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const symbol = def.inputSlots.includes(i)
        ? "↓"
        : def.outputSlots.includes(i)
          ? "↑"
          : "·";
      ctx.fillText(symbol, p.x, p.y + c.size * 0.42);
    });
    const at = axialToPixel(part.glyph.anchor, c);
    ctx.fillStyle = "#435781";
    ctx.font = `700 ${Math.max(10, c.size * 0.55)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    const marks: Record<string, string> = {
      simplify: "◇",
      duplicate: "2×",
      growth: "✿",
      compression: "⇢⇠",
      refinement: "✦",
      affect: "≈",
      realize: "⇄",
      unification: "✧",
      destroy: "×",
      bond_single: "↔",
    };
    ctx.fillText(marks[part.glyph.kind], at.x, at.y - c.size * 0.12);
  } else if (part.kind === "dispenser" || part.kind === "acceptor") {
    const p = axialToPixel(part.at, c);
    ctx.fillStyle = part.kind === "dispenser" ? "#e3f1ed" : "#fff0ce";
    pathHex(ctx, part.at, c, 0.87);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = part.kind === "dispenser" ? "#286954" : "#8b6420";
    ctx.font = `700 ${Math.max(8, c.size * 0.28)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      part.kind === "dispenser" ? scene.labels.input : scene.labels.output,
      p.x,
      p.y + c.size * 0.6,
    );
    ctx.font = `700 ${Math.max(12, c.size * 0.56)}px Inter, system-ui, sans-serif`;
    ctx.fillText(
      part.kind === "dispenser" ? ELEMENTS[part.element].icon : "⇩",
      p.x,
      p.y - c.size * 0.15,
    );
  }
  ctx.restore();
}
/** Actual scene painter; no simulation step, random value, store or DOM read here. */
export function drawBoard(ctx: BoardContext, scene: BoardScene): void {
  const c = scene.camera;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#f8fbfa";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = "#dfe9e6";
  for (let r = scene.bounds.minR; r <= scene.bounds.maxR; r++)
    for (let q = scene.bounds.minQ; q <= scene.bounds.maxQ; q++) {
      pathHex(ctx, { q, r }, c);
      ctx.stroke();
    }
  if (scene.area && scene.state)
    drawAreaOverlay(ctx, scene.state.areaClaimed, c);
  for (const at of scene.walls ?? []) {
    ctx.fillStyle = "#647479";
    pathHex(ctx, at, c);
    ctx.fill();
  }
  const parts = [...scene.fixedParts, ...scene.program.parts];
  for (const part of parts) drawPart(ctx, part, scene);
  if (scene.state) {
    ctx.strokeStyle = "#57717c";
    ctx.lineWidth = Math.max(2, c.size * 0.12);
    for (const bond of scene.state.bonds) {
      const a = scene.state.atoms.get(bond.a),
        b = scene.state.atoms.get(bond.b);
      if (a && b) segment(ctx, a.at, b.at, c);
    }
  }
  const arms = scene.state
    ? [...scene.state.arms.values()]
    : parts.filter((p) => p.kind === "arm");
  for (const arm of arms) {
    const p = axialToPixel(arm.anchor, c);
    ctx.strokeStyle = scene.selected === arm.id ? "#b96e24" : "#355865";
    ctx.lineWidth = Math.max(3, c.size * 0.15);
    for (const tip of tips(arm)) {
      segment(ctx, arm.anchor, tip, c);
      const end = axialToPixel(tip, c);
      ctx.beginPath();
      ctx.arc(end.x, end.y, c.size * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, c.size * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = "#284e5f";
    ctx.fill();
    ctx.strokeStyle = "#143b4b";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.max(10, c.size * 0.36)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(arm.id), p.x, p.y);
  }
  if (scene.state)
    for (const atom of scene.state.atoms.values())
      drawAtom(ctx, atom.at, atom.element, c);
  if (scene.selected !== null) {
    const selected = parts.find((p) => p.id === scene.selected);
    if (selected) {
      ctx.strokeStyle = "#b77324";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 3]);
      pathHex(ctx, partAnchor(selected), c, 1);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  if (scene.preview) {
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = scene.preview.legal ? "#bde3d3" : "#f4d2c6";
    ctx.strokeStyle = scene.preview.legal ? "#286c53" : "#9b4931";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    for (const cell of partFootprint(scene.preview.part)) {
      pathHex(ctx, cell, c, 0.86);
      ctx.fill();
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = "#197c9e";
  ctx.lineWidth = 2;
  pathHex(ctx, scene.cursor, c, 0.94);
  ctx.stroke();
  if (scene.state?.error?.kind === "collision") {
    ctx.strokeStyle = "#ba573e";
    ctx.lineWidth = 4;
    pathHex(ctx, scene.state.error.at, c);
    ctx.stroke();
    const p = axialToPixel(scene.state.error.at, c);
    ctx.font = `700 ${c.size}px sans-serif`;
    ctx.fillStyle = "#983f28";
    ctx.textAlign = "center";
    ctx.fillText("!", p.x, p.y);
  }
  ctx.restore();
}
export function drawMolecule(
  ctx: BoardContext,
  molecule: Molecule,
  width = 240,
  height = 150,
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f8fbfa";
  ctx.fillRect(0, 0, width, height);
  if (!molecule.atoms.length) return;
  const unit: Camera = { width, height, size: 1, x: 0, y: 0 };
  const points = molecule.atoms.map((a) => axialToPixel(a.at, unit));
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y),
    minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const size = Math.min(
    30,
    (width - 30) / (maxX - minX + 2),
    (height - 30) / (maxY - minY + 2),
  );
  const camera: Camera = {
    width,
    height,
    size,
    x: width / 2 - (size * (minX + maxX)) / 2,
    y: height / 2 - (size * (minY + maxY)) / 2,
  };
  ctx.strokeStyle = "#526f7d";
  ctx.lineWidth = 4;
  for (const b of molecule.bonds)
    segment(ctx, molecule.atoms[b.a].at, molecule.atoms[b.b].at, camera);
  for (const a of molecule.atoms) drawAtom(ctx, a.at, a.element, camera);
}
