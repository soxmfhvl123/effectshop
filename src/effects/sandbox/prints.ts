import { select, slider } from './params'
import type { SandboxTool } from './types'

// Poster-style compositions. Movements are read as sbMv(0.0) / sbMv(1.0) /
// sbMv(2.0), in the order of `movements`.
export const PRINTS: SandboxTool[] = [
  {
    id: 'sbAster',
    no: 39,
    name: 'Aster',
    makes: 'radiating petal bursts',
    kind: 'Prints',
    inks: ['#d6ead0', '#5a2ab0', '#c8a03a', '#f2ecd8', '#8a5ad0'],
    movements: ['Twirl', 'Pulse', 'Breathe'],
    params: [
      slider('petals', 'Petals', 96, 20, 200, 1),
      slider('layers', 'Layers', 4, 1, 4, 1),
      slider('length', 'Length', 0.75, 0, 1),
      slider('taper', 'Taper', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mTwirl = sbMv(0.0);
        float mPulse = sbMv(1.0);
        vec2 c = (sbR2(vec2(4.0, 2.0)) - 0.5) * 0.12;
        vec2 q = sbBreathe(p - c, sbMv(2.0));
        float r = length(q);
        float a = atan(q.y, q.x) / SB_TAU + 0.5;
        vec3 col = sbInk(0.0);
        float n = max(uInkCount - 1.0, 1.0);
        // back to front: the longest, sparsest layer first
        for (int L = 0; L < 4; L++) {
          if (float(L) >= p_layers) break;
          float fl = float(L);
          float count = floor(p_petals * (1.0 - fl * 0.18));
          // Twirl: the layers turn against each other
          float rot = sbR(vec2(fl, 5.0)) + 0.06 * mTwirl * sbOsc(fl * 0.15) * (mod(fl, 2.0) * 2.0 - 1.0);
          float x = fract(a + rot) * count;
          float id = floor(x);
          float fx = fract(x) - 0.5;
          float len = (0.24 + 0.3 * p_length) * (0.72 + 0.28 * sbR(vec2(id, fl + 1.0))) * (1.0 - fl * 0.16);
          // Pulse: petals shoot out and draw back, each on its own beat
          len *= 1.0 + 0.25 * mPulse * sbOsc(sbR(vec2(id, fl + 3.0)));
          float t = clamp(r / len, 0.0, 1.0);
          float width = 0.49 * mix(1.0, 1.0 - t * 0.85, p_taper);
          float inPetal = step(abs(fx), width) * step(r, len) * step(0.015, r);
          vec3 pc = sbInk(1.0 + mod(id + fl * 2.0, n)) * (0.7 + 0.3 * t);
          col = mix(col, pc, inPetal);
        }
        // seed head
        col = mix(col, sbInk(2.0), step(r, 0.035) * step(0.35, sbSpeck()));
        return col;
      }
    `,
  },
  {
    id: 'sbBento',
    no: 40,
    name: 'Bento',
    makes: 'rounded modular boxes',
    kind: 'Prints',
    inks: ['#f5f07a', '#111111', '#9a8af0', '#f2e0b0', '#c0c8f0'],
    movements: ['Shuffle', 'Pulse', 'Cycle'],
    params: [
      slider('modules', 'Modules', 4, 2, 8, 1),
      slider('pixels', 'Pixels', 10, 4, 24, 1),
      slider('rounding', 'Rounding', 0.35, 0, 1),
      slider('gap', 'Gap', 0.15, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mPulse = sbMv(1.0);
        vec2 g = p * p_modules;
        vec2 c = floor(g);
        vec2 f = fract(g) - 0.5;
        float n = uInkCount;
        // Shuffle: boxes are re-packed one at a time
        float hop = sbHop(sbR(c + 6.1), sbMv(0.0)) * 3.9;
        float kind = floor(sbR(c + 0.4 + hop) * 4.0);
        // Pulse: corners soften and the gaps breathe
        float rounding = clamp(p_rounding + 0.45 * mPulse * sbOsc(sbR(c + 5.0)), 0.0, 1.0);
        float gap = clamp(p_gap + 0.35 * mPulse * sbOsc(sbR(c + 5.5) + 0.25), 0.0, 1.0);
        float d = sbRoundBox(f, vec2(0.5 - (0.01 + 0.08 * gap)), 0.45 * rounding);
        // Cycle: the whole palette steps round the boxes
        float cyc = floor(sbMarch(sbMv(2.0)) * n);
        vec3 a = sbInk(floor(sbR(c + 1.0 + hop) * n) + cyc);
        vec3 b = sbInk(floor(sbR(c + 2.0 + hop) * n) + cyc);
        vec2 sc = floor((f + 0.5) * p_pixels);
        vec3 col;
        if (kind < 0.5) col = a;
        else if (kind < 1.5) col = mix(a, b, f.y + 0.5);
        else if (kind < 2.5) col = mix(a, b, step(0.5, sbR(sc + c * 31.0 + hop)));
        else col = mix(a, b, step(sc.x + sc.y * 0.7, p_pixels * (0.6 + 0.4 * sbR(c + 3.0))));
        float px = sbPx() * p_modules;
        return mix(sbInk(1.0), col, 1.0 - smoothstep(-px, px, d));
      }
    `,
  },
  {
    id: 'sbCarnival',
    no: 41,
    name: 'Carnival',
    makes: 'fairground patch & orbit posters',
    kind: 'Prints',
    imageReactive: true,
    inks: ['#3a7af0', '#f0a03a', '#5ff07a', '#e03af0', '#ffffff', '#111111'],
    movements: ['Orbit', 'Drift', 'Twinkle'],
    params: [
      slider('cells', 'Pixels', 40, 12, 80, 1),
      slider('regions', 'Patch Scale', 2.2, 0.5, 6),
      slider('orbits', 'Orbits', 3, 0, 6, 1),
      slider('dots', 'Beads', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mOrbit = sbMv(0.0);
        float mTwinkle = sbMv(2.0);
        float cell = 1.0 / p_cells;
        vec2 pc = (floor(p / cell) + 0.5) * cell;
        float f = sbField(sbStretch(sbFbm(sbDomainWarp(pc * p_regions + sbDrift(sbMv(1.0)) * 1.2, 0.6), 4.0), 2.6), sbUv(pc));
        // the last two inks are reserved for the orbit lines and their beads
        float nreg = max(uInkCount - 2.0, 1.0);
        vec3 col = sbInk(floor(clamp(f, 0.0, 0.999) * nreg));
        float lineW = sbPx() * 2.0;
        float lines = 0.0;
        float beads = 0.0;
        float seg = SB_TAU / 7.0;
        for (int i = 0; i < 6; i++) {
          if (float(i) >= p_orbits) break;
          float fi = float(i);
          float ang = fi / max(p_orbits, 1.0) * SB_PI + sbR(vec2(fi, 2.0)) * 0.3 + 0.25 * mOrbit * sbOsc(fi * 0.2);
          vec2 q = sbRot(ang) * p;
          vec2 ab = vec2(0.32 + 0.08 * sbR(vec2(fi, 3.0)), 0.1 + 0.05 * sbR(vec2(fi, 4.0)));
          float d = (length(q / ab) - 1.0) * min(ab.x, ab.y);
          float dash = mix(1.0, step(mTwinkle * 0.5, sbFr(vec2(fi, floor((atan(q.y, q.x) + SB_PI) * 6.0)))), step(0.001, mTwinkle));
          lines = max(lines, (1.0 - smoothstep(lineW * 0.5, lineW, abs(d))) * dash);
          // Orbit: beads ride round their ellipse, alternate rings the other way
          float t = atan(q.y / ab.y, q.x / ab.x) + sbSpin(mOrbit) * (mod(fi, 2.0) * 2.0 - 1.0);
          float slot = floor(t / seg);
          float tb = (slot + 0.5) * seg;
          float tq = tb - sbSpin(mOrbit) * (mod(fi, 2.0) * 2.0 - 1.0);
          vec2 bp = vec2(cos(tq), sin(tq)) * ab;
          float on = step(1.0 - p_dots, sbR(vec2(fi, mod(slot, 7.0) + 5.0)));
          // Twinkle: beads wink like fairground bulbs
          on *= step(mTwinkle * 0.55, sbFr(vec2(fi, mod(slot, 7.0))));
          beads = max(beads, step(length(q - bp), 0.012 + 0.012 * mTwinkle * sbFr(vec2(fi, mod(slot, 7.0) + 20.0))) * on);
        }
        col = mix(col, sbInk(uInkCount - 2.0), lines);
        return mix(col, sbInk(uInkCount - 1.0), beads);
      }
    `,
  },
  {
    id: 'sbFlyer',
    no: 42,
    name: 'Flyer',
    makes: 'typographic street flyers',
    kind: 'Prints',
    inks: ['#111111', '#ff7a3a', '#b6ff3a', '#c43cff', '#3a7a3a', '#f2f2f2'],
    movements: ['Shuffle', 'Ripple', 'Cycle'],
    params: [
      slider('stripes', 'Stripes', 14, 4, 40, 1),
      slider('arcs', 'Arcs', 8, 2, 20, 1),
      slider('panels', 'Panels', 3, 0, 6, 1),
      slider('glyphs', 'Type', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      // A character that re-types itself: while animating, a share of cells
      // (more under Shuffle) pick a fresh character on any given frame.
      float flyerChar(vec2 cellId, float seed, float rate, float count) {
        float id = floor(sbR(cellId + seed) * count);
        if (sbFr(cellId + seed) < rate) id = floor(sbFr(cellId + seed + 0.5) * count);
        return id;
      }
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        float mShuffle = sbMv(0.0);
        float mRipple = sbMv(1.0);
        float mCycle = sbMv(2.0);
        float rate = uAnimate * 0.12 + mShuffle * 0.75;
        float n = uInkCount;
        float cyc = sbHop(0.0, mCycle);
        float split = (0.4 + 0.2 * sbR(vec2(1.0, 1.0)) - 0.5) * asp.x;
        vec3 col;
        if (p.x < split) {
          vec2 corner = vec2(-0.5 * asp.x, 0.5 * asp.y - 0.15);
          // Ripple: the arcs radiate out of the corner
          float k = floor(length(p - corner) * p_arcs - sbMarch(mRipple)) - cyc;
          col = sbInk(1.0 + mod(k, n - 1.0));
        } else {
          float k = floor((p.x - split) * p_stripes * 2.0) + cyc + floor(sbMarch(mRipple) * (n - 1.0));
          col = sbInk(1.0 + mod(k * 3.0, n - 1.0));
        }
        // Shuffle also jumps the pasted-on panels around
        float hopP = sbHop(0.0, mShuffle * 0.5) * 2.3;
        for (int i = 0; i < 6; i++) {
          if (float(i) >= p_panels) break;
          float fi = float(i);
          vec2 c = (sbR2(vec2(fi, 3.0 + hopP)) - 0.5) * asp * 0.8;
          vec2 hs = vec2(0.08 + 0.15 * sbR(vec2(fi, 4.0 + hopP)), 0.06 + 0.12 * sbR(vec2(fi, 5.0 + hopP)));
          vec2 d = abs(p - c);
          if (d.x < hs.x && d.y < hs.y) {
            vec2 g = (p - c + hs) * 70.0;
            if (mod(fi, 3.0) < 0.5) {
              float dotr = length(fract(g * 0.5) - 0.5);
              col = mix(sbInk(0.0), sbInk(n - 1.0), step(dotr, 0.25 + 0.2 * (p.y - c.y) / hs.y));
            } else {
              vec2 gc = floor(g);
              float gl = sbGlyph(fract(g), flyerChar(gc, fi * 11.0, rate, 50.0)) * step(1.0 - p_glyphs, sbR(gc + 1.0));
              col = mix(sbInk(0.0), sbInk(n - 1.0), gl);
            }
          }
        }
        vec2 g2 = p * 50.0;
        vec2 c2 = floor(g2);
        float m = sbGlyph(fract(g2), flyerChar(c2, 7.0, rate, 40.0)) * step(1.0 - p_glyphs * 0.12, sbR(c2 + 9.0));
        return mix(col, sbInk(0.0), m);
      }
    `,
  },
  {
    id: 'sbInversion',
    no: 43,
    name: 'Inversion',
    makes: 'counterchanged stripe posters',
    kind: 'Prints',
    imageReactive: true,
    inks: ['#6a2a9a', '#9ae05a'],
    movements: ['Turn', 'Pulse', 'March'],
    params: [
      slider('stripes', 'Stripes', 20, 6, 60, 1),
      slider('shapes', 'Shapes', 3, 1, 5, 1),
      select('turn', 'Turn', ['Diagonal', 'Square']),
      slider('weight', 'Weight', 0.5, 0.05, 0.95),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float k = 0.0;
        for (int i = 0; i < 5; i++) {
          if (float(i) >= p_shapes) break;
          float fi = float(i);
          vec2 c = (sbR2(vec2(fi, 1.0)) - 0.5) * 0.5;
          // Pulse: the shapes grow and shrink out of step
          float rad = (0.12 + 0.28 * sbR(vec2(fi, 2.0))) * (1.0 + 0.22 * sbMv(1.0) * sbOsc(fi * 0.23));
          float isBox = step(0.6, sbR(vec2(fi, 3.0)));
          float d = mix(length(p - c) - rad, sbBox(p - c, vec2(rad)), isBox);
          k += step(d, 0.0);
        }
        // every nesting level turns the stripes and swaps the two inks;
        // Turn rocks each level by a different amount
        float ang = k * (p_turn < 0.5 ? SB_PI / 4.0 : SB_PI / 2.0) + 0.5 * sbMv(0.0) * sbOsc(k * 0.12);
        vec2 q = sbRot(ang) * p;
        float duty = mix(p_weight, sbSrc(uv), uSource);
        // March: stripes run, every other level the opposite way
        float s = step(duty, fract(q.y * p_stripes + sbMarch(sbMv(2.0)) * (mod(k, 2.0) * 2.0 - 1.0)));
        s = abs(s - mod(k, 2.0));
        return mix(sbInk(0.0), sbInk(1.0), s);
      }
    `,
  },
  {
    id: 'sbMimeo',
    no: 44,
    name: 'Mimeo',
    makes: 'torn misprint collages',
    kind: 'Prints',
    inks: ['#b6ff3a', '#ff4a2a', '#1a1a3a', '#f2f0e0', '#ff4fd8'],
    movements: ['Jitter', 'Drift', 'Boil'],
    params: [
      slider('shapes', 'Shapes', 6, 2, 10, 1),
      slider('tear', 'Tear', 0.5, 0, 1),
      slider('scribble', 'Scribble', 0.5, 0, 1),
      slider('misregister', 'Misregister', 0.35, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 mimeoLayers(vec2 p) {
        vec3 col = sbInk(0.0);
        vec2 asp = sbAspect();
        float n = max(uInkCount - 1.0, 1.0);
        // Boil: the torn edges re-tear every frame
        float boil = sbFrame() * step(0.001, sbMv(2.0)) * 0.37;
        for (int i = 0; i < 10; i++) {
          if (float(i) >= p_shapes) break;
          float fi = float(i);
          vec2 c = (sbR2(vec2(fi, 2.0)) - 0.5) * asp + sbCirc(fi * 0.13) * 0.05 * sbMv(1.0);
          float kind = floor(sbR(vec2(fi, 3.0)) * 3.0);
          vec2 q = p - c;
          float d;
          if (kind < 0.5) d = length(q) - (0.1 + 0.18 * sbR(vec2(fi, 4.0)));
          else if (kind < 1.5) d = sbBox(q, vec2(0.15 + 0.3 * sbR(vec2(fi, 5.0)), 0.03 + 0.08 * sbR(vec2(fi, 6.0))));
          else d = max(abs(q.y - abs(fract(q.x * 12.0) - 0.5) * 0.06) - 0.025, abs(q.x) - 0.3);
          // torn edges: two octaves of noise pushed into the shape's boundary
          float tear = p_tear + sbMv(2.0) * 0.4;
          d += (sbNoise(p * 60.0 + fi + boil) - 0.5) * 0.02 * tear + (sbNoise(p * 12.0 + fi + boil) - 0.5) * 0.03 * tear;
          col = mix(col, sbInk(1.0 + mod(fi, n)), step(d, 0.0));
        }
        return col;
      }
      vec3 sbMain(vec2 p, vec2 uv) {
        // Jitter: the second plate slips out of register every frame
        vec2 jit = (vec2(sbFr(vec2(1.0, 2.0)), sbFr(vec2(3.0, 4.0))) - 0.5) * 0.06 * sbMv(0.0);
        vec2 off = vec2(0.006, -0.004) * p_misregister + jit;
        vec3 a = mimeoLayers(p);
        vec3 b = mimeoLayers(p + off);
        vec3 col = vec3(a.r, mix(a.g, b.g, 0.5), b.b);
        float s = 0.0;
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          float y = sin(p.x * (6.0 + 6.0 * sbR(vec2(fi, 8.0))) + fi * 2.0 + sbSpin(sbMv(1.0))) * 0.12 + (sbR(vec2(fi, 9.0)) - 0.5) * 0.6;
          s = max(s, 1.0 - smoothstep(0.0, sbPx() * 1.5, abs(p.y - y + 0.03 * sin(p.x * 40.0 + fi))));
        }
        col = mix(col, vec3(0.02), s * p_scribble);
        return mix(col, sbInk(3.0), step(0.97, sbSpeck()) * 0.6);
      }
    `,
  },
  {
    id: 'sbMonolith',
    no: 45,
    name: 'Monolith',
    makes: 'single pixel-mass posters',
    kind: 'Prints',
    imageReactive: true,
    inks: ['#e0d4d4', '#f0306a', '#111111'],
    movements: ['Breathe', 'Churn', 'Rules'],
    params: [
      slider('cells', 'Pixels', 24, 8, 60, 1),
      slider('fill', 'Fill', 0.5, 0, 1),
      slider('lines', 'Rules', 4, 0, 8, 1),
      slider('scale', 'Scale', 1.6, 0.5, 5),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mRules = sbMv(2.0);
        float cell = 1.0 / p_cells;
        vec2 pc = (floor(p / cell) + 0.5) * cell;
        // noise biased toward one central mass, so it reads as a single block
        vec2 fq = sbChurn(pc * p_scale + 4.0, sbMv(1.0) * 3.0);
        // Breathe: the mass swells and shrinks
        float f = sbFbm(fq, 3.0) + (0.25 - length(pc) * 0.5) + 0.14 * sbMv(0.0) * sbOsc(0.0);
        f = sbField(f, sbUv(pc));
        vec3 col = mix(sbInk(0.0), sbInk(1.0), step(mix(0.95, 0.45, p_fill), f));
        for (int i = 0; i < 8; i++) {
          if (float(i) >= p_lines) break;
          float fi = float(i);
          float vertical = step(0.5, sbR(vec2(fi, 1.0)));
          // Rules: the hairlines slide along and across the sheet
          float pos = (sbR(vec2(fi, 2.0)) - 0.5) * 0.8 + 0.18 * mRules * sbOsc(fi * 0.21);
          float a0 = (sbR(vec2(fi, 3.0)) - 0.5) * 0.8 + 0.25 * mRules * sbOsc(fi * 0.21 + 0.25);
          float a1 = a0 + 0.1 + 0.4 * sbR(vec2(fi, 4.0));
          vec2 q = vertical > 0.5 ? p.yx : p;
          float line = step(abs(q.y - pos), sbPx() * 1.2) * step(a0, q.x) * step(q.x, a1);
          col = mix(col, sbInk(2.0), line);
        }
        return col;
      }
    `,
  },
  {
    id: 'sbPennant',
    no: 46,
    name: 'Pennant',
    makes: 'mirrored pixel banners',
    kind: 'Prints',
    inks: ['#3a9af0', '#3a8a5a', '#111111', '#ff5a8a', '#f2c0d0', '#8a5aff'],
    movements: ['Rise', 'Shuffle', 'Pulse'],
    params: [
      slider('width', 'Width', 0.55, 0, 1),
      slider('segments', 'Segments', 7, 3, 12, 1),
      slider('cells', 'Pixels', 40, 16, 80, 1),
      slider('frame', 'Frame', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        float cell = 1.0 / p_cells;
        vec2 cid = floor(p / cell);
        vec2 pc = (cid + 0.5) * cell;
        vec3 col = sbInk(0.0);
        col = mix(col, sbInk(1.0), step(0.62, sbNoise(pc * 8.0)) * step(0.5, sbR(cid)));
        // Pulse: the banner swells and narrows
        float hw = (0.12 + 0.2 * p_width) * (1.0 + 0.18 * sbMv(2.0) * sbOsc(0.0));
        float hh = 0.42 * asp.y;
        float fw = cell * (1.0 + 2.0 * p_frame);
        vec2 b = vec2(abs(pc.x), pc.y);
        if (b.x < hw + fw && abs(pc.y) < hh + fw) col = sbInk(2.0);
        if (b.x < hw && abs(pc.y) < hh) {
          float yy = (pc.y + hh) / (2.0 * hh);
          // Rise: segments climb the banner a whole segment per cycle
          float sy = yy * p_segments - sbMarch(sbMv(0.0));
          float seg = floor(sy);
          // Shuffle: segments swap motifs
          float hop = sbHop(sbR(vec2(seg, 2.2)), sbMv(1.0)) * 3.1;
          float kind = floor(sbR(vec2(seg + hop, 1.0)) * 5.0);
          // b.x is mirrored, so every motif is symmetrical about the banner's spine
          vec2 lc = floor(vec2(b.x, pc.y) / cell);
          float m;
          if (kind < 0.5) m = mod(lc.x + lc.y, 2.0);
          else if (kind < 1.5) m = mod(lc.y, 2.0);
          else if (kind < 2.5) m = step(mod(lc.x + lc.y, 4.0), 1.5);
          else if (kind < 3.5) m = step(abs(mod(lc.x, 6.0) - 3.0) + abs(mod(lc.y, 6.0) - 3.0), 2.5);
          else m = step(0.5, sbR(vec2(lc.x, lc.y + seg * 31.0)));
          float n = max(uInkCount - 3.0, 1.0);
          col = mix(sbInk(3.0 + mod(seg, n)), sbInk(3.0 + mod(seg + 1.0, n)), m);
          if (fract(sy) < 0.06) col = sbInk(2.0);
        }
        return col;
      }
    `,
  },
  {
    id: 'sbProof',
    no: 47,
    name: 'Proof',
    makes: 'type-proof sheets',
    kind: 'Prints',
    imageReactive: true,
    inks: ['#f4efe4', '#d6d0c4', '#e03af0', '#d8f03a', '#5ff0c0', '#5a2ab0'],
    movements: ['Typeset', 'Churn', 'Flicker'],
    params: [
      slider('columns', 'Columns', 5, 2, 10, 1),
      slider('rows', 'Rows', 7, 2, 12, 1),
      slider('fill', 'Fill', 0.3, 0, 1),
      slider('warp', 'Warp', 0.8, 0, 2),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mType = sbMv(0.0);
        vec2 grid = vec2(p_columns, p_rows);
        vec2 g = uv * grid;
        vec2 c = floor(g);
        vec2 f = fract(g);
        vec3 col = sbInk(0.0);
        vec2 cellPx = grid / uResolution;
        col = mix(col, sbInk(1.0), clamp(step(f.x, cellPx.x * 1.5) + step(f.y, cellPx.y * 1.5), 0.0, 1.0));
        // a run of filled cells in reading order, like a specimen line being set
        float bandRow = floor(sbR(vec2(1.0, 2.0)) * p_rows);
        float span = floor(p_fill * p_columns * p_rows);
        // Typeset: the run is set cell by cell, then the sheet is reset
        span = floor(span * (1.0 - mType + mType * sbPhase()) + 0.999);
        float idx = (p_rows - 1.0 - c.y) * p_columns + c.x;
        float start = bandRow * p_columns;
        if (idx >= start && idx < start + span) {
          vec2 q = sbDomainWarp(sbChurn(uv * 3.0 + c, sbMv(1.0) * 3.0), p_warp);
          float v = sbFbm(q, 4.0);
          float n = max(uInkCount - 2.0, 1.0);
          vec3 fc = sbInk(2.0 + floor(clamp(sbStretch(v, 2.5), 0.0, 0.999) * n));
          // Flicker: cells flip between the colour field and the dot screen
          float dotted = step(0.6, sbR(c));
          if (sbFr(c) < sbMv(2.0) * 0.4) dotted = 1.0 - dotted;
          if (dotted > 0.5) fc = mix(sbInk(2.0), sbInk(uInkCount - 1.0), step(length(fract(uv * 120.0) - 0.5), 0.3));
          // with Image up, the photo shows through the set cells
          col = mix(fc, texture2D(tDiffuse, uv).rgb, uSource);
        }
        // the blinking cursor sits on the next cell to be set
        float cursor = step(abs(idx - (start + span)), 0.5) * step(0.5, fract(sbPhase() * 6.0)) * step(0.001, mType);
        return mix(col, sbInk(uInkCount - 1.0), cursor * step(f.x, 0.12) * step(0.15, f.y) * step(f.y, 0.85));
      }
    `,
  },
  {
    id: 'sbSignal',
    no: 48,
    name: 'Signal',
    makes: 'glitched pixel posters',
    kind: 'Prints',
    imageReactive: true,
    inks: ['#5a1a4a', '#5ff0d8'],
    movements: ['Glitch', 'Scan', 'Drift'],
    params: [
      slider('cells', 'Pixels', 34, 8, 80, 1),
      slider('scale', 'Scale', 3.0, 0.5, 8),
      slider('glitch', 'Glitch', 0.5, 0, 1),
      slider('streaks', 'Streaks', 0.4, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mGlitch = sbMv(0.0);
        float mScan = sbMv(1.0);
        float cell = 1.0 / p_cells;
        vec2 c = floor(p / cell);
        // Glitch: row shifts re-roll on every frame
        float frame = sbFrame() * step(0.001, mGlitch);
        float rowShift = step(1.0 - (p_glitch + mGlitch * 0.3) * 0.6, sbR(vec2(c.y, 1.0 + frame))) * floor((sbR(vec2(c.y, 2.0 + frame)) - 0.5) * 12.0);
        vec2 cs = vec2(c.x + rowShift, c.y);
        float f = sbNoise(cs * cell * p_scale + sbDrift(sbMv(2.0)) * 2.0) * 0.7 + sbR(cs) * 0.3;
        f = sbField(f, sbUv((c + 0.5) * cell));
        float on = step(0.5, f);
        float topRow = step(0.28 * sbAspect().y, (c.y + 0.5) * cell);
        float streakRow = step(sbR(vec2(c.y, 9.0)), p_streaks) * topRow;
        on = mix(on, step(mod(c.x + c.y, 4.0), 1.5), streakRow);
        // Scan: an inverted band rolls up the poster
        float rows = sbAspect().y * p_cells;
        float scanRow = floor((fract(sbMarch(mScan)) - 0.5) * rows);
        float inScan = step(abs(c.y - scanRow), 1.5 + 2.0 * mScan) * step(0.001, mScan);
        on = mix(on, 1.0 - on, inScan);
        return mix(sbInk(0.0), sbInk(1.0 + mod(floor(sbR(cs + 3.0) * 2.0), max(uInkCount - 1.0, 1.0))), on);
      }
    `,
  },
]
