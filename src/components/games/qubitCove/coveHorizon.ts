// Painted distant coast. Coordinates stay in the sky layer, with subtle parallax.
export function drawHorizon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pan: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#76cddf");
  sky.addColorStop(0.29, "#bdeada");
  sky.addColorStop(0.47, "#e5efd0");
  sky.addColorStop(0.48, "#9bdcce");
  sky.addColorStop(0.72, "#78c9c1");
  sky.addColorStop(1, "#55b5b0");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sunX = w * 0.76 - pan * 1.2,
    sunY = h * 0.19;
  const glow = ctx.createRadialGradient(
    sunX,
    sunY,
    h * 0.035,
    sunX,
    sunY,
    h * 0.29,
  );
  glow.addColorStop(0, "#fff7cdac");
  glow.addColorStop(1, "#fff7cd00");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h * 0.5);
  ctx.fillStyle = "#fff2bd";
  ctx.beginPath();
  ctx.arc(sunX, sunY, h * 0.058, 0, Math.PI * 2);
  ctx.fill();

  const cloud = (cx: number, cy: number, size: number, alpha: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(size, size);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#f4f6de";
    ctx.beginPath();
    ctx.moveTo(-56, 5);
    ctx.bezierCurveTo(-61, -2, -53, -10, -44, -10);
    ctx.bezierCurveTo(-43, -24, -26, -28, -17, -19);
    ctx.bezierCurveTo(-9, -41, 16, -38, 21, -21);
    ctx.bezierCurveTo(34, -29, 49, -17, 48, -8);
    ctx.bezierCurveTo(66, -7, 69, 3, 55, 5);
    ctx.bezierCurveTo(14, 11, -35, 11, -56, 5);
    ctx.fill();
    ctx.restore();
  };
  cloud(w * 0.13 - pan * 2, h * 0.19, w * 0.00115, 0.9);
  cloud(w * 0.44 - pan, h * 0.14, w * 0.00065, 0.68);
  cloud(w * 0.89 - pan, h * 0.29, w * 0.00086, 0.76);
  // Layers of flat-topped headlands, each with an illuminated face.
  const ridges = (
    base: number,
    amplitude: number,
    color: string,
    shift: number,
    step: number,
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-step, h * base);
    for (let i = -2; i < Math.ceil(w / step) + 3; i++) {
      const x = i * step + shift;
      const v =
        Math.abs(Math.sin(i * 3.7 + base * 39) * Math.cos(i * 5.74)) + 0.18;
      const y = h * (base - amplitude * v);
      ctx.lineTo(x - step * 0.45, h * base - 3);
      ctx.lineTo(x - step * 0.13, y + step * 0.13);
      ctx.lineTo(x + step * 0.04, y);
      ctx.lineTo(x + step * 0.26, y + step * 0.1);
      ctx.lineTo(x + step * 0.53, h * base);
    }
    ctx.lineTo(w + step, h * base + 0.8);
    ctx.lineTo(-step, h * base + 0.8);
    ctx.fill();
  };
  ridges(0.452, 0.128, "#a8d2bc", -pan * 0.7, w * 0.093);
  ridges(0.466, 0.082, "#82bfad", -pan * 1.3 + w * 0.053, w * 0.078);
  ctx.fillStyle = "#d7e4bd";
  ctx.fillRect(0, h * 0.472, w, h * 0.004);
  const mesa = (x: number, y: number, s: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "#6ca99e";
    ctx.beginPath();
    ctx.moveTo(-31, 0);
    ctx.lineTo(-23, -6);
    ctx.lineTo(-17, -23);
    ctx.lineTo(-12, -27);
    ctx.lineTo(5, -28);
    ctx.lineTo(12, -22);
    ctx.lineTo(17, -10);
    ctx.lineTo(32, 0);
    ctx.fill();
    ctx.fillStyle = "#9dc3a3";
    ctx.beginPath();
    ctx.moveTo(-17, -23);
    ctx.lineTo(-12, -28);
    ctx.lineTo(5, -29);
    ctx.lineTo(11, -24);
    ctx.lineTo(-3, -22);
    ctx.fill();
    ctx.strokeStyle = "#d6eacb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-44, 1);
    ctx.lineTo(38, 1);
    ctx.stroke();
    ctx.restore();
  };
  mesa(w * 0.17 - pan * 1.8, h * 0.53, h * 0.005);
  mesa(w * 0.9 - pan * 1.9, h * 0.51, h * 0.0036);
  mesa(w * 0.58 - pan * 1.5, h * 0.49, h * 0.0027);
  for (let i = 0; i < 94; i++) {
    const r = ((i * 181 + 39) % 997) / 997;
    const y = h * (0.49 + r * r * 0.5);
    const x =
      ((((i * 83.71 - pan * (0.2 + r) * 2.5) % (w + 70)) + w + 70) % (w + 70)) -
      35;
    ctx.strokeStyle = i % 4 === 0 ? "#e0f2d5a8" : "#bbe5d27c";
    ctx.lineWidth = ((0.65 + r * 1.1) * h) / 500;
    const len = ((4 + ((i * 47) % 23) * (r + 0.4)) * w) / 800;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
  // A tiny survey balloon over the bay.
  const bx = w * 0.22 - pan * 2.2,
    by = h * 0.29,
    b = h * 0.042;
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(b, b);
  ctx.strokeStyle = "#887e68";
  ctx.lineWidth = 0.054;
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sign * 0.41, 0.64);
    ctx.lineTo(sign * 0.18, 1.05);
    ctx.stroke();
  }
  ctx.fillStyle = "#d88872";
  ctx.beginPath();
  ctx.ellipse(0, -0.04, 0.6, 0.73, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f1c49a";
  ctx.beginPath();
  ctx.ellipse(-0.03, -0.04, 0.25, 0.73, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#99826a";
  ctx.fillRect(-0.21, 1.03, 0.42, 0.22);
  ctx.restore();
}
