import { useEffect, useRef, type RefObject } from "react";

import { SMOG_FRAGMENT, SMOG_VERTEX } from "./smog-shader";

export type SmogParams = {
  /** 0 → 1: how far the smog has poured in from the edges. */
  fill: number;
  /** 0 → 1: how far the lightning has pushed the smog back from the centre. */
  clear: number;
  /** Radius of the cleared centre at clear = 1 (screen-height units). */
  clearMax: number;
  /** Lightning illumination 0 → 1. */
  flash: number;
  /** Flash origin, centred coords (0,0 = middle, y up, height units). */
  flashX: number;
  flashY: number;
  /** Mint glow from the katana. */
  glow: number;
  /** Overall smog opacity (eased smoothly). */
  opacity: number;
};

export const createSmogParams = (overrides: Partial<SmogParams> = {}): SmogParams => ({
  fill: 0,
  clear: 0,
  clearMax: 0.5,
  flash: 0,
  flashX: 0,
  flashY: 0,
  glow: 0,
  opacity: 1,
  ...overrides,
});

type Props = {
  params: RefObject<SmogParams>;
  seed?: number;
  /** Internal render scale; smoke is soft so it renders well at low resolution. */
  scale?: number;
  className?: string;
};

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function SmogCanvas({ params, seed = 0, scale = 0.5, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: true,
      antialias: false,
      alpha: true,
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, SMOG_VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, SMOG_FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u("uRes");
    const uTime = u("uTime");
    const uFill = u("uFill");
    const uClear = u("uClear");
    const uClearMax = u("uClearMax");
    const uFlash = u("uFlash");
    const uFlashPos = u("uFlashPos");
    const uGlow = u("uGlow");
    const uOpacity = u("uOpacity");
    const uSeed = u("uSeed");

    const resize = () => {
      const w = Math.max(1, Math.round(Math.min(canvas.clientWidth * scale, 1100)));
      const h = Math.max(
        1,
        Math.round(w * (canvas.clientHeight / Math.max(1, canvas.clientWidth))),
      );
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // Smoothed values so post-intro changes glide instead of snapping.
    let opacity = params.current.opacity;
    let clearMax = params.current.clearMax;
    let glow = params.current.glow;
    const start = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const p = params.current;
      opacity += (p.opacity - opacity) * 0.04;
      clearMax += (p.clearMax - clearMax) * 0.04;
      glow += (p.glow - glow) * 0.08;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform1f(uFill, p.fill);
      gl.uniform1f(uClear, p.clear);
      gl.uniform1f(uClearMax, clearMax);
      gl.uniform1f(uFlash, p.flash);
      gl.uniform2f(uFlashPos, p.flashX, p.flashY);
      gl.uniform1f(uGlow, glow);
      gl.uniform1f(uOpacity, opacity);
      gl.uniform1f(uSeed, seed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      // Free the GPU objects but keep the context alive: React dev mode re-runs this effect on the same canvas.
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, [params, seed, scale]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
