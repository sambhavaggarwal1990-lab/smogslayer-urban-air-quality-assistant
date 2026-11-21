// Full-screen volumetric smog: domain-warped fbm that billows in from every
// edge, lights up on lightning flashes and clears radially from the strike.
export const SMOG_VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const SMOG_FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uFill;
uniform float uClear;
uniform float uClearMax;
uniform float uFlash;
uniform vec2 uFlashPos;
uniform float uGlow;
uniform float uOpacity;
uniform float uSeed;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
const mat2 M = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = M * p + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}
float ease(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }
float front(float fill, float delay, float reach) {
  return ease((fill - delay) / (1.0 - delay)) * reach;
}
float wall(float d, float f, float billow) {
  return smoothstep(0.16, -0.16, d + billow - f);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = uTime + uSeed * 37.0;
  float r = length(p);

  vec2 q = p * 1.7 + vec2(uSeed * 11.0, uSeed * 5.0);
  vec2 w1 = vec2(fbm(q + vec2(0.0, t * 0.045)), fbm(q + vec2(5.2, 1.3) - vec2(t * 0.04, 0.0)));
  vec2 w2 = vec2(
    fbm(q + 3.4 * w1 + vec2(1.7, 9.2) + t * 0.055),
    fbm(q + 3.4 * w1 + vec2(8.3, 2.8) - t * 0.05)
  );

  // Inward drift; two phases cross-fade so the flow loops forever without stretching.
  vec2 inward = p / (r + 0.35);
  float ph1 = fract(t * 0.045);
  float ph2 = fract(t * 0.045 + 0.5);
  float n1 = fbm(q + 2.6 * w2 + inward * ph1 * 1.5);
  float n2 = fbm(q + 2.6 * w2 + inward * ph2 * 1.5 + vec2(3.1, 7.7));
  float wa = 1.0 - abs(2.0 * ph1 - 1.0);
  float n = mix(n2, n1, wa);
  n = (n - 0.5) * 1.35 + 0.5;

  // Smog walls pouring in from several edges and corners at different times.
  float billow = (n - 0.5) * 0.6 + (w2.x - 0.5) * 0.3;
  float reachX = aspect * 0.62;
  float cov = 0.0;
  cov = max(cov, wall(uv.x * aspect, front(uFill, 0.0, reachX), billow));
  cov = max(cov, wall((1.0 - uv.x) * aspect, front(uFill, 0.07, reachX), billow));
  cov = max(cov, wall(uv.y, front(uFill, 0.14, 0.66), billow));
  cov = max(cov, wall(1.0 - uv.y, front(uFill, 0.26, 0.66), billow));
  cov = max(cov, wall(length(vec2(uv.x * aspect, uv.y)), front(uFill, 0.04, 1.2), billow));
  cov = max(cov, wall(length(vec2((1.0 - uv.x) * aspect, 1.0 - uv.y)), front(uFill, 0.18, 1.2), billow));
  cov = max(cov, wall(length(vec2((1.0 - uv.x) * aspect, uv.y)), front(uFill, 0.1, 1.2), billow));

  float body = smoothstep(0.12, 0.85, n);
  float dens = cov * (0.42 + 0.78 * body);

  // The strike pushes the smog back from the centre, but never all of it.
  float clearR = mix(-0.9, uClearMax, ease(uClear));
  float cm = smoothstep(clearR - 0.05, clearR + 0.38, r + billow * 0.85);
  dens *= mix(0.1, 1.0, cm);
  dens *= 0.82 + 0.3 * smoothstep(0.15, 0.95, r);
  dens = clamp(dens, 0.0, 1.0);

  // Shading: deep shadows in thick folds, mint-white rims.
  vec3 shadowC = vec3(0.03, 0.045, 0.055);
  vec3 midC = vec3(0.33, 0.41, 0.44);
  vec3 hiC = vec3(0.86, 0.95, 0.93);
  float shade = smoothstep(0.2, 0.9, n + (w2.y - 0.5) * 0.45);
  vec3 col = mix(shadowC, midC, shade);
  col = mix(col, hiC, smoothstep(0.62, 1.05, n + length(w1 - 0.5) * 0.35) * 0.85);

  // Lightning lights the smog from inside.
  float fr = length(p - uFlashPos);
  float burst = exp(-fr * 2.3);
  col += vec3(0.8, 0.87, 1.0) * uFlash * (0.12 + 1.5 * burst) * (0.35 + shade);
  col += vec3(1.0, 0.45, 0.12) * uGlow * exp(-length(p - vec2(0.0, -0.26)) * 3.5) * 0.5;

  float a = dens * uOpacity;
  vec3 halo = vec3(0.82, 0.88, 1.0) * uFlash * 0.16 * burst;
  float grain = (hash(gl_FragCoord.xy + fract(t) * 91.0) - 0.5) / 128.0;
  gl_FragColor = vec4(col * a + halo + grain * a, clamp(a + length(halo), 0.0, 1.0));
}
`;
