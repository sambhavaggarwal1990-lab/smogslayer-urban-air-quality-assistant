// Impact particles: sparks, flying rock debris that lands as rubble, ground dust and rising embers.
type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number };
type Rock = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  shape: number[];
  landY: number;
  landed: boolean;
};
type Ember = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  wob: number;
};
type Puff = { x: number; y: number; vx: number; vy: number; r: number; age: number; life: number };
type Ring = { age: number; life: number; power: number };

export type FxColors = { hot: string; ember: string; rock: string; dust: string };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class ImpactFX {
  sparks: Spark[] = [];
  rocks: Rock[] = [];
  embers: Ember[] = [];
  puffs: Puff[] = [];
  rings: Ring[] = [];
  emberAcc = 0;

  constructor(
    public ix: number,
    public iy: number,
    public s: number,
  ) {}

  setOrigin(ix: number, iy: number, s: number) {
    const dx = ix - this.ix;
    const dy = iy - this.iy;
    for (const r of this.rocks) {
      r.x += dx;
      r.y += dy;
      r.landY += dy;
    }
    this.ix = ix;
    this.iy = iy;
    this.s = s;
  }

  private rock(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    landY: number,
    landed: boolean,
  ) {
    const shape = Array.from({ length: 5 + Math.floor(Math.random() * 3) }, () => rand(0.6, 1));
    this.rocks.push({
      x,
      y,
      vx,
      vy,
      rot: rand(0, 6.28),
      vr: rand(-12, 12),
      size,
      shape,
      landY,
      landed,
    });
  }

  /** Static rubble heaped around the buried blade. */
  rubble() {
    const s = this.s;
    for (let i = 0; i < 22; i++) {
      const a = rand(0, Math.PI * 2);
      const r = Math.pow(Math.random(), 0.7) * 70 * s + 8 * s;
      const y = this.iy + Math.sin(a) * r * 0.26;
      this.rock(this.ix + Math.cos(a) * r, y, 0, 0, rand(2, 7) * s, y, true);
    }
  }

  burst(power: number) {
    const { ix, iy, s } = this;
    for (let i = 0; i < 160 * power; i++) {
      const a = -Math.PI / 2 + rand(-1.45, 1.45);
      const sp = rand(250, 1100) * s * (0.6 + power * 0.4);
      this.sparks.push({
        x: ix,
        y: iy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        age: 0,
        life: rand(0.35, 1.1),
      });
    }
    for (let i = 0; i < 28 * power; i++) {
      const a = -Math.PI / 2 + rand(-1.1, 1.1);
      const sp = rand(200, 720) * s;
      this.rock(
        ix,
        iy,
        Math.cos(a) * sp,
        Math.sin(a) * sp,
        rand(2.5, 10) * s,
        iy + rand(-30, 60) * s,
        false,
      );
    }
    for (let i = 0; i < 30 * power; i++) {
      const left = Math.random() < 0.5;
      const a = (left ? Math.PI : 0) + rand(-0.5, 0.5);
      const sp = rand(260, 820) * s;
      this.puffs.push({
        x: ix + rand(-20, 20) * s,
        y: iy + rand(-10, 6) * s,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.22 - rand(20, 120) * s,
        r: rand(26, 70) * s,
        age: 0,
        life: rand(1.4, 2.8),
      });
    }
    this.rings.push({ age: 0, life: 1.3, power });
  }

  update(dt: number, heat: number) {
    const s = this.s;
    const g = 1700 * s;
    for (const p of this.sparks) {
      p.vy += g * dt;
      p.vx *= 1 - 0.6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vy > 0 && p.y > this.iy + 30 * s) {
        p.vy *= -0.28;
        p.vx *= 0.6;
      }
      p.age += dt;
    }
    for (const r of this.rocks) {
      if (r.landed) continue;
      r.vy += g * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.rot += r.vr * dt;
      if (r.vy > 0 && r.y >= r.landY) {
        r.y = r.landY;
        if (Math.abs(r.vy) > 260 * s) {
          r.vy *= -0.25;
          r.vx *= 0.5;
        } else r.landed = true;
      }
    }
    this.emberAcc += dt * 34 * heat;
    while (this.emberAcc > 1) {
      this.emberAcc -= 1;
      const a = rand(0, Math.PI * 2);
      const rr = Math.sqrt(Math.random()) * 190 * s;
      this.embers.push({
        x: this.ix + Math.cos(a) * rr,
        y: this.iy + Math.sin(a) * rr * 0.26,
        vx: rand(-10, 10) * s,
        vy: -rand(25, 90) * s,
        age: 0,
        life: rand(1.6, 3.6),
        size: rand(0.8, 2.2) * s,
        wob: rand(0, 6.28),
      });
    }
    for (const e of this.embers) {
      e.age += dt;
      e.x += (e.vx + Math.sin(e.age * 2.6 + e.wob) * 22 * s) * dt;
      e.y += e.vy * dt;
      e.vy *= 1 - 0.15 * dt;
    }
    for (const p of this.puffs) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 1.8 * dt;
      p.vy *= 1 - 1.8 * dt;
      p.r += 46 * s * dt;
    }
    for (const r of this.rings) r.age += dt;
    this.sparks = this.sparks.filter((p) => p.age < p.life);
    this.embers = this.embers.filter((e) => e.age < e.life);
    this.puffs = this.puffs.filter((p) => p.age < p.life);
    this.rings = this.rings.filter((r) => r.age < r.life);
    this.rocks = this.rocks.filter((r) => r.y < this.iy + 400 * s);
  }

  /** Ground-contact glow, dust and rubble (drawn over the katana base). */
  drawGround(ctx: CanvasRenderingContext2D, heat: number, c: FxColors) {
    const { ix, iy, s } = this;
    ctx.save();
    // warm contact glow around the blade
    if (heat > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.save();
      ctx.translate(ix, iy);
      ctx.scale(1, 0.3);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 150 * s);
      g.addColorStop(0, c.hot);
      g.addColorStop(0.25, c.ember);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.35 * heat;
      ctx.fillStyle = g;
      ctx.fillRect(-150 * s, -150 * s, 300 * s, 300 * s);
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";
    for (const r of this.rings) {
      const k = r.age / r.life;
      const R = Math.pow(k, 0.55) * 560 * s * (0.6 + r.power * 0.4);
      ctx.save();
      ctx.translate(ix, iy);
      ctx.scale(1, 0.24);
      const g = ctx.createRadialGradient(0, 0, R * 0.55, 0, 0, R);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.75, c.dust);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.4 * (1 - k);
      ctx.fillStyle = g;
      ctx.fillRect(-R, -R, R * 2, R * 2);
      ctx.restore();
    }
    for (const p of this.puffs) {
      const k = p.age / p.life;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, c.dust);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.32 * Math.pow(1 - k, 1.4) * Math.min(1, p.age * 8);
      ctx.fillStyle = g;
      ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    // rocks: dark chunks rim-lit by the crack
    for (const r of this.rocks) {
      const prox = 1 / (1 + Math.hypot(r.x - ix, (r.y - iy) * 3) / (90 * s));
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      ctx.beginPath();
      r.shape.forEach((k, i) => {
        const a = (i / r.shape.length) * Math.PI * 2;
        const x = Math.cos(a) * r.size * k;
        const y = Math.sin(a) * r.size * k * 0.75;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.rock;
      ctx.fill();
      ctx.globalAlpha = Math.min(1, heat * prox * 1.4);
      ctx.strokeStyle = c.ember;
      ctx.lineWidth = Math.max(0.6, 1.1 * s);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  /** Sparks and embers (additive). */
  drawAir(ctx: CanvasRenderingContext2D, c: FxColors) {
    const s = this.s;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const p of this.sparks) {
      const k = p.age / p.life;
      ctx.strokeStyle = k < 0.35 ? c.hot : c.ember;
      ctx.globalAlpha = Math.pow(1 - k, 1.2);
      ctx.lineWidth = Math.max(0.7, 1.6 * s * (1 - k * 0.6));
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 0.018, p.y - p.vy * 0.018);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    for (const e of this.embers) {
      const k = e.age / e.life;
      const a = Math.sin(Math.PI * k) * (0.7 + 0.3 * Math.sin(e.age * 17 + e.wob));
      ctx.fillStyle = c.ember;
      ctx.globalAlpha = a * 0.25;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.hot;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
