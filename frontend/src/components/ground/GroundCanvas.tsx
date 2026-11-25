import { useEffect, useRef, type RefObject } from "react";

import { SMOG_VERTEX } from "@/components/smog/smog-shader";
import { SCENE } from "@/components/intro/scene";
import { makeCrackCanvas } from "./crack-texture";
import { GROUND_FRAGMENT } from "./ground-shader";

export type GroundParams = {
  crack: number;
  heat: number;
  flash: number;
  reveal: number;
  spark: number;
};

export const createGroundParams = (): GroundParams => ({
  crack: 0,
  heat: 0,
  flash: 0,
  reveal: 0,
  spark: 0,
});

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export function GroundCanvas({
  params,
  className,
}: {
  params: RefObject<GroundParams>;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl", {
      premultipliedAlpha: true,
      antialias: false,
      alpha: true,
    });
    if (!canvas || !gl) return;
    const vs = compile(gl, gl.VERTEX_SHADER, SMOG_VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, GROUND_FRAGMENT);
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

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      makeCrackCanvas(1024, SCENE.crackWorld),
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const u = (n: string) => gl.getUniformLocation(program, n);
    const U = {
      res: u("uRes"),
      time: u("uTime"),
      horizon: u("uHorizon"),
      impact: u("uImpact"),
      size: u("uCrackSize"),
      crack: u("uCrack"),
      heat: u("uHeat"),
      flash: u("uFlash"),
      reveal: u("uReveal"),
      spark: u("uSpark"),
      tex: u("uCrackTex"),
    };
    gl.uniform1i(U.tex, 0);

    const resize = () => {
      const w = Math.max(1, Math.round(Math.min(canvas.clientWidth * 0.6, 1400)));
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

    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const p = params.current;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.time, (now - start) / 1000);
      gl.uniform1f(U.horizon, 0.5 - SCENE.horizonY);
      gl.uniform1f(U.impact, 0.5 - SCENE.impactY);
      gl.uniform1f(U.size, SCENE.crackWorld);
      gl.uniform1f(U.crack, p.crack);
      gl.uniform1f(U.heat, p.heat);
      gl.uniform1f(U.flash, p.flash);
      gl.uniform1f(U.reveal, p.reveal);
      gl.uniform1f(U.spark, p.spark);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      // Free the GPU objects but keep the context alive: React dev mode re-runs this effect on the same canvas.
      gl.deleteProgram(program);
      gl.deleteBuffer(buf);
      gl.deleteTexture(tex);
    };
  }, [params]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
