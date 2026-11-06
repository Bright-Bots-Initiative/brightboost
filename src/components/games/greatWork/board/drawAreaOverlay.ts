import type { CellKey } from "@shared/greatwork-engine";
import type { Camera } from "../greatWorkView";
import { hexVertices } from "../greatWorkView";
export type PaintContext = Pick<
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
>;
/** Paint the supplied engine set verbatim. No spatial recomputation or deduplication. */
export function drawAreaOverlay(
  ctx: PaintContext,
  claimed: ReadonlySet<CellKey>,
  camera: Camera,
): void {
  ctx.save();
  ctx.fillStyle = "#d7eee6";
  ctx.strokeStyle = "#669987";
  ctx.lineWidth = 1;
  for (const cell of claimed) {
    const [q, r] = cell.split(",").map(Number);
    const poly = hexVertices({ q, r }, camera, 0.92);
    ctx.beginPath();
    poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
