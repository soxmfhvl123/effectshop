// Shared GLSL for every Sandbox generator. Each tool only writes one
// function, `vec3 sbMain(vec2 p, vec2 uv)`, returning its generated color;
// this kit supplies the uniforms, noise, palette lookup, dither, grain, the
// motion helpers and the final blend over the incoming image (see build.ts
// for how the pieces are assembled). Coordinates: `p` spans -0.5..0.5 on the
// canvas's SHORT side, so a tool looks the same at any output size or aspect
// ratio -- including the 160px library thumbnails.

export const SB_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const SB_KIT = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSeed;
  uniform vec2 uSeedOff;
  uniform vec3 uInks[8];
  uniform float uInkCount;
  uniform float uSource;
  uniform float uAnimate;
  uniform float uMove;
  uniform float uAmount;
  uniform float uFps;
  uniform float uLoop;
  uniform float uDither;
  uniform float uGrain;
  uniform float uBlend;
  varying vec2 vUv;

  #define SB_PI 3.14159265
  #define SB_TAU 6.28318531

  vec2 sbAspect() { return uResolution / min(uResolution.x, uResolution.y); }
  vec2 sbCoord() { return (vUv - 0.5) * sbAspect(); }
  vec2 sbUv(vec2 p) { return p / sbAspect() + 0.5; }
  // One output pixel, in p units -- for antialiasing and hairline widths.
  float sbPx() { return 1.0 / min(uResolution.x, uResolution.y); }

  // Hash without sine (Dave Hoskins) -- stable at large inputs, unlike the
  // usual fract(sin(...)) hash.
  float sbH11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
  float sbH21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  vec2 sbH22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
  // Seeded: every "New variation" reshuffles everything that goes through these.
  float sbR(vec2 p) { return sbH21(p + uSeedOff); }
  vec2 sbR2(vec2 p) { return sbH22(p + uSeedOff); }

  float sbNoise(vec2 p) {
    p += uSeedOff;
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = sbH21(i);
    float b = sbH21(i + vec2(1.0, 0.0));
    float c = sbH21(i + vec2(0.0, 1.0));
    float d = sbH21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float sbFbm(vec2 p, float octaves) {
    float v = 0.0;
    float a = 0.5;
    float norm = 0.0;
    for (int i = 0; i < 7; i++) {
      if (float(i) >= octaves) break;
      v += a * sbNoise(p);
      norm += a;
      p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(5.2, 1.3);
      a *= 0.5;
    }
    return v / max(norm, 0.0001);
  }

  vec2 sbDomainWarp(vec2 p, float amount) {
    vec2 q = vec2(sbFbm(p, 4.0), sbFbm(p + vec2(5.2, 1.3), 4.0));
    return p + amount * (q - 0.5) * 2.0;
  }

  // fbm clusters around 0.5; this stretches it back out to fill 0..1.
  float sbStretch(float f, float contrast) { return clamp((f - 0.5) * contrast + 0.5, 0.0, 1.0); }

  // x = distance to the nearest feature point, y = to the second nearest,
  // z = a random id for the nearest point's cell.
  vec3 sbVoronoi(vec2 p, float jitter) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float f1 = 8.0;
    float f2 = 8.0;
    float id = 0.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y));
        vec2 o = sbR2(i + g) * jitter + (1.0 - jitter) * 0.5;
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < f1) { f2 = f1; f1 = d; id = sbR(i + g + 0.37); }
        else if (d < f2) { f2 = d; }
      }
    }
    return vec3(sqrt(f1), sqrt(f2), id);
  }

  mat2 sbRot(float a) { float c = cos(a); float s = sin(a); return mat2(c, -s, s, c); }
  float sbSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  float sbBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  float sbRoundBox(vec2 p, vec2 b, float r) { return sbBox(p, b - r) - r; }
  // Antialiased coverage of a signed distance (in p units).
  float sbFill(float sd) { return 1.0 - smoothstep(-sbPx(), sbPx(), sd); }

  // A 3x5 pseudo-character, mirrored left/right so it reads as a letterform,
  // inside a 5x7 cell with a one-pixel margin. f = position within the cell.
  float sbGlyph(vec2 f, float id) {
    vec2 g = floor(f * vec2(5.0, 7.0)) - vec2(1.0, 1.0);
    if (g.x < 0.0 || g.y < 0.0 || g.x > 2.0 || g.y > 4.0) return 0.0;
    float gx = g.x > 1.5 ? 0.0 : g.x;
    return step(0.48, sbH21(vec2(gx, g.y) + id * 13.17 + uSeedOff));
  }

  // --- motion ---
  // Animation is a seamless loop: time is counted in frames at uFps (a
  // stepped, stop-motion feel at low rates) and wraps every uLoop frames, so
  // anything built from the phase or the frame number below repeats exactly.
  // With Animate off everything sits at frame 0, which is also what the
  // library thumbnails show.
  float sbFrame() { return uAnimate * mod(floor(uTime * uFps), max(uLoop, 1.0)); }
  float sbPhase() { return sbFrame() / max(uLoop, 1.0); }
  float sbOsc(float off) { return sin(SB_TAU * (sbPhase() + off)); }
  vec2 sbCirc(float off) { float a = SB_TAU * (sbPhase() + off); return vec2(cos(a), sin(a)); }
  // Strength of movement i: the Amount when it is the chosen Movement, else 0.
  float sbMv(float i) { return uAnimate * uAmount * (1.0 - step(0.5, abs(uMove - i))); }
  // Whole cycles per loop for movement strength k (0 when k is 0), so marching
  // and spinning motions land back exactly where they started.
  float sbTurns(float k) { return step(0.001, k) * floor(1.0 + k * 3.0); }
  float sbMarch(float k) { return sbPhase() * sbTurns(k); }
  // Spins get fewer, slower turns than marches: one turn per loop up to
  // Amount 0.66, two above.
  float sbSpin(float k) { return SB_TAU * sbPhase() * step(0.001, k) * floor(1.0 + k * 1.5); }
  // A fresh random every frame -- for flicker, shuffles and boiling lines.
  float sbFr(vec2 id) { return sbH21(id + sbFrame() * vec2(17.13, 3.71) + uSeedOff); }
  // A counter that ticks over 1..12 times per loop (more with k), offset per
  // element by r, for discrete re-rolls that read as deliberate changes.
  float sbHop(float r, float k) { return floor(sbPhase() * step(0.001, k) * floor(1.0 + k * 11.0) + r); }

  // Shared transforms. k is a movement strength from sbMv.
  // Breathe: slow zoom in and out about the centre.
  vec2 sbBreathe(vec2 p, float k) { return p * (1.0 - 0.22 * k * sbOsc(0.0)); }
  // Turn: rock the whole field back and forth.
  vec2 sbTurn(vec2 p, float k) { return sbRot(0.55 * k * sbOsc(0.0)) * p; }
  // Twirl: a rotation that grows with the radius -- a swirl.
  vec2 sbTwirl(vec2 p, float k) { return sbRot(2.4 * k * sbOsc(0.0) * length(p)) * p; }
  // Drift: an offset that travels a closed circle, so a field wanders and returns.
  vec2 sbDrift(float k) { return sbCirc(0.0) * k * 0.6; }
  // Churn: a time-varying warp that stirs a field in place.
  vec2 sbChurn(vec2 p, float k) {
    vec2 c = sbCirc(0.0) * 1.3;
    return p + k * 0.5 * (vec2(sbNoise(p * 1.7 + c), sbNoise(p * 1.7 + 9.1 - c)) - 0.5);
  }
  // Boil: hand-drawn line boil -- a small fresh wobble every frame.
  vec2 sbBoil(vec2 p, float k) {
    float f = sbFrame();
    return p + k * 0.014 * (vec2(sbNoise(p * 7.0 + f * 3.17), sbNoise(p * 7.0 + 5.3 + f * 1.93)) - 0.5);
  }

  // --- palette ("inks") ---
  vec3 sbInk(float idx) {
    float n = max(uInkCount, 1.0);
    float k = mod(floor(idx), n);
    vec3 c = uInks[0];
    for (int i = 1; i < 8; i++) { if (float(i) == k) c = uInks[i]; }
    return c;
  }
  vec3 sbInkStep(float t) { return sbInk(floor(clamp(t, 0.0, 0.9999) * max(uInkCount, 1.0))); }
  vec3 sbInkGrad(float t) {
    float n = max(uInkCount - 1.0, 1.0);
    float x = clamp(t, 0.0, 1.0) * n;
    float i = min(floor(x), n - 1.0);
    return mix(sbInk(i), sbInk(i + 1.0), x - i);
  }

  // --- ordered dither ---
  float sbBayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
  float sbBayer(vec2 a) { return sbBayer2(0.5 * a) * 0.25 + sbBayer2(a); }
  // Dither cells grow with the output so the texture keeps its scale.
  float sbDitherCell() { return max(1.0, floor(min(uResolution.x, uResolution.y) / 420.0)); }
  float sbDitherOffset() { return sbBayer(gl_FragCoord.xy / sbDitherCell()) - 0.47; }
  // Stepped ink with the band edges broken up by the shared Dither slider.
  vec3 sbInkD(float t) { return sbInkStep(t + sbDitherOffset() * uDither * 2.0 / max(uInkCount, 1.0)); }
  // Same, but dithered per pixel-art cell instead of per screen pixel.
  vec3 sbInkDCell(float t, vec2 cellId) { return sbInkStep(t + (sbBayer(cellId) - 0.47) * uDither * 2.0 / max(uInkCount, 1.0)); }
  // Ordered-dither a 0..1 coverage into on/off pixels.
  float sbDitherMask(float coverage) { return step(sbBayer(gl_FragCoord.xy / sbDitherCell()) + 0.03, coverage); }
  // Per-pixel (dither-cell sized) random, for specks and grain.
  float sbSpeck() { return sbR(floor(gl_FragCoord.xy / sbDitherCell())); }

  // --- the incoming image ---
  float sbLum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // Render targets are linear; re-encode so "mid gray" means mid gray.
  float sbSrc(vec2 uv) { return pow(clamp(sbLum(texture2D(tDiffuse, clamp(uv, 0.0, 1.0)).rgb), 0.0, 1.0), 0.4545); }
  // Pull a tool's own 0..1 field toward the photo's tones, by the Image slider.
  float sbField(float generated, vec2 uv) { return mix(generated, sbSrc(uv), uSource); }

  vec3 sbBlendMode(vec3 base, vec3 top) {
    if (uBlend < 0.5) return top;
    if (uBlend < 1.5) return base * top;
    if (uBlend < 2.5) return 1.0 - (1.0 - base) * (1.0 - top);
    vec3 lo = 2.0 * base * top;
    vec3 hi = 1.0 - 2.0 * (1.0 - base) * (1.0 - top);
    return mix(lo, hi, step(0.5, base));
  }

  void sbFinish(vec3 gen) {
    vec4 src = texture2D(tDiffuse, vUv);
    // grain re-rolls with each animation frame, like film
    float g = sbH21(floor(gl_FragCoord.xy / sbDitherCell()) + sbFrame() * vec2(17.0, 31.0) + uSeedOff) - 0.5;
    gen = clamp(gen + g * uGrain * 0.3, 0.0, 1.0);
    vec3 col = sbBlendMode(src.rgb, gen);
    gl_FragColor = vec4(mix(src.rgb, col, uOpacity), src.a);
  }
`
