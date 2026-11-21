// Perspective ground plane: rocky soil with bump-mapped lighting, lit by lightning
// from above and by the glowing crack at the impact point.
export const GROUND_FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uHorizon;
uniform float uImpact;
uniform float uCrackSize;
uniform float uCrack;
uniform float uHeat;
uniform float uFlash;
uniform float uReveal;
uniform float uSpark;
uniform sampler2D uCrackTex;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
const mat2 M = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = M * p; a *= 0.5; }
  return v;
}
float heightAt(vec2 w) {
  return fbm(w * 1.4) * 0.6 + fbm(w * 5.5 + 7.0) * 0.3 + noise(w * 19.0) * 0.08;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float dy = uHorizon - p.y;
  if (dy <= 0.001) { gl_FragColor = vec4(0.0); return; }

  float z = 1.0 / dy;
  vec2 w = vec2(p.x * z, z);
  float zi = 1.0 / (uHorizon - uImpact);
  vec2 local = vec2(w.x, w.y - zi);
  float lr = length(local);

  vec2 cuv = local / uCrackSize + 0.5;
  vec3 ct = vec3(0.0);
  if (cuv.x > 0.0 && cuv.y > 0.0 && cuv.x < 1.0 && cuv.y < 1.0) ct = texture2D(uCrackTex, cuv).rgb;
  float grow = uCrack * uCrackSize * 0.5;
  float reveal = smoothstep(grow + 0.02, grow - 0.3, lr + (noise(local * 3.0) - 0.5) * 0.35);
  float crack = ct.r * reveal;
  float glowM = ct.g * reveal;
  float scorch = ct.b * smoothstep(0.0, 0.2, uCrack);

  // Bump-mapped rock
  float e = 0.015 * z;
  float h = heightAt(w);
  float hx = heightAt(w + vec2(e, 0.0));
  float hz = heightAt(w + vec2(0.0, e));
  vec3 n = normalize(vec3(-(hx - h) / e * 0.3, 1.0, -(hz - h) / e * 0.3));
  n = normalize(n + vec3(0.0, -0.6 * glowM, 0.0));

  float detail = exp(-z * 0.25);
  vec3 albedo = mix(vec3(0.06, 0.058, 0.055), vec3(0.24, 0.22, 0.2), smoothstep(0.3, 0.78, h));
  albedo *= 0.75 + 0.5 * noise(w * 32.0) * detail + 0.25 * (1.0 - detail);
  albedo *= 1.0 - 0.8 * scorch;
  albedo *= 1.0 - 0.92 * crack;

  vec3 pos = vec3(w.x, h * 0.06, w.y);
  float heat = uHeat;
  vec3 emberC = mix(vec3(1.0, 0.32, 0.06), vec3(1.0, 0.86, 0.6), clamp(heat * heat * 1.2, 0.0, 1.0));

  vec3 Ld = vec3(0.0, 0.25, zi) - pos;
  float d2 = dot(Ld, Ld);
  Ld = normalize(Ld);
  vec3 col = albedo * emberC * heat * 5.0 * max(dot(n, Ld), 0.0) / (1.0 + d2 * 0.9);

  vec3 skyL = normalize(vec3(0.15, 1.0, -0.35));
  col += albedo * vec3(0.78, 0.85, 1.0) * uFlash * 2.6 * (0.25 + max(dot(n, skyL), 0.0));
  col += albedo * vec3(0.85, 0.9, 1.0) * uFlash * 4.0 / (1.0 + d2 * 0.9);
  col += albedo * vec3(0.05, 0.065, 0.075);

  float flick = 0.85 + 0.15 * sin(uTime * 11.0 + lr * 7.0) * (0.5 + noise(vec2(uTime * 2.5, lr * 3.0)));
  col += emberC * crack * heat * 4.5 * flick;
  col += emberC * glowM * heat * 1.5 * flick;
  col += vec3(0.75, 0.9, 1.0) * (crack + glowM * 0.4) * uSpark * 1.6;
  col += vec3(0.85, 0.9, 1.0) * crack * uFlash * 2.0;

  col = vec3(1.0) - exp(-col * 1.3);

  float fog = exp(-max(z - 1.6, 0.0) * 0.34);
  float a = uReveal * clamp(fog * 1.15, 0.0, 1.0) * smoothstep(0.0, 0.1, dy);
  gl_FragColor = vec4(col * fog * a, a);
}
`;
