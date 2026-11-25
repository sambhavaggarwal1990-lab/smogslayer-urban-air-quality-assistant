import { useEffect, useRef, useState, type RefObject } from "react";

import {
  GroundCanvas,
  createGroundParams,
  type GroundParams,
} from "@/components/ground/GroundCanvas";
import { SmogCanvas, createSmogParams, type SmogParams } from "@/components/smog/SmogCanvas";
import { ImpactFX, type FxColors } from "./impact-fx";
import { Katana } from "./Katana";
import {
  drawBolt,
  drawStrikes,
  makeBolt,
  makeStrikeTree,
  strikeEnd,
  type BoltBranch,
  type BoltColors,
  type Strike,
  type StrikeColors,
} from "./lightning";
import {
  FLASHES,
  LEADER,
  RETURN_STROKES,
  TIMELINE,
  crackAt,
  heatAt,
  loadProgressAt,
  smogAt,
  stageAt,
  type Stage,
} from "./intro-timeline";
import { KATANA_VISIBLE_VH, SCENE } from "./scene";

type Props = {
  /** Background smog layer shared with the rest of the app (keeps running after the intro). */
  smog: RefObject<SmogParams>;
  onReveal: () => void;
  onComplete: () => void;
};

type Arc = { branches: BoltBranch[]; born: number; life: number };
type Flash = { t: number; flash: number; x: number; y: number };

const STATUS = [
  "Gathering the mist…",
  "Reading the sky over your city…",
  "Sharpening the blade…",
  "Clearing the air…",
];

const STAGE_ORDER: Stage[] = [
  "dark",
  "smog",
  "strike",
  "katana",
  "title",
  "loading",
  "exit",
  "done",
];
const reached = (stage: Stage, target: Stage) =>
  STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(target);

const K = SCENE.katana;
const KATANA_TOP_VH = SCENE.impactY * 100 - KATANA_VISIBLE_VH;

export function MistIntro({ smog, onReveal, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("dark");
  const [status, setStatus] = useState(0);
  const front = useRef<SmogParams>(createSmogParams({ opacity: 0.55, clearMax: 0.6 }));
  const ground = useRef<GroundParams>(createGroundParams());
  const fxRef = useRef<HTMLCanvasElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const skipOffset = useRef(0);
  const nowT = useRef(0);
  const cbs = useRef({ onReveal, onComplete });
  cbs.current = { onReveal, onComplete };

  useEffect(() => {
    const canvas = fxRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const bloomA = document.createElement("canvas").getContext("2d");
    const bloomB = document.createElement("canvas").getContext("2d");
    const blooms = [bloomA, bloomB].filter((b): b is CanvasRenderingContext2D => !!b);

    let dpr = 1;
    let W = 0;
    let H = 0;
    const fx = new ImpactFX(0, 0, 1);
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.width = Math.round(window.innerWidth * dpr);
      H = canvas.height = Math.round(window.innerHeight * dpr);
      if (bloomA) {
        bloomA.canvas.width = Math.max(1, Math.round(W / 4));
        bloomA.canvas.height = Math.max(1, Math.round(H / 4));
      }
      if (bloomB) {
        bloomB.canvas.width = Math.max(1, Math.round(W / 12));
        bloomB.canvas.height = Math.max(1, Math.round(H / 12));
      }
      fx.setOrigin(W / 2, H * SCENE.impactY, H / 900);
    };
    resize();
    window.addEventListener("resize", resize);

    const css = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const strikeColors: StrikeColors = {
      core: v("--bolt-core", "#fbfcff"),
      glow: v("--bolt-glow", "#b9c3ff"),
      bloom: v("--bolt-bloom", "#6f6fe0"),
    };
    const arcColors: BoltColors = {
      glow: v("--bolt-glow", "#b9c3ff"),
      core: v("--bolt-core", "#fbfcff"),
    };
    const fxColors: FxColors = {
      hot: v("--ember-hot", "#ffe1a0"),
      ember: v("--ember", "#ff6a1a"),
      rock: v("--rock", "#17130f"),
      dust: v("--dust", "#5a544c"),
    };

    let strikes: Strike[] = [];
    let arcs: Arc[] = [];
    let flashes: Flash[] = [];
    const firedFlash = new Set<number>();
    const firedStroke = new Set<number>();
    let mainSpawned = false;
    let nextAmbient = 6.2;
    let current: Stage = "dark";
    let lastStatus = 0;
    let spark = 0;
    // Dev-only: ?introAt=4&introSpeed=0.2 to inspect the choreography frame by frame.
    const dev = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
    const speed = Number(dev?.get("introSpeed")) || 1;
    const startAt = Number(dev?.get("introAt")) || 0;
    const start = performance.now();
    let last = start;
    let raf = 0;
    const impactFlashY = 0.5 - SCENE.impactY;

    const spawnMain = () => {
      strikes.push({
        tree: makeStrikeTree(
          { x: W / 2 + (Math.random() - 0.5) * W * 0.14, y: -H * 0.05 },
          { x: W / 2, y: H * SCENE.impactY },
          10,
        ),
        top: -H * 0.05,
        bottom: H * SCENE.impactY,
        leaderStart: LEADER.start,
        leaderEnd: LEADER.end,
        strokes: RETURN_STROKES,
      });
    };
    const spawnAmbient = (t: number) => {
      const left = Math.random() < 0.5;
      const x = W * (left ? 0.05 + Math.random() * 0.25 : 0.7 + Math.random() * 0.25);
      const endY = H * (0.3 + Math.random() * 0.25);
      strikes.push({
        tree: makeStrikeTree(
          { x: x + (Math.random() - 0.5) * W * 0.12, y: -10 },
          { x, y: endY },
          5,
        ),
        top: -10,
        bottom: endY,
        leaderStart: t,
        leaderEnd: t + 0.07,
        strokes: [
          { t: t + 0.07, i: 0.5 },
          { t: t + 0.17, i: 0.32 },
        ],
      });
      flashes.push({ t: t + 0.07, flash: 0.3, x: (x / W - 0.5) * (W / H), y: 0.5 - endY / H });
    };
    // Electric arcs crawling up the stuck blade
    const bladeArc = (t: number) => {
      const vh = H / 100;
      const bottom = H * SCENE.impactY;
      const len = KATANA_VISIBLE_VH * (1 - K.habakiFrac) * vh;
      const tilt = (K.tiltDeg * Math.PI) / 180;
      const d = Math.random() * len;
      const x = W / 2 + Math.sin(tilt) * d;
      const y = bottom - Math.cos(tilt) * d;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const l = (14 + Math.random() * 40) * dpr;
      arcs.push({
        branches: makeBolt({ x, y }, { x: x + dir * l, y: y + (Math.random() - 0.5) * l }, 0.35, 1),
        born: t,
        life: 0.08,
      });
      spark = 0.6;
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000) * speed;
      last = now;
      const t = ((now - start) / 1000) * speed + startAt + skipOffset.current;
      nowT.current = t;
      if (dev) (window as unknown as { __introT?: number }).__introT = t;

      const s = stageAt(t);
      if (s !== current) {
        current = s;
        setStage(s);
        if (s === "exit") cbs.current.onReveal();
        if (s === "done") {
          cbs.current.onComplete();
          return;
        }
      }

      // Main strike: leader → return strokes (skipped if we jumped past it)
      if (!mainSpawned && t >= LEADER.start) {
        mainSpawned = true;
        if (t < TIMELINE.strike + 0.4) spawnMain();
      }
      FLASHES.forEach((f, i) => {
        if (!firedFlash.has(i) && t >= f.t) {
          firedFlash.add(i);
          if (t - f.t < 0.3)
            flashes.push({
              t: f.t,
              flash: f.flash,
              x: 0,
              y: f.t >= TIMELINE.strike ? impactFlashY : 0.25,
            });
        }
      });
      RETURN_STROKES.forEach((st, i) => {
        if (!firedStroke.has(i) && t >= st.t) {
          firedStroke.add(i);
          if (t - st.t > 0.4) {
            if (i === 0) fx.rubble();
            return;
          }
          if (i === 0) {
            fx.burst(1);
            fx.rubble();
          } else if (st.i > 0.7) fx.burst(0.45);
        }
      });
      if (t > nextAmbient && t < TIMELINE.exit) {
        spawnAmbient(t);
        nextAmbient = t + 1.8 + Math.random() * 2;
      }
      if (t > TIMELINE.katana + 0.6 && t < TIMELINE.exit && Math.random() < 0.07) bladeArc(t);
      spark *= Math.exp(-dt * 25);

      // Flash level
      flashes = flashes.filter((f) => t - f.t < 1.2);
      let flash = 0;
      let fx0 = 0;
      let fy0 = 0;
      for (const f of flashes) {
        if (t < f.t) continue;
        const val = f.flash * Math.exp(-(t - f.t) * 9) * (0.75 + Math.random() * 0.25);
        if (val > flash) {
          flash = val;
          fx0 = f.x;
          fy0 = f.y;
        }
      }

      // Smog + ground
      const { fill, clear } = smogAt(t);
      const heat = heatAt(t) * (0.93 + 0.07 * Math.sin(t * 6.3) * Math.sin(t * 2.1));
      const exiting = t >= TIMELINE.exit;
      Object.assign(smog.current, {
        fill,
        clear,
        flash,
        flashX: fx0,
        flashY: fy0,
        glow: exiting ? 0 : heat,
        clearMax: exiting ? 0.72 : 0.5,
        opacity: exiting ? 0.6 : 1,
      });
      Object.assign(front.current, {
        fill,
        clear,
        flash: flash * 0.8,
        flashX: fx0,
        flashY: fy0,
        glow: heat * 0.6,
      });
      Object.assign(ground.current, {
        crack: crackAt(t),
        heat,
        flash,
        reveal: t >= TIMELINE.strike ? 1 : 0,
        spark,
      });

      // Shake + flash overlay
      const since = t - TIMELINE.strike;
      const amp = since > 0 && since < 0.9 ? 18 * Math.exp(-since * 5.5) : 0;
      if (shakeRef.current) {
        shakeRef.current.style.transform = amp
          ? `translate3d(${(Math.random() - 0.5) * amp}px, ${(Math.random() - 0.5) * amp}px, 0)`
          : "";
      }
      if (flashRef.current) flashRef.current.style.opacity = String(Math.min(1, flash * 0.95));

      // Loading
      const prog = loadProgressAt(t);
      if (barRef.current) barRef.current.style.width = `${(prog * 100).toFixed(1)}%`;
      if (pctRef.current) pctRef.current.textContent = `${Math.round(prog * 100)}%`;
      const st = Math.min(STATUS.length - 1, Math.floor(prog * STATUS.length));
      if (st !== lastStatus) {
        lastStatus = st;
        setStatus(st);
      }

      // Draw: ground dust/rubble → sparks/embers → lightning
      fx.update(dt, heat);
      ctx.clearRect(0, 0, W, H);
      fx.drawGround(ctx, heat, fxColors);
      fx.drawAir(ctx, fxColors);
      strikes = strikes.filter((k) => t < strikeEnd(k));
      if (strikes.length) drawStrikes(ctx, blooms, strikes, t, dpr, strikeColors);
      arcs = arcs.filter((a) => t - a.born < a.life);
      for (const a of arcs)
        drawBolt(
          ctx,
          a.branches,
          (1 - (t - a.born) / a.life) * (0.6 + Math.random() * 0.4),
          dpr,
          arcColors,
        );

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [smog]);

  const skip = () => {
    if (nowT.current < TIMELINE.exit) skipOffset.current += TIMELINE.exit - nowT.current;
  };

  return (
    <div className={`intro-root ${reached(stage, "exit") ? "intro-exit" : ""}`} role="presentation">
      <div ref={shakeRef} className="absolute inset-0">
        {/* Cracked ground, revealed by the strike */}
        <GroundCanvas
          params={ground}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Katana stuck in the crack where the lightning hit */}
        {reached(stage, "katana") && (
          <div
            className="katana-stuck absolute"
            style={{
              left: "50%",
              top: `${KATANA_TOP_VH}dvh`,
              width: `${K.widthVh}dvh`,
              height: `${KATANA_VISIBLE_VH}dvh`,
              marginLeft: `${-K.widthVh / 2}dvh`,
            }}
          >
            <Katana className="katana h-full w-full" />
          </div>
        )}

        {/* Dust, rubble, sparks, embers and lightning */}
        <canvas
          ref={fxRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Foreground smog for depth */}
        <SmogCanvas
          params={front}
          seed={1.7}
          scale={0.35}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        <div ref={flashRef} className="intro-flash" />

        {reached(stage, "title") && (
          <div className="absolute inset-x-0 top-[50%] flex -translate-y-1/2 flex-col items-center px-4">
            <div className="relative flex flex-col items-center gap-2 sm:flex-row sm:gap-[12vh]">
              <span className="title-smog font-brush text-mist-gradient text-[clamp(3.2rem,10vw,9rem)] leading-none">
                SMOG
              </span>
              <span className="title-slayer font-blade font-black text-thunder-gradient text-[clamp(3rem,9.5vw,8.6rem)] leading-none">
                SLAYER
              </span>
              <span className="title-slash pointer-events-none absolute left-[-6%] top-1/2 h-[3px] w-[112%]" />
            </div>
          </div>
        )}

        {reached(stage, "loading") && (
          <div className="loader absolute inset-x-0 bottom-[4vh] flex flex-col items-center gap-3 px-6">
            <div className="flex w-[min(440px,80vw)] items-baseline justify-between font-blade text-[11px] font-bold uppercase tracking-[0.3em] text-mist">
              <span aria-live="polite">{STATUS[status]}</span>
              <span ref={pctRef} className="text-thunder">
                0%
              </span>
            </div>
            <div className="loader-track relative h-[3px] w-[min(440px,80vw)] overflow-hidden rounded-full">
              <div ref={barRef} className="loader-fill relative h-full w-0 rounded-full">
                <span className="loader-spark absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      {!reached(stage, "exit") && (
        <button
          type="button"
          onClick={skip}
          className="intro-skip absolute right-5 top-5 rounded-full border border-border px-4 py-1.5 font-blade text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground transition hover:border-mist hover:text-mist"
        >
          Skip
        </button>
      )}
    </div>
  );
}
