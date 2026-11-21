export type Pt = { x: number; y: number };
export type BoltBranch = { pts: Pt[]; w: number };

function segment(a: Pt, b: Pt, rough: number, depth: number): Pt[] {
  let pts: Pt[] = [a, b];
  let offset = Math.hypot(b.x - a.x, b.y - a.y) * rough;
  for (let d = 0; d < depth; d++) {
    const next: Pt[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i]!;
      const q = pts[i + 1]!;
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const disp = (Math.random() - 0.5) * offset;
      next.push(p, { x: (p.x + q.x) / 2 + (-dy / len) * disp, y: (p.y + q.y) / 2 + (dx / len) * disp });
    }
    next.push(pts[pts.length - 1]!);
    pts = next;
    offset *= 0.55;
  }
  return pts;
}

function path(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  const first = pts[0];
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
}

/* ---------- small electric arcs (blade crackle) ---------- */

export function makeBolt(a: Pt, b: Pt, rough = 0.16, forks = 4): BoltBranch[] {
  const main = segment(a, b, rough, 6);
  const out: BoltBranch[] = [{ pts: main, w: 1 }];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  for (let i = 0; i < forks; i++) {
    const s = main[Math.floor(main.length * (0.15 + Math.random() * 0.6))];
    if (!s) continue;
    const ang = Math.atan2(b.y - a.y, b.x - a.x) + (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.7);
    const l = len * (0.12 + Math.random() * 0.25);
    out.push({ pts: segment(s, { x: s.x + Math.cos(ang) * l, y: s.y + Math.sin(ang) * l }, rough * 1.4, 4), w: 0.45 });
  }
  return out;
}

export type BoltColors = { glow: string; core: string };

export function drawBolt(ctx: CanvasRenderingContext2D, branches: BoltBranch[], alpha: number, scale: number, colors: BoltColors) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const br of branches) {
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 8 * scale;
    ctx.strokeStyle = colors.glow;
    ctx.globalAlpha = Math.min(1, 0.6 * alpha);
    ctx.lineWidth = 2.4 * br.w * scale;
    path(ctx, br.pts);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = colors.core;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.lineWidth = Math.max(0.6, 1 * br.w * scale);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- realistic cloud-to-ground strike ---------- */

export type Strike = {
  tree: BoltBranch[];
  top: number;
  bottom: number;
  leaderStart: number;
  leaderEnd: number;
  strokes: readonly { t: number; i: number }[];
};

/** Main channel plus forked, sub-forked branches that hang downward like real lightning. */
export function makeStrikeTree(a: Pt, b: Pt, forks = 9): BoltBranch[] {
  const main = segment(a, b, 0.13, 8);
  const out: BoltBranch[] = [{ pts: main, w: 1 }];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const grow = (parent: Pt[], level: number, count: number, scale: number) => {
    for (let i = 0; i < count; i++) {
      const s = parent[Math.floor(parent.length * (0.04 + Math.random() * 0.76))];
      if (!s) continue;
      const side = Math.random() < 0.5 ? -1 : 1;
      const ang = Math.PI / 2 + side * (0.25 + Math.random() * 0.8);
      const l = len * scale * (0.5 + Math.random());
      const pts = segment(s, { x: s.x + Math.cos(ang) * l, y: s.y + Math.sin(ang) * l }, 0.24, level === 0 ? 6 : 4);
      out.push({ pts, w: level === 0 ? 0.5 : 0.26 });
      if (level === 0 && Math.random() < 0.75) grow(pts, 1, 1 + Math.floor(Math.random() * 2), scale * 0.45);
    }
  };
  grow(main, 0, forks, 0.2);
  return out;
}

export function strikeEnd(s: Strike) {
  return (s.strokes[s.strokes.length - 1]?.t ?? s.leaderEnd) + 1.4;
}

function strikeLevels(s: Strike, t: number) {
  const first = s.strokes[0]?.t ?? s.leaderEnd;
  let leaderY: number | null = null;
  if (t >= s.leaderStart && t < first) {
    const k = Math.min(1, (t - s.leaderStart) / Math.max(0.001, s.leaderEnd - s.leaderStart));
    // the leader advances in jerky steps
    const stepped = Math.floor(k * 14) / 14 + (k * 14 - Math.floor(k * 14)) * 0.25 / 14;
    leaderY = s.top + (s.bottom - s.top) * stepped;
  }
  let main = 0;
  for (const st of s.strokes) {
    if (t < st.t) continue;
    const d = t - st.t;
    main += st.i * (Math.exp(-d * 24) + 0.14 * Math.exp(-d * 3.2));
  }
  const d0 = t - first;
  const branch = t >= first ? (s.strokes[0]?.i ?? 1) * Math.exp(-d0 * 14) + main * 0.12 : 0;
  return { leaderY, main, branch };
}

function visible(pts: Pt[], leaderY: number | null) {
  if (leaderY === null) return pts;
  let n = 0;
  while (n < pts.length && pts[n]!.y <= leaderY) n++;
  return pts.slice(0, n);
}

export type StrikeColors = { core: string; glow: string; bloom: string };

/**
 * Draws all live strikes: a soft multi-radius bloom (rendered at low resolution and
 * upscaled), an inner glow with shadow blur, and a white-hot core.
 */
export function drawStrikes(
  ctx: CanvasRenderingContext2D,
  blooms: CanvasRenderingContext2D[],
  strikes: Strike[],
  t: number,
  dpr: number,
  colors: StrikeColors,
) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  for (const b of blooms) {
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, b.canvas.width, b.canvas.height);
    const f = b.canvas.width / W;
    b.setTransform(f, 0, 0, f, 0, 0);
    b.lineCap = "round";
    b.lineJoin = "round";
    b.globalCompositeOperation = "lighter";
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  let drew = false;

  for (const s of strikes) {
    const L = strikeLevels(s, t);
    const leading = L.leaderY !== null;
    for (const br of s.tree) {
      const isMain = br.w === 1;
      const a = leading
        ? 0.3 * (0.55 + Math.random() * 0.45) * (isMain ? 1 : 0.85)
        : (isMain ? L.main : L.branch * br.w * 1.3) * (0.82 + Math.random() * 0.18);
      if (a < 0.012) continue;
      const pts = visible(br.pts, L.leaderY);
      if (pts.length < 2) continue;
      drew = true;
      const wm = leading ? 0.45 : 1;

      blooms.forEach((b, i) => {
        b.globalAlpha = Math.min(1, a * (i === 0 ? 1 : 0.75));
        b.strokeStyle = colors.bloom;
        b.lineWidth = ((i === 0 ? 10 : 26) * br.w * wm + 3) * dpr;
        path(b, pts);
        b.stroke();
      });

      path(ctx, pts);
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 22 * dpr * Math.min(1, a + 0.25);
      ctx.strokeStyle = colors.glow;
      ctx.globalAlpha = Math.min(1, a * 0.75);
      ctx.lineWidth = (5.5 * br.w * wm + 0.8) * dpr;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = colors.core;
      ctx.globalAlpha = Math.min(1, a * 1.25);
      ctx.lineWidth = Math.max(0.8, 2.8 * br.w * wm) * dpr;
      ctx.stroke();
    }
  }

  if (drew) {
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    for (const b of blooms) ctx.drawImage(b.canvas, 0, 0, W, H);
  }
  ctx.restore();
}
