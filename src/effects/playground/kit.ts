// Shared GLSL for every Playground generator. Each tool only writes one
// function, `vec3 pgMain(vec2 p, vec2 uv)`, returning its generated color;
// this kit supplies the uniforms, noise, palette lookup, dither, grain and
// the final blend over the incoming image (see build.ts for how the pieces
// are assembled). Coordinates: `p` spans -0.5..0.5 on the canvas's SHORT
// side, so a tool looks the same at any output size or aspect ratio --
// including the 160px library thumbnails.

export const PG_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const PG_KIT = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSeed;
  uniform vec2 uSeedOff;
  uniform vec3 uInks[8];
  uniform float uInkCount;
  uniform float uSource;
  uniform float uMotion;
  uniform float uDither;
  uniform float uGrain;
  uniform float uBlend;
  varying vec2 vUv;

  #define PG_PI 3.14159265
  #define PG_TAU 6.28318531

  vec2 pgAspect() { return uResolution / min(uResolution.x, uResolution.y); }
  vec2 pgCoord() { return (vUv - 0.5) * pgAspect(); }
  vec2 pgUv(vec2 p) { return p / pgAspect() + 0.5; }
  float pgT() { return uTime * uMotion; }
  // One output pixel, in p units -- for antialiasing and hairline widths.
  float pgPx() { return 1.0 / min(uResolution.x, uResolution.y); }

  // Hash without sine (Dave Hoskins) -- stable at large inputs, unlike the
  // usual fract(sin(...)) hash.
  float pgH11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
  float pgH21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  vec2 pgH22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
  // Seeded: every "New variation" reshuffles everything that goes through these.
  float pgR(vec2 p) { return pgH21(p + uSeedOff); }
  vec2 pgR2(vec2 p) { return pgH22(p + uSeedOff); }

  float pgNoise(vec2 p) {
    p += uSeedOff;
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = pgH21(i);
    float b = pgH21(i + vec2(1.0, 0.0));
    float c = pgH21(i + vec2(0.0, 1.0));
    float d = pgH21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float pgFbm(vec2 p, float octaves) {
    float v = 0.0;
    float a = 0.5;
    float norm = 0.0;
    for (int i = 0; i < 7; i++) {
      if (float(i) >= octaves) break;
      v += a * pgNoise(p);
      norm += a;
      p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(5.2, 1.3);
      a *= 0.5;
    }
    return v / max(norm, 0.0001);
  }

  vec2 pgDomainWarp(vec2 p, float amount) {
    vec2 q = vec2(pgFbm(p, 4.0), pgFbm(p + vec2(5.2, 1.3), 4.0));
    return p + amount * (q - 0.5) * 2.0;
  }

  // fbm clusters around 0.5; this stretches it back out to fill 0..1.
  float pgStretch(float f, float contrast) { return clamp((f - 0.5) * contrast + 0.5, 0.0, 1.0); }

  // x = distance to the nearest feature point, y = to the second nearest,
  // z = a random id for the nearest point's cell.
  vec3 pgVoronoi(vec2 p, float jitter) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float f1 = 8.0;
    float f2 = 8.0;
    float id = 0.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y));
        vec2 o = pgR2(i + g) * jitter + (1.0 - jitter) * 0.5;
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < f1) { f2 = f1; f1 = d; id = pgR(i + g + 0.37); }
        else if (d < f2) { f2 = d; }
      }
    }
    return vec3(sqrt(f1), sqrt(f2), id);
  }

  mat2 pgRot(float a) { float c = cos(a); float s = sin(a); return mat2(c, -s, s, c); }
  float pgSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  float pgBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  float pgRoundBox(vec2 p, vec2 b, float r) { return pgBox(p, b - r) - r; }
  // Antialiased coverage of a signed distance (in p units).
  float pgFill(float sd) { return 1.0 - smoothstep(-pgPx(), pgPx(), sd); }

  // A 3x5 pseudo-character, mirrored left/right so it reads as a letterform,
  // inside a 5x7 cell with a one-pixel margin. f = position within the cell.
  float pgGlyph(vec2 f, float id) {
    vec2 g = floor(f * vec2(5.0, 7.0)) - vec2(1.0, 1.0);
    if (g.x < 0.0 || g.y < 0.0 || g.x > 2.0 || g.y > 4.0) return 0.0;
    float gx = g.x > 1.5 ? 0.0 : g.x;
    return step(0.48, pgH21(vec2(gx, g.y) + id * 13.17 + uSeedOff));
  }

  // --- palette ("inks") ---
  vec3 pgInk(float idx) {
    float n = max(uInkCount, 1.0);
    float k = mod(floor(idx), n);
    vec3 c = uInks[0];
    for (int i = 1; i < 8; i++) { if (float(i) == k) c = uInks[i]; }
    return c;
  }
  vec3 pgInkStep(float t) { return pgInk(floor(clamp(t, 0.0, 0.9999) * max(uInkCount, 1.0))); }
  vec3 pgInkGrad(float t) {
    float n = max(uInkCount - 1.0, 1.0);
    float x = clamp(t, 0.0, 1.0) * n;
    float i = min(floor(x), n - 1.0);
    return mix(pgInk(i), pgInk(i + 1.0), x - i);
  }

  // --- ordered dither ---
  float pgBayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
  float pgBayer(vec2 a) { return pgBayer2(0.5 * a) * 0.25 + pgBayer2(a); }
  // Dither cells grow with the output so the texture keeps its scale.
  float pgDitherCell() { return max(1.0, floor(min(uResolution.x, uResolution.y) / 420.0)); }
  float pgDitherOffset() { return pgBayer(gl_FragCoord.xy / pgDitherCell()) - 0.47; }
  // Stepped ink with the band edges broken up by the shared Dither slider.
  vec3 pgInkD(float t) { return pgInkStep(t + pgDitherOffset() * uDither * 2.0 / max(uInkCount, 1.0)); }
  // Same, but dithered per pixel-art cell instead of per screen pixel.
  vec3 pgInkDCell(float t, vec2 cellId) { return pgInkStep(t + (pgBayer(cellId) - 0.47) * uDither * 2.0 / max(uInkCount, 1.0)); }
  // Ordered-dither a 0..1 coverage into on/off pixels.
  float pgDitherMask(float coverage) { return step(pgBayer(gl_FragCoord.xy / pgDitherCell()) + 0.03, coverage); }
  // Per-pixel (dither-cell sized) random, for specks and grain.
  float pgSpeck() { return pgR(floor(gl_FragCoord.xy / pgDitherCell())); }

  // --- the incoming image ---
  float pgLum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // Render targets are linear; re-encode so "mid gray" means mid gray.
  float pgSrc(vec2 uv) { return pow(clamp(pgLum(texture2D(tDiffuse, clamp(uv, 0.0, 1.0)).rgb), 0.0, 1.0), 0.4545); }
  // Pull a tool's own 0..1 field toward the photo's tones, by the Image slider.
  float pgField(float generated, vec2 uv) { return mix(generated, pgSrc(uv), uSource); }

  vec3 pgBlendMode(vec3 base, vec3 top) {
    if (uBlend < 0.5) return top;
    if (uBlend < 1.5) return base * top;
    if (uBlend < 2.5) return 1.0 - (1.0 - base) * (1.0 - top);
    vec3 lo = 2.0 * base * top;
    vec3 hi = 1.0 - 2.0 * (1.0 - base) * (1.0 - top);
    return mix(lo, hi, step(0.5, base));
  }

  void pgFinish(vec3 gen) {
    vec4 src = texture2D(tDiffuse, vUv);
    float g = pgH21(floor(gl_FragCoord.xy / pgDitherCell()) + floor(pgT() * 24.0) * vec2(17.0, 31.0) + uSeedOff) - 0.5;
    gen = clamp(gen + g * uGrain * 0.3, 0.0, 1.0);
    vec3 col = pgBlendMode(src.rgb, gen);
    gl_FragColor = vec4(mix(src.rgb, col, uOpacity), src.a);
  }
`
