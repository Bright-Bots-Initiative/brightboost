import type { Level, Player, Tool } from "./model";
/** Original canvas scenery. No third-party sprites or external image requests. */
export function drawField(
  ctx: CanvasRenderingContext2D,
  level: Level,
  player: Player,
  tool: Tool,
  reduced: boolean,
) {
  const w = 800,
    h = 400;
  const camera = Math.max(0, Math.min(level.width - w, player.x - 230));
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = level.sky;
  ctx.fillRect(0, 0, w, h);
  // Distant landscape remains static when reduced effects are selected.
  const drift = reduced ? 0 : camera * 0.18;
  drawScenery(ctx, level, drift);
  ctx.save();
  ctx.translate(-camera, 0);
  for (const p of level.platforms) {
    ctx.fillStyle =
      level.id === "lab"
        ? "#cad0e3"
        : level.id === "marsh"
          ? "#9bafa8"
          : p.y < 300
            ? "#bd966b"
            : "#bfab80";
    ctx.beginPath();
    const depth = level.id === "marsh" ? 400 - p.y : p.y < 300 ? 22 : 95;
    ctx.roundRect(p.x, p.y, p.w, depth, 8);
    ctx.fill();
    ctx.fillStyle = level.ground;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, 13, 6);
    ctx.fill();
    ctx.fillStyle = "#ffffff38";
    for (let x = p.x + 15; x < p.x + p.w - 12; x += 29) {
      ctx.fillRect(x, p.y + 29, 8, 4);
    }
    if (level.id === "canopy") {
      ctx.strokeStyle = "#658b4f";
      ctx.lineWidth = 4;
      for (let x = p.x + 25; x < p.x + p.w - 15; x += 75) {
        ctx.beginPath();
        ctx.moveTo(x, p.y + 20);
        ctx.quadraticCurveTo(x - 14, p.y + 60, x + 6, p.y + 95);
        ctx.stroke();
      }
    }
    if (level.id === "lab") {
      ctx.strokeStyle = "#b0b8cf";
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x + 12, p.y + 22, p.w - 24, Math.max(16, 370 - p.y));
      ctx.fillStyle = "#9ddebb";
      for (let x = p.x + 20; x < p.x + p.w - 15; x += 55)
        ctx.fillRect(x, p.y + 4, 14, 5);
    }
    if (level.id === "meadow" || level.id === "marsh") {
      for (let x = p.x + 25; x < p.x + p.w - 15; x += 110) {
        ctx.strokeStyle = level.ground;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, p.y);
        ctx.lineTo(x, p.y - 17);
        ctx.stroke();
        ctx.fillStyle = level.id === "marsh" ? "#dfac72" : "#f8cf64";
        ctx.beginPath();
        ctx.arc(x, p.y - 20, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Field checkpoint and goal are always visible landmarks, never hidden exits.
  for (const [anchor, goal] of [
    [level.checkpoint, false],
    [level.goal, true],
  ] as const) {
    const { x, y } = anchor;
    ctx.fillStyle = goal ? "#f1bc4f" : "#486b66";
    ctx.fillRect(x, y - 95, 5, 95);
    ctx.beginPath();
    ctx.moveTo(x + 5, y - 93);
    ctx.lineTo(x + 48, y - 83);
    ctx.lineTo(x + 5, y - 64);
    ctx.fill();
    if (goal) {
      ctx.fillStyle = "#fff7d4";
      ctx.beginPath();
      ctx.arc(x + 65, y - 50, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ca9832";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x + 65, y - 50, 27, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const x = player.x,
    y = player.y;
  if (tool === "glide") {
    ctx.fillStyle = "#f1c260";
    ctx.beginPath();
    ctx.moveTo(x + 13, y + 15);
    ctx.quadraticCurveTo(x - 37, y - 14, x - 21, y + 27);
    ctx.lineTo(x + 13, y + 20);
    ctx.quadraticCurveTo(x + 65, y - 14, x + 46, y + 27);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#194c43";
  ctx.fillRect(x + 2, y + 31, 8, 9);
  ctx.fillRect(x + 18, y + 31, 8, 9);
  if (tool === "spring") {
    ctx.strokeStyle = "#edac36";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 30);
    ctx.lineTo(x + 12, y + 34);
    ctx.lineTo(x + 1, y + 38);
    ctx.moveTo(x + 18, y + 30);
    ctx.lineTo(x + 28, y + 34);
    ctx.lineTo(x + 17, y + 38);
    ctx.stroke();
  }
  ctx.fillStyle = "#3da88c";
  ctx.beginPath();
  ctx.roundRect(x, y + 13, 29, 21, 8);
  ctx.fill();
  ctx.fillStyle = "#fff3d6";
  ctx.beginPath();
  ctx.roundRect(x - 2, y - 3, 33, 24, 9);
  ctx.fill();
  ctx.fillStyle = "#173d39";
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 2, 23, 13, 6);
  ctx.fill();
  ctx.fillStyle = "#b2eed4";
  ctx.fillRect(x + 8, y + 6, 4, 4);
  ctx.fillRect(x + 19, y + 6, 4, 4);
  ctx.strokeStyle = "#247b58";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 14, y - 3);
  ctx.lineTo(x + 14, y - 10);
  ctx.stroke();
  ctx.fillStyle = "#65b266";
  ctx.beginPath();
  ctx.ellipse(x + 19, y - 12, 7, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Four habitat silhouettes keep the fields recognizable without text or animation. */
function drawScenery(
  ctx: CanvasRenderingContext2D,
  level: Level,
  drift: number,
) {
  if (level.id === "lab") {
    // A glass greenhouse and specimen benches, with no moving distractions.
    ctx.fillStyle = "#f9fbff";
    ctx.fillRect(0, 85, 800, 315);
    ctx.strokeStyle = "#d1d6e9";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 85);
    ctx.lineTo(200, 20);
    ctx.lineTo(600, 20);
    ctx.lineTo(800, 85);
    ctx.stroke();
    for (let x = 0; x <= 800; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 85);
      ctx.lineTo(x, 370);
      ctx.stroke();
    }
    for (const y of [85, 160, 235, 370]) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(800, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#b6c1da";
    ctx.fillRect(0, 375, 800, 25);
    for (let i = 0; i < 6; i++) {
      const x = i * 155 - (drift % 155);
      ctx.fillStyle = "#c6e7d4";
      ctx.fillRect(x + 20, 278, 43, 69);
      ctx.fillStyle = "#8ac5a1";
      ctx.beginPath();
      ctx.ellipse(x + 41, 293, 12, 25, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b9bed5";
      ctx.fillRect(x, 347, 85, 8);
    }
    return;
  }
  if (level.id === "canopy") {
    // Layered treetops replace the river floor; pale streaks suggest a glide.
    for (let i = 0; i < 7; i++) {
      const x = i * 160 - (drift % 160);
      ctx.fillStyle = "#c5d5a9";
      ctx.fillRect(x + 25, 110, 30, 290);
      ctx.fillStyle = i % 2 ? "#bbd895" : "#cee3a7";
      ctx.beginPath();
      ctx.ellipse(x + 40, 85 + (i % 2) * 70, 100, 70, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#97b879";
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 150, 425, 130, 85, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#ffffffb3";
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const x = i * 190 - (drift % 190);
      ctx.beginPath();
      ctx.moveTo(x, 160);
      ctx.quadraticCurveTo(x + 35, 150, x + 80, 160);
      ctx.stroke();
    }
    return;
  }
  if (level.id === "marsh") {
    ctx.fillStyle = "#b6d2cb";
    for (let i = 0; i < 6; i++) {
      const x = i * 180 - (drift % 180);
      ctx.beginPath();
      ctx.moveTo(x - 80, 325);
      ctx.lineTo(x, 135 + (i % 2) * 40);
      ctx.lineTo(x + 95, 325);
      ctx.fill();
    }
    ctx.fillStyle = "#94c8c7";
    ctx.fillRect(0, 340, 800, 60);
    ctx.strokeStyle = "#78aaa0";
    ctx.lineWidth = 4;
    for (let i = 0; i < 17; i++) {
      const x = i * 55 - (drift % 55);
      ctx.beginPath();
      ctx.moveTo(x, 390);
      ctx.quadraticCurveTo(x - 15, 290, x + 6, 260 + (i % 3) * 25);
      ctx.stroke();
    }
    return;
  }
  ctx.fillStyle = "#ffffff90";
  for (let i = 0; i < 6; i++) {
    const x = i * 180 - (drift % 180);
    ctx.beginPath();
    ctx.ellipse(x, 70 + (i % 2) * 25, 58, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#bfdac0";
  for (let i = 0; i < 6; i++) {
    const x = i * 205 - (drift % 205);
    ctx.beginPath();
    ctx.moveTo(x - 160, 330);
    ctx.quadraticCurveTo(x, 150 + (i % 2) * 45, x + 160, 330);
    ctx.fill();
  }
  ctx.fillStyle = "#addacf";
  ctx.fillRect(0, 357, 800, 43);
  ctx.strokeStyle = "#ffffff80";
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 80, 375);
    ctx.lineTo(i * 80 + 36, 375);
    ctx.stroke();
  }
}
