// Top-down crack map painted on a canvas, then used as a WebGL texture on the ground plane.
// R = crack core (deep fissure), G = heat glow around fissures, B = scorch mark.
type P = { x: number; y: number };

function walk(start: P, angle: number, length: number, step: number, wobble: number) {
  const pts: P[] = [start];
  let a = angle;
  let drift = 0;
  let x = start.x;
  let y = start.y;
  for (let d = 0; d < length; d += step) {
    drift = drift * 0.7 + (Math.random() - 0.5) * wobble;
    a += drift + (Math.random() - 0.5) * 0.45;
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    pts.push({ x, y });
  }
  return pts;
}

function tapered(ctx: CanvasRenderingContext2D, pts: P[], w0: number) {
  for (let i = 1; i < pts.length; i++) {
    const k = i / pts.length;
    ctx.lineWidth = Math.max(0.8, w0 * Math.pow(1 - k, 0.8));
    ctx.beginPath();
    ctx.moveTo(pts[i - 1]!.x, pts[i - 1]!.y);
    ctx.lineTo(pts[i]!.x, pts[i]!.y);
    ctx.stroke();
  }
}

export function makeCrackCanvas(size = 1024, world = 5) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d");
  if (!ctx) return cv;
  const u = size / world;
  const c = size / 2;
  ctx.fillStyle = "rgb(0,0,0)";
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const cracks: { pts: P[]; w: number }[] = [];
  const n = 8 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const r0 = u * 0.1;
    const len = u * (0.8 + Math.random() * 1.5);
    const pts = walk({ x: c + Math.cos(ang) * r0, y: c + Math.sin(ang) * r0 }, ang, len, 5, 0.22);
    const w = 11 + Math.random() * 10;
    cracks.push({ pts, w });
    const forks = 1 + Math.floor(Math.random() * 3);
    for (let f = 0; f < forks; f++) {
      const k = Math.floor(pts.length * (0.2 + Math.random() * 0.6));
      const s = pts[k];
      if (!s) continue;
      const fa = ang + (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6);
      cracks.push({
        pts: walk(s, fa, (len - k * 5) * (0.35 + Math.random() * 0.4), 4, 0.3),
        w: w * (1 - k / pts.length) * 0.7,
      });
    }
  }
  // Shattered rings around the impact
  for (let i = 0; i < 5; i++) {
    const r = u * (0.25 + Math.random() * 0.55);
    const a0 = Math.random() * Math.PI * 2;
    const span = 0.5 + Math.random() * 1.1;
    const pts: P[] = [];
    for (let a = 0; a <= span; a += 0.05) {
      const rr = r + (Math.random() - 0.5) * u * 0.05;
      pts.push({ x: c + Math.cos(a0 + a) * rr, y: c + Math.sin(a0 + a) * rr });
    }
    cracks.push({ pts, w: 2 + Math.random() * 3 });
  }

  // B: scorch
  for (let i = 0; i < 6; i++) {
    const ox = (Math.random() - 0.5) * u * 0.4;
    const oy = (Math.random() - 0.5) * u * 0.4;
    const g = ctx.createRadialGradient(
      c + ox,
      c + oy,
      0,
      c + ox,
      c + oy,
      u * (0.8 + Math.random() * 0.8),
    );
    g.addColorStop(0, "rgba(0,0,255,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  // G: heat glow
  ctx.strokeStyle = "rgb(0,255,0)";
  ctx.shadowColor = "rgb(0,255,0)";
  ctx.shadowBlur = 26;
  ctx.globalAlpha = 0.55;
  for (const cr of cracks) tapered(ctx, cr.pts, cr.w * 2.6);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // R: fissure cores + shattered crater
  ctx.strokeStyle = "rgb(255,0,0)";
  for (const cr of cracks) tapered(ctx, cr.pts, cr.w);
  ctx.fillStyle = "rgb(255,0,0)";
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = u * (0.09 + Math.random() * 0.07);
    const x = c + Math.cos(a) * r;
    const y = c + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.fill();
  return cv;
}
