import { select, slider } from './params'
import type { SandboxTool } from './types'

// Full-frame backdrops. Each tool's three movements are read in its GLSL as
// sbMv(0.0) / sbMv(1.0) / sbMv(2.0), in the order of `movements`.
export const GROUNDS: SandboxTool[] = [
  {
    id: 'sbAerosol',
    no: 1,
    name: 'Aerosol',
    makes: 'spray-paint pastel washes',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#9cf57a', '#f2c6d8', '#d8c8ae', '#c6efa0', '#f5a6cf'],
    movements: ['Drift', 'Churn', 'Spray'],
    params: [
      slider('scale', 'Scale', 1.4, 0.3, 4),
      slider('streak', 'Streak', 0.7, 0, 1),
      slider('softness', 'Softness', 0.6, 0, 1),
      slider('spray', 'Spray', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mSpray = sbMv(2.0);
        vec2 q = p * p_scale * vec2(mix(1.0, 6.0, p_streak), mix(1.0, 0.35, p_streak));
        q += sbDrift(sbMv(0.0)) * 2.5;
        q = sbChurn(q, sbMv(1.0) * 3.0);
        q = sbDomainWarp(q, 0.5);
        float f = sbStretch(sbFbm(q, 5.0), mix(3.2, 1.3, p_softness));
        f = sbField(f, uv);
        vec3 col = mix(sbInkGrad(f), sbInkD(f), uDither);
        // Spray: the paint re-mists every frame and the haze thickens
        float sp = mix(sbSpeck(), sbFr(floor(gl_FragCoord.xy / sbDitherCell())), step(0.001, mSpray));
        return col + (sp - 0.5) * (0.14 * p_spray + 0.25 * mSpray);
      }
    `,
  },
  {
    id: 'sbBorealis',
    no: 2,
    name: 'Borealis',
    makes: 'pixel aurora curtains',
    kind: 'Grounds',
    imageReactive: true,
    dither: 0.6,
    inks: ['#050505', '#2a3cff', '#c43cff', '#ff5a2a', '#ffc83a', '#ffffff'],
    movements: ['Wave', 'Shimmer', 'Breathe'],
    params: [
      slider('cells', 'Pixels', 56, 16, 120, 1),
      slider('waves', 'Curtains', 2, 1, 4, 1),
      slider('spread', 'Spread', 0.5, 0, 1),
      slider('dots', 'Stars', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float cell = 1.0 / p_cells;
        vec2 cid = floor(p / cell);
        vec2 q = (cid + 0.5) * cell;
        float mWave = sbMv(0.0);
        float mShim = sbMv(1.0);
        float mBreathe = sbMv(2.0);
        float glow = 0.0;
        for (int i = 0; i < 4; i++) {
          if (float(i) >= p_waves) break;
          float fi = float(i);
          float dir = mod(fi, 2.0) * 2.0 - 1.0;
          float yc = (sbR(vec2(fi, 1.0)) - 0.5) * sbAspect().y * 0.8 + 0.05 * mBreathe * sbOsc(fi * 0.21);
          float amp = (0.05 + 0.15 * sbR(vec2(fi, 2.0))) * (1.0 + 0.6 * mWave * sbOsc(fi * 0.3 + 0.25));
          float fr = 2.0 + 4.0 * sbR(vec2(fi, 3.0));
          // neighbouring curtains roll in opposite directions
          float y = yc + amp * sin(q.x * fr + sbR(vec2(fi, 4.0)) * SB_TAU + sbSpin(mWave) * dir) + 0.05 * (sbNoise(vec2(q.x * 6.0, fi * 7.0)) - 0.5);
          float d = q.y - y;
          float w = mix(0.03, 0.2, p_spread) * (1.0 + 0.7 * mBreathe * sbOsc(fi * 0.17));
          // a curtain: long falloff above the bright edge, sharp below
          float curtain = exp(-abs(d) / (d > 0.0 ? w : w * 0.35));
          // Shimmer: vertical rays flare and fade frame by frame
          curtain *= 1.0 + mShim * 1.4 * (sbFr(vec2(cid.x, fi)) - 0.5) * step(0.0, d);
          glow += curtain;
        }
        glow = sbField(clamp(glow, 0.0, 1.0), sbUv(q));
        vec3 col = sbInkDCell(glow, cid);
        vec2 dc = fract(p * 40.0) - 0.5;
        float twinkle = mix(1.0, step(0.4, sbFr(floor(p * 40.0))), step(0.001, mShim));
        float dotm = (1.0 - step(0.12, length(dc))) * p_dots * step(glow, 0.12) * twinkle;
        return mix(col, sbInk(1.0) * 0.5, dotm);
      }
    `,
  },
  {
    id: 'sbEbru',
    no: 3,
    name: 'Ebru',
    makes: 'stacked paper marbling',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#0d3a20', '#1f7a45', '#49c28a', '#9fe8c8', '#3a6fd6', '#e9fff3'],
    movements: ['Churn', 'Breathe', 'Turn'],
    params: [
      slider('scale', 'Scale', 2.4, 0.5, 6),
      slider('warp', 'Warp', 1.2, 0, 2),
      slider('bands', 'Layers', 7, 3, 12, 1),
      slider('edge', 'Paper Edge', 0.5, 0, 1),
      slider('shadow', 'Shadow', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      float ebruF(vec2 p) {
        vec2 r = sbBreathe(sbTurn(p, sbMv(2.0)), sbMv(1.0));
        vec2 q = sbChurn(r * p_scale, sbMv(0.0) * 1.6);
        q = sbDomainWarp(q, p_warp);
        return sbField(sbStretch(sbFbm(q, 5.0), 2.2), sbUv(p));
      }
      vec3 sbMain(vec2 p, vec2 uv) {
        float n = p_bands;
        float f = ebruF(p);
        float b = floor(clamp(f + sbDitherOffset() * uDither * 2.0 / n, 0.0, 0.9999) * n);
        vec2 sh = vec2(0.006, -0.008) * (0.4 + p_shadow);
        float bs = floor(clamp(ebruF(p + sh), 0.0, 0.9999) * n);
        vec3 col = sbInk(b);
        // a higher paper layer just up-left casts a shadow onto this one
        col *= 1.0 - step(b + 0.5, bs) * 0.45 * p_shadow;
        float e = fract(f * n);
        col = mix(col, vec3(1.0), (1.0 - smoothstep(0.0, 0.07 * p_edge + 0.001, e)) * p_edge * 0.8);
        col = mix(col, sbInk(0.0), step(0.994, sbSpeck()) * 0.6);
        return col;
      }
    `,
  },
  {
    id: 'sbFacade',
    no: 4,
    name: 'Facade',
    makes: 'tiled gradient panels',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#7a2cff', '#ff4fd8', '#ff3b5c', '#ff9f3a', '#9df05a', '#5fd0ff', '#f2f2f2'],
    movements: ['Slide', 'Shuffle', 'Pulse'],
    params: [
      slider('rows', 'Rows', 3, 1, 6, 1),
      slider('columns', 'Columns', 4, 1, 8, 1),
      slider('soft', 'Softness', 0.8, 0, 1),
      slider('gap', 'Gap', 0, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float total = 0.0;
        for (int i = 0; i < 6; i++) { if (float(i) >= p_rows) break; total += 0.5 + sbR(vec2(float(i), 1.0)); }
        float acc = 0.0;
        float row = 0.0;
        float y0 = 0.0;
        float y1 = 1.0;
        for (int i = 0; i < 6; i++) {
          if (float(i) >= p_rows) break;
          float w = (0.5 + sbR(vec2(float(i), 1.0))) / total;
          if (uv.y >= acc && uv.y < acc + w) { row = float(i); y0 = acc; y1 = acc + w; }
          acc += w;
        }
        float colsN = 1.0 + floor(sbR(vec2(row, 2.0)) * p_columns);
        float ctotal = 0.0;
        for (int j = 0; j < 8; j++) { if (float(j) >= colsN) break; ctotal += 0.4 + sbR(vec2(row, float(j) + 3.0)); }
        float cacc = 0.0;
        float colIdx = 0.0;
        float x0 = 0.0;
        float x1 = 1.0;
        for (int j = 0; j < 8; j++) {
          if (float(j) >= colsN) break;
          float w = (0.4 + sbR(vec2(row, float(j) + 3.0))) / ctotal;
          if (uv.x >= cacc && uv.x < cacc + w) { colIdx = float(j); x0 = cacc; x1 = cacc + w; }
          cacc += w;
        }
        vec2 id = vec2(colIdx, row);
        vec2 lp = vec2((uv.x - x0) / (x1 - x0), (uv.y - y0) / (y1 - y0));
        float dirSel = sbR(id + 0.7);
        float t = dirSel < 0.4 ? lp.x : (dirSel < 0.8 ? lp.y : (lp.x + lp.y) * 0.5);
        if (sbR(id + 0.9) < 0.5) t = 1.0 - t;
        // Slide: each panel's gradient glides back and forth on its own beat
        t += 0.4 * sbMv(0.0) * sbOsc(sbR(id + 5.5));
        t = sbField(t, uv);
        float soft = clamp(p_soft + 0.9 * sbMv(2.0) * sbOsc(sbR(id + 6.6)), 0.0, 1.0);
        t = smoothstep(0.5 - 0.5 * soft - 0.02, 0.5 + 0.5 * soft + 0.02, t);
        // Shuffle: panels swap to new colour sets one after another
        float hop = sbHop(sbR(id + 4.4), sbMv(1.0)) * 7.31;
        float n = uInkCount;
        vec3 a = sbInk(floor(sbR(id + 1.3 + hop) * n));
        vec3 b = sbInk(floor(sbR(id + 2.6 + hop) * n));
        vec3 c3 = sbInk(floor(sbR(id + 3.9 + hop) * n));
        vec3 g = t < 0.5 ? mix(a, b, t * 2.0) : mix(b, c3, t * 2.0 - 1.0);
        vec2 edgePx = vec2(min(uv.x - x0, x1 - uv.x), min(uv.y - y0, y1 - uv.y)) * uResolution;
        float gap = step(min(edgePx.x, edgePx.y), 1.0 + p_gap * 10.0) * step(0.01, p_gap);
        return mix(g, sbInk(uInkCount - 1.0), gap);
      }
    `,
  },
  {
    id: 'sbFibre',
    no: 5,
    name: 'Fibre',
    makes: 'contour thread fields',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#08081e', '#3a4cff', '#8fa0ff', '#ffffff', '#ff6aa0'],
    movements: ['Flow', 'Churn', 'Shimmer'],
    params: [
      slider('density', 'Threads', 55, 10, 120, 1),
      slider('warp', 'Warp', 1.6, 0, 3),
      slider('thickness', 'Thickness', 0.55, 0, 1),
      slider('coverage', 'Coverage', 0.7, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mShim = sbMv(2.0);
        vec2 q = sbChurn(p * 1.4, sbMv(1.0) * 1.4);
        q = sbDomainWarp(q, p_warp);
        float f = sbField(sbFbm(q, 4.0), uv);
        // Flow: threads stream outward from every peak, a whole spacing per cycle
        float v = f * p_density - sbMarch(sbMv(0.0));
        float lines = abs(fract(v) - 0.5) * 2.0;
        float thread = 1.0 - smoothstep(0.0, mix(0.06, 0.3, p_thickness), lines);
        float sp = mix(sbSpeck(), sbFr(floor(gl_FragCoord.xy / sbDitherCell())), step(0.001, mShim));
        float dots = step(0.15 + 0.4 * mShim, sp);
        float halo = (1.0 - smoothstep(0.0, 0.7, lines)) * 0.3;
        float mask = smoothstep(0.55 - p_coverage * 0.4, 0.62 - p_coverage * 0.4, sbFbm(p * 1.8 + 7.0, 3.0));
        vec3 tc = sbInk(1.0 + mod(floor(v * 0.37), max(uInkCount - 1.0, 1.0)));
        return mix(sbInk(0.0), tc, max(thread * dots, halo) * mask);
      }
    `,
  },
  {
    id: 'sbHalftint',
    no: 6,
    name: 'Halftint',
    makes: 'dot-screened heat maps',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#1b1b20', '#2e1f6e', '#6a49ff', '#46b4ff', '#55f0c0', '#eee6ff'],
    movements: ['Drift', 'Churn', 'Pulse'],
    params: [
      slider('scale', 'Scale', 2.2, 0.5, 6),
      slider('warp', 'Warp', 1.3, 0, 2),
      slider('dots', 'Screen', 40, 16, 180, 1),
      slider('angle', 'Angle', 45, 0, 90, 1),
      slider('contrast', 'Contrast', 1.6, 0.5, 3),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mPulse = sbMv(2.0);
        vec2 q = p * p_scale + sbDrift(sbMv(0.0)) * 1.2;
        q = sbChurn(q, sbMv(1.0) * 1.6);
        q = sbDomainWarp(q, p_warp);
        float f = sbField(sbStretch(sbFbm(q, 5.0), p_contrast), uv);
        vec2 r = sbRot(radians(p_angle)) * p * p_dots;
        vec2 cell = fract(r) - 0.5;
        // Pulse: a wave of dot size rolls out from the centre
        float pulse = 1.0 + 0.45 * mPulse * sin(SB_TAU * (sbMarch(mPulse) - length(p) * 1.5));
        float rad = sqrt(f) * 0.62 * pulse;
        // AA is in cell units; cap it so small renders keep crisp dots
        float aa = min(p_dots * sbPx(), 0.08);
        float dotMask = 1.0 - smoothstep(rad - aa, rad + aa, length(cell));
        vec3 inkc = mix(sbInkGrad(f), sbInkD(f), uDither);
        return mix(sbInk(0.0), inkc, dotMask);
      }
    `,
  },
  {
    id: 'sbInkblot',
    no: 7,
    name: 'Inkblot',
    makes: 'mirrored pixel blots',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#a6ef48', '#c9c7f5', '#8d8ae6', '#f4ef6a', '#e7c86a'],
    movements: ['Breathe', 'Churn', 'Twirl'],
    params: [
      slider('cells', 'Pixels', 36, 8, 96, 1),
      slider('scale', 'Scale', 2.2, 0.5, 6),
      select('symmetry', 'Symmetry', ['Mirror', 'Quad', 'Kaleido'], 'Quad'),
      slider('soft', 'Softness', 0.0, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float cell = 1.0 / p_cells;
        vec2 q = (floor(p / cell) + 0.5) * cell;
        q.x = abs(q.x);
        if (p_symmetry > 0.5) q.y = abs(q.y);
        if (p_symmetry > 1.5 && q.y > q.x) q = q.yx;
        // moving the folded coordinate keeps the blot symmetrical
        vec2 w = sbTwirl(sbBreathe(q, sbMv(0.0)), sbMv(2.0));
        w = sbChurn(w * p_scale, sbMv(1.0) * 1.6);
        float f = sbStretch(sbFbm(w, 4.0), 2.5);
        f = sbField(f, sbUv(q));
        return mix(sbInkDCell(f, floor(q / cell)), sbInkGrad(f), p_soft);
      }
    `,
  },
  {
    id: 'sbIsles',
    no: 8,
    name: 'Isles',
    makes: 'dithered island charts',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#0a0a0a', '#c8c23a', '#ff4f8a', '#5fe0ff'],
    movements: ['Tide', 'Drift', 'Ping'],
    params: [
      slider('scale', 'Scale', 2.6, 0.5, 6),
      slider('level', 'Sea Level', 0.5, 0, 1),
      slider('coast', 'Coastline', 0.5, 0, 1),
      slider('grid', 'Grid', 0.35, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mPing = sbMv(2.0);
        vec2 q = sbDomainWarp(p * p_scale + sbDrift(sbMv(1.0)) * 1.2, 0.8);
        float h = sbField(sbStretch(sbFbm(q, 5.0), 2.2), uv);
        // Tide: the sea rises and falls over the coast
        float lvl = p_level + 0.12 * sbMv(0.0) * sbOsc(0.0);
        float land = sbDitherMask(smoothstep(lvl - 0.06, lvl + 0.06, h));
        vec3 col = mix(sbInk(0.0), sbInk(1.0), land);
        vec2 cellPx = floor(gl_FragCoord.xy / sbDitherCell());
        float dotGrid = step(mod(cellPx.x, 3.0), 0.5) * step(mod(cellPx.y, 3.0), 0.5);
        col = mix(col, sbInk(0.0), dotGrid * land * step(lvl + 0.12, h));
        float coast = (1.0 - smoothstep(0.0, 0.035 * p_coast + 0.001, abs(h - lvl))) * step(0.55, sbSpeck());
        col = mix(col, sbInk(2.0 + step(0.5, sbR(cellPx + 3.0))), coast * step(0.01, p_coast));
        vec2 gl = abs(fract(p * 6.0) - 0.5);
        float grid = step(0.5 - sbPx() * 4.8, max(gl.x, gl.y));
        col = mix(col, sbInk(1.0) * 0.7, grid * p_grid * land);
        // Ping: a sonar ring sweeps out from the centre, lighting the land behind it
        float ringR = fract(sbMarch(mPing)) * 0.95 * max(sbAspect().x, sbAspect().y);
        float dist = length(p);
        float ring = 1.0 - smoothstep(0.0, 0.01, abs(dist - ringR));
        float trail = smoothstep(ringR - 0.18, ringR, dist) * step(dist, ringR) * land;
        return mix(col, sbInk(3.0), max(ring, trail * 0.45) * sbDitherMask(0.85) * step(0.001, mPing));
      }
    `,
  },
  {
    id: 'sbKelp',
    no: 9,
    name: 'Kelp',
    makes: 'striped sea-fan cloth',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#2b1d10', '#d9c45a', '#8fc59a', '#c6e6b8'],
    movements: ['Sway', 'Grow', 'Drift'],
    params: [
      slider('stripes', 'Stripes', 16, 4, 40, 1),
      slider('warp', 'Warp', 1.0, 0, 2),
      slider('patches', 'Patches', 0.45, 0, 1),
      slider('speckle', 'Speckle', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 q = sbDomainWarp(p * 1.6 + sbDrift(sbMv(2.0)), p_warp);
        // Sway: the stripes ripple sideways like fronds in a current
        q.x += 0.16 * sbMv(0.0) * sbOsc(q.y * 0.35);
        float s = sin((q.x * 0.55 + q.y) * p_stripes + sbFbm(q * 2.0, 3.0) * 5.0);
        float stripe = smoothstep(0.1, 0.3, s);
        float patchF = sbField(sbFbm(p * 2.2 + 11.0, 4.0), uv);
        // Grow: the pale patches spread and shrink back
        float th = 0.62 - p_patches * 0.25 - 0.1 * sbMv(1.0) * (0.5 + 0.5 * sbOsc(0.0));
        float inPatch = smoothstep(th, th + 0.01, patchF);
        float rim = smoothstep(th - 0.012, th, patchF) * (1.0 - inPatch);
        vec3 col = mix(sbInk(0.0), sbInk(1.0), stripe);
        vec3 patchCol = mix(sbInk(2.0), sbInk(3.0), step(1.0 - p_speckle * 0.5, sbSpeck()));
        col = mix(col, patchCol, inPatch);
        return mix(col, sbInk(0.0), rim);
      }
    `,
  },
  {
    id: 'sbLinkage',
    no: 10,
    name: 'Linkage',
    makes: 'jointed rod chains',
    kind: 'Grounds',
    inks: ['#14290f', '#3c7af0', '#f2ece2', '#0a1a0a'],
    movements: ['Sway', 'Reach', 'Grow'],
    params: [
      slider('chains', 'Chains', 5, 1, 8, 1),
      slider('length', 'Length', 5, 2, 8, 1),
      slider('thickness', 'Thickness', 0.5, 0, 1),
      slider('rim', 'Rim', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        float mSway = sbMv(0.0);
        float mReach = sbMv(1.0);
        float mGrow = sbMv(2.0);
        float w = mix(0.022, 0.055, p_thickness);
        float dMin = 10.0;
        float dShadow = 10.0;
        vec2 sh = vec2(0.011, -0.011);
        for (int c = 0; c < 8; c++) {
          if (float(c) >= p_chains) break;
          float fc = float(c);
          vec2 a = (sbR2(vec2(fc, 1.9)) - 0.5) * asp;
          float ang = sbR(vec2(fc, 4.4)) * SB_TAU;
          // Grow: chains extend a joint at a time, then retract
          float grow = p_length * (1.0 - mGrow * (0.5 + 0.5 * sbOsc(sbR(vec2(fc, 7.7)))));
          for (int s = 0; s < 8; s++) {
            if (float(s) >= p_length) break;
            float fs = float(s);
            // Sway: every joint bends a little, a beat behind the one before
            ang += (sbR(vec2(fc * 13.0 + fs, 2.2)) - 0.5) * 2.2 + mSway * 0.45 * sbOsc(fc * 0.13 + fs * 0.09);
            float segLen = mix(0.09, 0.17, sbR(vec2(fc, fs + 0.5)));
            segLen *= (1.0 + 0.35 * mReach * sbOsc(fc * 0.2 + fs * 0.05)) * clamp(grow - fs, 0.0, 1.0);
            if (segLen < 0.0005) break;
            vec2 b = a + vec2(cos(ang), sin(ang)) * segLen;
            dMin = min(dMin, sbSegment(p, a, b) - w);
            dShadow = min(dShadow, sbSegment(p - sh, a, b) - w);
            a = b;
          }
        }
        float sp = sbSpeck();
        vec3 col = mix(sbInk(0.0), sbInk(3.0), step(0.6, sp));
        float rimW = 0.006 * (0.3 + p_rim * 1.4);
        col = mix(col, sbInk(2.0), max(sbFill(dShadow), sbFill(dMin - rimW)));
        vec3 rod = mix(sbInk(1.0), sbInk(1.0) * 0.55, step(0.72, sp));
        return mix(col, rod, sbFill(dMin));
      }
    `,
  },
  {
    id: 'sbLino',
    no: 11,
    name: 'Lino',
    makes: 'carved block panels',
    kind: 'Grounds',
    inks: ['#111111', '#f4f4f4', '#9dff3a', '#6fd62a'],
    movements: ['Slide', 'Shuffle', 'Flicker'],
    params: [
      slider('panels', 'Rows', 4, 2, 8, 1),
      slider('density', 'Line Density', 24, 4, 60, 1),
      slider('variety', 'Variety', 0.7, 0, 1),
      slider('texture', 'Texture', 0.4, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float rowsN = p_panels;
        float row = floor(uv.y * rowsN);
        float colsN = 1.0 + floor(sbR(vec2(row, 1.0)) * 3.0);
        vec2 cellCount = vec2(colsN, rowsN);
        vec2 id = vec2(floor(uv.x * colsN), row);
        vec2 lp = fract(uv * cellCount);
        float freq = p_density;
        // Slide: each panel's carving runs its own way, four line-spacings a
        // cycle so every pattern below lands back on itself
        float dir = sbR(id + 7.1) < 0.5 ? -1.0 : 1.0;
        vec2 axis = sbR(id + 8.2) < 0.5 ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec2 sp = p + axis * dir * sbMarch(sbMv(0.0)) * 4.0 / freq;
        // Shuffle: panels are re-cut one by one
        float hop = sbHop(sbR(id + 9.3), sbMv(1.0)) * 5.17;
        float n = uInkCount;
        float ia = floor(sbR(id + 1.1 + hop) * n);
        float ib = mod(ia + 1.0 + floor(sbR(id + 2.2 + hop) * (n - 1.0)), n);
        // Flicker: a panel's two inks trade places for a frame
        if (sbFr(id) < sbMv(2.0) * 0.35) { float t = ia; ia = ib; ib = t; }
        float kind = floor(sbR(id + 0.3 + hop) * mix(2.0, 6.0, p_variety));
        float m;
        if (kind < 0.5) m = step(0.5, fract(sp.x * freq));
        else if (kind < 1.5) m = step(0.5, fract(sp.y * freq));
        else if (kind < 2.5) m = max(step(0.85, fract(sp.x * freq * 0.5)), step(0.85, fract(sp.y * freq * 0.5)));
        else if (kind < 3.5) m = step(sbSpeck(), lp.y * 0.9 + p_texture * 0.2);
        else if (kind < 4.5) m = step(fract(sp.x * freq * 0.25), abs(fract(sp.y * freq * 0.25) - 0.5) * 2.0);
        else m = 0.0;
        vec3 col = mix(sbInk(ia), sbInk(ib), m);
        vec2 edgePx = min(lp, 1.0 - lp) / cellCount * uResolution;
        col = mix(col, sbInk(0.0), step(min(edgePx.x, edgePx.y), 1.5));
        return col + (sbSpeck() - 0.5) * 0.15 * p_texture;
      }
    `,
  },
  {
    id: 'sbLoom',
    no: 12,
    name: 'Loom',
    makes: 'slipping pixel plaids',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#f2e8c8', '#b8ea6a', '#e9c86a', '#78d86a', '#111111'],
    movements: ['Slip', 'Drip', 'Flicker'],
    params: [
      slider('cells', 'Cells', 26, 8, 64, 1),
      slider('lines', 'Plaid Lines', 0.5, 0, 1),
      slider('drips', 'Drips', 0.45, 0, 1),
      slider('glitch', 'Glitch', 0.3, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        vec2 g = (p + asp * 0.5) * p_cells;
        float rows = asp.y * p_cells;
        float row = floor(g.y);
        float mSlip = sbMv(0.0);
        float slide = step(1.0 - p_glitch * 0.45, sbR(vec2(row, 4.2))) * floor((sbR(vec2(row, 8.8)) - 0.5) * 10.0);
        // Slip: some rows lurch sideways a cell at a time, either way
        float slipDir = sbR(vec2(row, 3.1)) < 0.5 ? -1.0 : 1.0;
        slide += step(0.6 - mSlip * 0.4, sbR(vec2(row, 1.9))) * sbHop(sbR(vec2(row, 2.7)), mSlip) * slipDir;
        float fromTop = rows - g.y;
        g.x += slide;
        vec2 c = floor(g);
        vec2 f = fract(g);
        float lineInk = uInkCount - 1.0;
        float n = max(uInkCount - 1.0, 1.0);
        float region = sbField(sbStretch(sbFbm(c / p_cells * 3.0, 3.0), 2.2), sbUv((c + 0.5) / p_cells - asp * 0.5));
        float k = floor(clamp(region + (sbR(c) - 0.5) * 0.35, 0.0, 0.999) * n);
        // Flicker: cells blink to another colour for a frame
        if (sbFr(c) < sbMv(2.0) * 0.25) k = floor(sbFr(c + 3.3) * n);
        vec3 col = sbInk(k);
        float vline = step(1.0 - p_lines * 0.3, sbR(vec2(c.x, 2.0))) * step(f.x, 0.2);
        float hline = step(1.0 - p_lines * 0.3, sbR(vec2(c.y, 7.0))) * step(f.y, 0.2);
        col = mix(col, sbInk(lineInk), max(vline, hline));
        float dripLen = sbR(vec2(c.x, 5.5)) * rows * 0.6 * p_drips * step(0.45, sbR(vec2(c.x, 6.6)));
        // Drip: drips run down and draw back up, each column on its own beat
        dripLen *= mix(1.0, 0.1 + 1.4 * (0.5 + 0.5 * sbOsc(sbR(vec2(c.x, 9.4)))), sbMv(1.0));
        float drip = step(fromTop, dripLen + (sbR(c + 0.5) - 0.5) * 3.0);
        return mix(col, sbInk(lineInk), drip);
      }
    `,
  },
  {
    id: 'sbNibble',
    no: 13,
    name: 'Nibble',
    makes: 'bitten blob scatters',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#0b0b0b', '#3a44ee', '#f2f2f2', '#1a1f70'],
    movements: ['Wander', 'Pulse', 'Boil'],
    params: [
      slider('count', 'Count', 14, 4, 30, 1),
      slider('size', 'Size', 0.5, 0, 1),
      slider('rim', 'Rim', 0.5, 0, 1),
      slider('speckle', 'Speckle', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        float mWander = sbMv(0.0);
        float mPulse = sbMv(1.0);
        float mBoil = sbMv(2.0);
        vec2 bp = sbBoil(p, mBoil * 1.6);
        float field = 0.0;
        for (int i = 0; i < 30; i++) {
          if (float(i) >= p_count) break;
          float fi = float(i);
          vec2 c = (sbR2(vec2(fi, 3.1)) - 0.5) * asp * 1.05;
          c += 0.07 * mWander * sbCirc(sbR(vec2(fi, 6.3)));
          float r = mix(0.03, 0.09, p_size) * (0.5 + sbR(vec2(fi, 5.2)));
          r *= 1.0 + 0.4 * mPulse * sbOsc(sbR(vec2(fi, 7.4)));
          vec2 dv = bp - c;
          field += (r * r) / (dot(dv, dv) + 0.00001);
        }
        // the bitten edge; Boil re-chews it every frame
        field *= 0.8 + 0.4 * sbNoise(p * 38.0 + sbFrame() * 7.3 * step(0.001, mBoil));
        field = mix(field, sbSrc(uv) * 2.2, uSource);
        float inside = step(1.0, field);
        float rim = step(1.0 - 0.5 * p_rim - 0.05, field) * (1.0 - inside);
        vec3 col = mix(sbInk(0.0), sbInk(2.0), rim);
        vec3 body = mix(sbInk(1.0), sbInk(3.0), step(0.55 + 0.4 * (1.0 - p_speckle), sbSpeck()));
        return mix(col, body, inside);
      }
    `,
  },
  {
    id: 'sbPetri',
    no: 14,
    name: 'Petri',
    makes: 'speckled colony dishes',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#132820', '#7dd6e8', '#f07a8a', '#c9425d'],
    movements: ['Grow', 'Drift', 'Fizz'],
    params: [
      slider('colonies', 'Colonies', 12, 3, 30, 1),
      slider('size', 'Size', 0.55, 0, 1),
      slider('fuzz', 'Fuzz', 0.5, 0, 1),
      slider('rings', 'Rings', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        float mGrow = sbMv(0.0);
        float mDrift = sbMv(1.0);
        float mFizz = sbMv(2.0);
        float f = 0.0;
        for (int i = 0; i < 30; i++) {
          if (float(i) >= p_colonies) break;
          float fi = float(i);
          vec2 c = (sbR2(vec2(fi, 4.7)) - 0.5) * asp * 1.1;
          c += sbCirc(sbR(vec2(fi, 6.6))) * 0.05 * mDrift;
          float r = mix(0.05, 0.14, p_size) * (0.55 + 0.9 * sbR(vec2(fi, 2.9)));
          // Grow: colonies swell and recede out of step with each other
          r *= 1.0 - 0.45 * mGrow * (0.5 + 0.5 * sbOsc(sbR(vec2(fi, 8.1))));
          vec2 dv = p - c;
          f += exp(-dot(dv, dv) / (r * r));
        }
        f = 1.0 - exp(-f * 1.3);
        // Fizz: the grain is re-seeded every frame
        float sp = mix(sbSpeck(), sbFr(floor(gl_FragCoord.xy / sbDitherCell())), step(0.001, mFizz));
        float fuzz = p_fuzz + mFizz * 0.5;
        f += (sp - 0.5) * 0.3 * fuzz + (sbNoise(p * 30.0 + sbFrame() * 3.7 * step(0.001, mFizz)) - 0.5) * 0.15 * fuzz;
        f = sbField(clamp(f, 0.0, 1.0), uv);
        float n = max(uInkCount - 1.0, 1.0);
        float t2 = pow(clamp((f - 0.28) / 0.72, 0.0, 1.0), mix(1.6, 0.6, p_rings));
        float idx = f < 0.28 ? 0.0 : 1.0 + floor(clamp(t2 + sbDitherOffset() * uDither * 2.0 / n, 0.0, 0.999) * n);
        vec3 col = sbInk(idx);
        return mix(col, sbInk(0.0) * 1.6, step(0.97, sp) * step(f, 0.28));
      }
    `,
  },
  {
    id: 'sbPotted',
    no: 15,
    name: 'Potted',
    makes: 'scribbled still lifes',
    kind: 'Grounds',
    inks: ['#f2e3e7', '#8ff36a', '#111111', '#ffffff'],
    movements: ['Boil', 'Grow', 'Spin'],
    params: [
      slider('blob', 'Plant', 0.55, 0, 1),
      slider('scribble', 'Scribble', 7, 0, 12, 1),
      slider('glitch', 'Glitch', 0.4, 0, 1),
      slider('degrade', 'Degrade', 0.35, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mGrow = sbMv(1.0);
        float mSpin = sbMv(2.0);
        // Boil: the whole drawing redraws itself slightly every frame
        p = sbBoil(p, sbMv(0.0) * 2.2);
        vec3 col = sbInk(0.0);
        vec2 dir = normalize(p + 0.00001);
        float rad = (0.16 + 0.22 * p_blob) * (0.7 + 0.6 * sbFbm(dir * 1.4 + 3.0, 3.0));
        rad *= 1.0 + 0.22 * mGrow * sbOsc(0.0);
        float d = length(p - vec2(0.02, -0.01)) - rad;
        d += (sbSpeck() - 0.5) * 0.04 * p_degrade;
        col = mix(col, sbInk(1.0), sbFill(d));
        float lw = sbPx() * 1.3;
        for (int i = 0; i < 12; i++) {
          if (float(i) >= p_scribble) break;
          float fi = float(i);
          vec2 c = (sbR2(vec2(fi, 4.0)) - 0.5) * 0.35 * (1.0 + 0.2 * mGrow * sbOsc(0.0));
          vec2 ab = vec2(0.08 + 0.18 * sbR(vec2(fi, 5.0)), 0.03 + 0.08 * sbR(vec2(fi, 6.0)));
          // Spin: the scribbled loops wheel round, alternate ones backwards
          float spin = sbSpin(mSpin) * (mod(fi, 2.0) * 2.0 - 1.0) * 0.5;
          vec2 q = sbRot(sbR(vec2(fi, 7.0)) * SB_PI + spin) * (p - c);
          float e = (length(q / ab) - 1.0) * min(ab.x, ab.y);
          col = mix(col, sbInk(2.0), 1.0 - smoothstep(lw * 0.5, lw * 1.5, abs(e)));
        }
        float hop = sbHop(0.0, max(mSpin, sbMv(0.0)));
        for (int i = 0; i < 5; i++) {
          float fi = float(i);
          if (sbR(vec2(fi, 9.0)) > p_glitch) continue;
          vec2 c = (sbR2(vec2(fi, 10.0)) - 0.5) * sbAspect() * 0.85;
          vec2 hs = vec2(0.03 + 0.06 * sbR(vec2(fi, 11.0)), 0.04 + 0.08 * sbR(vec2(fi, 12.0)));
          if (abs(p.x - c.x) < hs.x && abs(p.y - c.y) < hs.y) {
            float bit = step(0.5, sbR(floor((p - c) / (sbPx() * 6.0)) + fi * 7.0 + hop * 3.1));
            col = mix(sbInk(3.0), sbInk(2.0), bit);
          }
        }
        return col;
      }
    `,
  },
  {
    id: 'sbSatellite',
    no: 16,
    name: 'Satellite',
    makes: 'corrupted orbital mosaics',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#211866', '#4628b0', '#7c5ad8', '#c8ff48', '#98ff5a', '#e6d0ff'],
    movements: ['Scan', 'Glitch', 'Drift'],
    params: [
      slider('scale', 'Scale', 2.5, 0.5, 6),
      slider('blocks', 'Blocks', 0.45, 0, 1),
      slider('pixels', 'Pixels', 0.5, 0, 1),
      slider('band', 'Top Band', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mScan = sbMv(0.0);
        float mGlitch = sbMv(1.0);
        vec2 q = sbDomainWarp(p * p_scale + sbDrift(sbMv(2.0)) * 1.2, 1.0);
        float f = sbField(sbStretch(sbFbm(q, 6.0), 2.0), uv);
        vec3 col = mix(sbInk(0.0), sbInk(1.0), smoothstep(0.2, 0.55, f));
        col = mix(col, sbInk(2.0), smoothstep(0.55, 0.85, f));
        col = mix(col, sbInk(5.0), smoothstep(0.85, 1.0, f) * 0.6);
        // Glitch: the corrupted blocks and pixels re-roll as it plays
        float hop = sbHop(0.0, mGlitch) * 3.7;
        vec2 bg = p * 9.0;
        vec2 bc = floor(bg);
        vec2 bf = fract(bg);
        float inBlock = step(1.0 - p_blocks * 0.22 - mGlitch * 0.08, sbR(bc + hop)) * step(0.08, bf.x) * step(bf.x, 0.92) * step(0.12, bf.y) * step(bf.y, 0.88);
        col = mix(col, sbInk(3.0 + mod(bc.x + bc.y, 2.0)), inBlock);
        vec2 pc = floor(p * 72.0);
        float pix = step(1.0 - p_pixels * 0.45, sbNoise(p * 5.0 + 20.0 + hop)) * step(0.55, sbR(pc + hop));
        col = mix(col, sbInk(3.0 + mod(pc.x, 2.0)), pix);
        // Scan: a read-out band sweeps down the image
        float span = sbAspect().y * 1.2;
        float scanY = (0.5 - fract(sbMarch(mScan))) * span;
        float inScan = (1.0 - smoothstep(0.0, 0.035, abs(p.y - scanY))) * step(0.001, mScan);
        col = mix(col, sbInk(3.0 + mod(floor(p.x * 48.0), 2.0)), inScan * step(0.35, sbR(vec2(floor(p.x * 48.0), floor(p.y * 90.0)))));
        float top = step(0.5 * sbAspect().y - 0.05 * p_band, p.y) * step(0.01, p_band);
        return mix(col, sbInk(4.0), top);
      }
    `,
  },
  {
    id: 'sbScorch',
    no: 17,
    name: 'Scorch',
    makes: 'torn thermal smears',
    kind: 'Grounds',
    imageReactive: true,
    dither: 0.4,
    inks: ['#163626', '#2c66ff', '#8a6bff', '#ff4fd8', '#e83cff'],
    movements: ['Tear', 'Smear', 'Churn'],
    params: [
      slider('scale', 'Scale', 2.0, 0.5, 6),
      slider('smear', 'Smear', 0.65, 0, 1),
      slider('tear', 'Tear', 0.45, 0, 1),
      slider('streaks', 'Streaks', 0.4, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mTear = sbMv(0.0);
        float row = floor(p.y * 90.0);
        // Tear: torn rows re-rip every frame
        float frame = sbFrame() * step(0.001, mTear);
        float torn = step(1.0 - (p_tear + mTear * 0.4) * 0.5, sbR(vec2(row, 5.5 + frame)));
        float off = (sbR(vec2(row, 1.7 + frame)) - 0.5) * 0.45 * torn;
        // Smear: the drag stretches out and snaps back
        float smear = clamp(p_smear + 0.35 * sbMv(1.0) * sbOsc(0.0), 0.0, 1.0);
        vec2 q = vec2((p.x + off) * mix(1.0, 0.12, smear), p.y) * p_scale;
        q = sbChurn(q, sbMv(2.0) * 1.5);
        q = sbDomainWarp(q, 0.6);
        float f = sbStretch(sbFbm(q, 5.0), 2.4);
        f = sbField(f, vec2(uv.x + off / sbAspect().x, uv.y));
        vec3 col = sbInkD(f);
        return mix(col, sbInk(uInkCount - 1.0), step(0.975, sbR(vec2(row, 9.0 + frame))) * p_streaks);
      }
    `,
  },
  {
    id: 'sbScrap',
    no: 18,
    name: 'Scrap',
    makes: 'cut riso scraps',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#7a5a1c', '#bfe9f2', '#8a4be0', '#e8e0c8', '#111111'],
    movements: ['Drift', 'Jump', 'Bleed'],
    params: [
      slider('scale', 'Scale', 4.5, 1, 10),
      slider('wobble', 'Wobble', 0.8, 0, 2),
      slider('outline', 'Outline', 0.6, 0, 1),
      slider('marks', 'Marks', 0.4, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mBleed = sbMv(2.0);
        // Bleed: the cut edges loosen and run, then tighten again
        float wob = p_wobble * (1.0 + 0.9 * mBleed * (0.5 + 0.5 * sbOsc(0.0)));
        vec2 q = sbDomainWarp(p * p_scale + sbDrift(sbMv(0.0)) * 1.2, wob);
        float f = sbField(sbStretch(sbFbm(q, 4.0), 2.4), uv);
        float n = max(uInkCount - 1.0, 1.0);
        float b = floor(clamp(f + sbDitherOffset() * uDither * 2.0 / n, 0.0, 0.9999) * n);
        // Jump: every scrap jumps to the next ink at once
        b = mod(b + sbHop(0.0, sbMv(1.0)), n);
        vec3 col = sbInk(b);
        float e = abs(fract(f * n) - 0.5);
        col = mix(col, sbInk(uInkCount - 1.0), smoothstep(0.5 - 0.07 * p_outline, 0.5, e) * step(0.01, p_outline));
        vec2 mg = p * 55.0;
        vec2 mc = floor(mg);
        vec2 mf = fract(mg) - 0.5;
        float pick = step(1.0 - p_marks * 0.22, sbR(mc));
        float seg = sbSegment(sbRot(sbR(mc + 0.5) * SB_PI + sbSpin(mBleed) * 0.5) * mf, vec2(-0.32, 0.0), vec2(0.32, 0.0));
        return mix(col, sbInk(uInkCount - 1.0), pick * (1.0 - smoothstep(0.06, 0.11, seg)));
      }
    `,
  },
  {
    id: 'sbScythe',
    no: 19,
    name: 'Scythe',
    makes: 'scattered crescent blades',
    kind: 'Grounds',
    inks: ['#e8f4e8', '#3d9a38', '#2a6b28'],
    movements: ['Spin', 'Scatter', 'Flicker'],
    params: [
      slider('blades', 'Blades', 16, 4, 40, 1),
      slider('size', 'Size', 0.5, 0, 1),
      slider('curve', 'Curve', 0.55, 0, 1),
      slider('specks', 'Specks', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        float mSpin = sbMv(0.0);
        float mScatter = sbMv(1.0);
        float mFlicker = sbMv(2.0);
        vec3 col = sbInk(0.0);
        for (int i = 0; i < 40; i++) {
          if (float(i) >= p_blades) break;
          float fi = float(i);
          // Flicker: blades drop out for a frame at a time
          if (sbFr(vec2(fi, 3.0)) < mFlicker * 0.4) continue;
          vec2 c = (sbR2(vec2(fi, 2.3)) - 0.5) * asp * 1.1;
          c += sbCirc(sbR(vec2(fi, 8.8))) * 0.07 * mScatter;
          float spinDir = sbR(vec2(fi, 1.1)) < 0.5 ? -1.0 : 1.0;
          float a = sbR(vec2(fi, 6.1)) * SB_TAU + sbSpin(mSpin) * spinDir;
          float s = mix(0.05, 0.17, p_size) * (0.6 + 0.8 * sbR(vec2(fi, 7.7)));
          vec2 q = sbRot(a) * (p - c) / s;
          // crescent: a unit disc with an offset disc bitten out of it
          float d1 = length(q) - 1.0;
          float d2 = length(q - vec2(0.0, mix(0.25, 0.85, p_curve))) - mix(0.85, 1.05, p_curve);
          float d = max(d1, -d2) * s;
          col = mix(col, sbInk(1.0 + mod(fi, max(uInkCount - 1.0, 1.0))), sbFill(d));
        }
        return mix(col, sbInk(1.0), step(1.0 - p_specks * 0.045, sbSpeck()));
      }
    `,
  },
  {
    id: 'sbSnowcast',
    no: 20,
    name: 'Snowcast',
    makes: 'TV-snow silhouettes',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#000000', '#ffffff', '#4f6bff', '#8a55ff', '#3ad8ff', '#d0ff55'],
    movements: ['Boil', 'Drift', 'Breathe'],
    params: [
      slider('snow', 'Snow', 0.8, 0, 1),
      slider('shape', 'Column', 0.5, 0, 1),
      slider('stripes', 'Swirls', 0.5, 0, 1),
      slider('color', 'Color', 0.7, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        float mDrift = sbMv(1.0);
        float mBreathe = sbMv(2.0);
        // the snow itself re-rolls on every frame whenever it is animating
        float sn = sbR(floor(gl_FragCoord.xy / sbDitherCell()) + sbFrame() * vec2(37.0, 11.0));
        float v = clamp((sn - 0.5) * (1.0 + p_snow * 4.0) + 0.5, 0.0, 1.0);
        // with Image up, the snow becomes a noise-dithered version of the photo
        v = mix(v, step(sn, sbSrc(uv)), uSource);
        vec2 bp = sbBoil(p, sbMv(0.0) * 2.2);
        float d = 10.0;
        for (int k = 0; k < 6; k++) {
          float fk = float(k);
          vec2 c = vec2(sin(fk * 1.7 + sbR(vec2(fk, 1.0)) * 6.0) * 0.08 * asp.x, (fk / 5.0 - 0.5) * asp.y * 0.95);
          c += sbCirc(fk * 0.17) * 0.06 * mDrift;
          float rad = (0.12 + 0.1 * sbR(vec2(fk, 2.0))) * (0.6 + p_shape) * (1.0 + 0.25 * mBreathe * sbOsc(fk * 0.13));
          float dk = length((bp - c) * vec2(1.0, 0.8)) - rad;
          float h = clamp(0.5 + 0.5 * (dk - d) / 0.08, 0.0, 1.0);
          d = mix(dk, d, h) - 0.08 * h * (1.0 - h);
        }
        float inShape = sbFill(d);
        float f = sbFbm(p * 2.5 + 4.0 + sbDrift(mDrift) * 0.5, 4.0);
        float region = smoothstep(0.55 - p_stripes * 0.15, 0.57 - p_stripes * 0.15, f);
        float stripe = step(0.5, fract((p.x + f * 0.6) * 34.0));
        float n = max(uInkCount - 2.0, 1.0);
        float k0 = mod(floor(f * 9.0), n);
        vec3 iri = mix(sbInk(2.0 + k0), sbInk(2.0 + mod(k0 + 1.0, n)), stripe);
        vec3 col = mix(sbInk(0.0), iri, region * p_color);
        return mix(col, mix(sbInk(0.0), sbInk(1.0), v), inShape);
      }
    `,
  },
  {
    id: 'sbSorbet',
    no: 21,
    name: 'Sorbet',
    makes: 'soft melting gradients',
    kind: 'Grounds',
    imageReactive: true,
    grain: 0.08,
    inks: ['#f0a0c4', '#ffd24a', '#ff7aa0', '#f6c89a', '#e86aa6'],
    movements: ['Drift', 'Churn', 'Breathe'],
    params: [
      slider('scale', 'Scale', 1.3, 0.3, 4),
      slider('warp', 'Warp', 1.6, 0, 3),
      slider('detail', 'Detail', 4, 1, 6, 1),
      slider('softness', 'Softness', 0.8, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 q = sbBreathe(p, sbMv(2.0)) * p_scale + sbDrift(sbMv(0.0)) * 1.2;
        q = sbChurn(q, sbMv(1.0) * 2.6);
        q = sbDomainWarp(q, p_warp);
        q = sbDomainWarp(q * 1.3, p_warp * 0.5);
        float f = sbStretch(sbFbm(q, p_detail), mix(4.0, 1.6, p_softness));
        f = sbField(f, uv);
        return mix(sbInkD(f), sbInkGrad(f), p_softness * (1.0 - uDither));
      }
    `,
  },
  {
    id: 'sbStrata',
    no: 22,
    name: 'Strata',
    makes: 'dithered contour strata',
    kind: 'Grounds',
    imageReactive: true,
    dither: 0.5,
    grain: 0.3,
    inks: ['#ff5ad8', '#a05aff', '#5fe0d0', '#f5f06a', '#7af07a', '#ff9fd0'],
    movements: ['Drift', 'Churn', 'Rise'],
    params: [
      slider('fieldScale', 'Field Scale', 2.6, 0.5, 6),
      slider('warp', 'Warp', 1.1, 0, 2),
      slider('detail', 'Detail', 5, 1, 7, 1),
      slider('contrast', 'Contrast', 1.7, 0.5, 3),
      slider('blockiness', 'Blockiness', 0, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 pp = p;
        if (p_blockiness > 0.001) {
          float cell = mix(0.003, 0.05, p_blockiness);
          pp = (floor(p / cell) + 0.5) * cell;
        }
        vec2 q = pp * p_fieldScale + sbDrift(sbMv(0.0)) * 1.2;
        q = sbChurn(q, sbMv(1.0) * 1.6);
        q = sbDomainWarp(q, p_warp);
        float f = sbStretch(sbFbm(q, p_detail), p_contrast);
        f = sbField(f, sbUv(pp));
        // Rise: the colour bands climb the contours and wrap round
        float mRise = sbMv(2.0);
        if (mRise > 0.0) f = fract(f - sbMarch(mRise));
        return sbInkD(f);
      }
    `,
  },
  {
    id: 'sbTarget',
    no: 23,
    name: 'Target',
    makes: 'ringed stripe fields',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#6c2a3a', '#5fe0a0', '#2f8a6a'],
    movements: ['Ripple', 'Rock', 'Wander'],
    params: [
      slider('stripes', 'Stripes', 22, 6, 60, 1),
      slider('rings', 'Rings', 2, 1, 5, 1),
      slider('offset', 'Offset', 0.3, 0, 1),
      slider('angle', 'Angle', 0, 0, 180, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 r = sbRot(radians(p_angle) + 0.6 * sbMv(1.0) * sbOsc(0.0)) * p;
        vec2 c = (sbR2(vec2(3.0, 1.0)) - 0.5) * p_offset * 0.6 + sbCirc(0.0) * 0.12 * sbMv(2.0);
        float k = 0.0;
        for (int i = 0; i < 5; i++) {
          if (float(i) >= p_rings) break;
          float fi = float(i);
          // Ripple: rings swell outward one after another
          float rad = 0.46 * (1.0 - fi / (p_rings + 0.6)) * (1.0 + 0.16 * sbMv(0.0) * sbOsc(-fi * 0.18));
          k += step(length(p - c * (fi + 1.0)), rad);
        }
        // each ring changes the stripe weight and flips which ink is the ground
        float duty = mix(0.5 + 0.32 * sin(k * 1.9 + 0.6), sbSrc(uv), uSource);
        float s = step(duty, fract(r.x * p_stripes));
        vec3 a = sbInk(0.0);
        vec3 b = sbInk(1.0 + mod(k, max(uInkCount - 1.0, 1.0)));
        return mod(k, 2.0) > 0.5 ? mix(b, a, s) : mix(a, b, s);
      }
    `,
  },
  {
    id: 'sbVigil',
    no: 24,
    name: 'Vigil',
    makes: 'glowing figures in haze',
    kind: 'Grounds',
    imageReactive: true,
    inks: ['#08140e', '#3fe08f', '#e3337a', '#86d6ff', '#ffffff'],
    movements: ['Sway', 'Pulse', 'Flicker'],
    params: [
      slider('figures', 'Figures', 20, 4, 40, 1),
      slider('size', 'Size', 0.49, 0, 1),
      slider('wobble', 'Wobble', 0.24, 0, 1),
      slider('blur', 'Blur', 0.52, 0, 1),
      slider('halo', 'Halo', 0.49, 0, 1),
      slider('rim', 'Dark Rim', 0.16, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        float mSway = sbMv(0.0);
        float mPulse = sbMv(1.0);
        float mFlicker = sbMv(2.0);
        float sz = mix(0.018, 0.07, p_size);
        float field = 0.0;
        for (int i = 0; i < 40; i++) {
          if (float(i) >= p_figures) break;
          float fi = float(i);
          // Flicker: figures blink out like failing bulbs
          if (sbFr(vec2(fi, 2.0)) < mFlicker * 0.4) continue;
          vec2 r = sbR2(vec2(fi, 3.7));
          float w = sz * (0.6 + 0.6 * sbR(vec2(fi, 1.3)));
          float h = w * (2.2 + 2.6 * sbR(vec2(fi, 9.1)));
          vec2 base = vec2((r.x - 0.5) * asp.x * 1.15, (r.y - 0.5) * asp.y * 1.3 - h * 0.4);
          vec2 q = p - base;
          // Sway: each figure leans from its feet on its own beat
          q.x -= mSway * 0.5 * max(q.y, 0.0) * sbOsc(sbR(vec2(fi, 4.4)));
          q.x += sin(q.y * 11.0 + fi * 2.1) * p_wobble * w * 0.9;
          float body = sbSegment(q, vec2(0.0), vec2(0.0, h)) - w;
          float head = length(q - vec2(0.0, h + w * 1.35)) - w * 0.8;
          float d = min(body, head);
          float spread = mix(0.2, 1.3, p_blur) * w + 0.002;
          // Pulse: each glow throbs brighter and dimmer
          float glow = 1.0 + 0.8 * mPulse * sbOsc(sbR(vec2(fi, 5.5)));
          field += glow / (1.0 + exp(min(d / (spread * 0.35), 30.0)));
        }
        float heat = 1.0 - exp(-field * mix(0.55, 1.5, p_halo));
        heat = sbField(heat, uv);
        vec3 col = mix(sbInkGrad(heat), sbInkD(heat), uDither);
        col *= 1.0 - p_rim * 0.85 * exp(-pow((heat - 0.42) / 0.035, 2.0));
        col = mix(col, sbInk(uInkCount - 1.0), step(0.988, sbSpeck()) * (1.0 - heat));
        return col;
      }
    `,
  },
]
