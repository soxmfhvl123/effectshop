import { select, slider, toggle } from './params'
import type { SandboxTool } from './types'

// Repeating patterns (and the one badge-grid "Emblems" tool). Movements are
// read as sbMv(0.0) / sbMv(1.0) / sbMv(2.0), in the order of `movements`.
export const REPEATS: SandboxTool[] = [
  {
    id: 'sbChevron',
    no: 25,
    name: 'Chevron',
    makes: 'mirrored chevron stripes',
    kind: 'Repeats',
    imageReactive: true,
    inks: ['#f4ece0', '#c4602a'],
    movements: ['March', 'Pulse', 'Rock'],
    params: [
      slider('stripes', 'Stripes', 22, 4, 60, 1),
      select('mode', 'Shape', ['Diamond', 'Chevron', 'Bowtie']),
      slider('weight', 'Weight', 0.5, 0.05, 0.95),
      slider('rotate', 'Rotate', 0, 0, 90, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mPulse = sbMv(1.0);
        vec2 r = sbRot(radians(p_rotate) + 0.5 * sbMv(2.0) * sbOsc(0.0)) * p;
        vec2 q = abs(r);
        float d;
        if (p_mode < 0.5) d = q.x + q.y;
        else if (p_mode < 1.5) d = q.x + r.y;
        else d = abs(q.x - q.y);
        // March: the stripes stream out from the centre line
        d -= sbMarch(sbMv(0.0)) / p_stripes;
        float duty = mix(p_weight, sbSrc(uv), uSource);
        // Pulse: a swell of stripe weight rolls outward
        duty = clamp(duty + 0.3 * mPulse * sin(SB_TAU * (sbMarch(mPulse) - d * 2.0)), 0.05, 0.95);
        float s = step(duty, fract(d * p_stripes));
        float k = floor(d * p_stripes);
        return mix(sbInk(0.0), sbInk(1.0 + mod(k, max(uInkCount - 1.0, 1.0))), s);
      }
    `,
  },
  {
    id: 'sbChintz',
    no: 26,
    name: 'Chintz',
    makes: 'line-drawn floral repeats',
    kind: 'Repeats',
    inks: ['#cfe3f5', '#1f2a6e', '#9ec3e8'],
    movements: ['Sway', 'Bloom', 'Boil'],
    params: [
      slider('tiles', 'Repeat', 2.5, 1, 6),
      slider('flowers', 'Flowers', 3, 1, 6, 1),
      slider('line', 'Line Weight', 0.4, 0, 1),
      slider('fill', 'Leaf Fill', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mSway = sbMv(0.0);
        float mBloom = sbMv(1.0);
        // Boil: the pen line redraws itself a hair differently every frame
        vec2 t = fract(sbBoil(p, sbMv(2.0) * 1.2) * p_tiles) - 0.5;
        float px = sbPx() * p_tiles;
        float lw = mix(0.6, 2.5, p_line) * px;
        float lines = 0.0;
        float centers = 0.0;
        float leaves = 0.0;
        for (int i = 0; i < 6; i++) {
          if (float(i) >= p_flowers) break;
          float fi = float(i);
          vec2 c = sbR2(vec2(fi, 5.0)) - 0.5;
          // Bloom: heads open and close, each in its own time
          float R = (0.1 + 0.1 * sbR(vec2(fi, 9.0))) * (1.0 + 0.3 * mBloom * sbOsc(fi * 0.27));
          float petals = 5.0 + floor(sbR(vec2(fi, 3.0)) * 4.0);
          float ringOn = step(0.5, sbR(vec2(fi, 4.0)));
          // Sway: flowers nod and their leaves swing
          float nod = 0.5 * mSway * sbOsc(fi * 0.19);
          float la = sbR(vec2(fi, 6.0)) * SB_TAU + nod * 1.6;
          // 3x3 neighbourhood so motifs wrap seamlessly across tile edges
          for (int ox = -1; ox <= 1; ox++) {
            for (int oy = -1; oy <= 1; oy++) {
              vec2 q = sbRot(nod) * (t - c - vec2(float(ox), float(oy)));
              float ang = atan(q.y, q.x);
              float rr = R * (0.65 + 0.35 * abs(cos(ang * petals * 0.5)));
              lines = max(lines, 1.0 - smoothstep(lw * 0.5, lw * 0.5 + px, abs(length(q) - rr)));
              centers = max(centers, 1.0 - smoothstep(0.0, px, length(q) - R * 0.22));
              lines = max(lines, ringOn * (1.0 - smoothstep(lw * 0.5, lw * 0.5 + px, abs(length(q) - R * 1.4))));
              vec2 lq = sbRot(la) * (q - vec2(cos(la), sin(la)) * R * 1.9);
              float leaf = max(length(lq - vec2(0.0, -0.045)) - 0.07, length(lq + vec2(0.0, -0.045)) - 0.07);
              leaves = max(leaves, 1.0 - smoothstep(0.0, px, leaf));
              lines = max(lines, 1.0 - smoothstep(lw * 0.5, lw * 0.5 + px, abs(leaf)));
            }
          }
        }
        vec3 col = mix(sbInk(0.0), sbInk(2.0), leaves * p_fill);
        return mix(col, sbInk(1.0), max(lines, centers));
      }
    `,
  },
  {
    id: 'sbCodex',
    no: 27,
    name: 'Codex',
    makes: 'glyph river grids',
    kind: 'Repeats',
    imageReactive: true,
    inks: ['#16160a', '#b4ff3a', '#c43cff', '#f2f2f2'],
    movements: ['Meander', 'Shuffle', 'Flicker'],
    params: [
      slider('cells', 'Cells', 42, 16, 90, 1),
      slider('band', 'Band Width', 0.35, 0, 1),
      slider('meander', 'Meander', 0.5, 0, 1),
      slider('density', 'Density', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mFlicker = sbMv(2.0);
        vec2 g = p * p_cells;
        vec2 c = floor(g);
        vec2 f = fract(g);
        vec2 cc = (c + 0.5) / p_cells;
        // Meander: the river snakes down the page
        float amp = 0.36 * max(p_meander, 0.3 * sbMv(0.0));
        float x0 = sin(cc.y * mix(2.0, 9.0, p_meander) + sbR(vec2(1.0, 1.0)) * SB_TAU + sbSpin(sbMv(0.0))) * amp;
        float inBand = step(abs(cc.x - x0), mix(0.05, 0.3, p_band));
        // with Image up, the band follows the photo's darks instead
        inBand = step(0.5, mix(inBand, 1.0 - sbSrc(sbUv(cc)), uSource));
        // Shuffle: characters re-type themselves one by one
        float hop = sbHop(sbR(c + 2.2), sbMv(1.0)) * 3.3;
        float gl = sbGlyph(f, floor(sbR(c + hop) * 97.0));
        vec3 bandCol = mix(sbInk(2.0), sbInk(0.0), gl);
        float on = gl * step(1.0 - p_density, sbR(c + 5.0)) * step(mFlicker * 0.3, sbFr(c + 1.0));
        vec3 outCol = mix(sbInk(0.0), sbInk(1.0), on);
        // Flicker: highlighted characters flash on and off
        float hi = mix(step(0.985, sbR(c + 9.0)), step(0.985 - mFlicker * 0.06, sbFr(c + 9.0)), step(0.001, mFlicker));
        outCol = mix(outCol, sbInk(3.0), gl * hi);
        return mix(outCol, bandCol, inBand);
      }
    `,
  },
  {
    id: 'sbEddy',
    no: 28,
    name: 'Eddy',
    makes: 'warped op-art rings',
    kind: 'Repeats',
    imageReactive: true,
    inks: ['#0b0b0b', '#7af0c0'],
    movements: ['Flow', 'Turn', 'Breathe'],
    params: [
      slider('stripes', 'Stripes', 26, 6, 60, 1),
      slider('warp', 'Warp', 1.0, 0, 2),
      slider('center', 'Off-center', 0.5, 0, 1),
      slider('sharp', 'Sharpness', 0.85, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 c = (sbR2(vec2(2.0, 7.0)) - 0.5) * sbAspect() * p_center;
        // Turn: the distortion rocks around the centre
        float w = sbFbm(sbTurn(p, sbMv(1.0) * 1.4) * 1.6, 4.0) - 0.5;
        float d = length((sbBreathe(p, sbMv(2.0)) - c) * vec2(1.0, 1.3)) + w * p_warp * 0.6;
        // Flow: rings pour outward from the eye
        float v = d * p_stripes - sbMarch(sbMv(0.0));
        float s = fract(v);
        // the photo's tones thicken / thin the stripes, op-art halftone style
        float duty = mix(0.5, sbSrc(uv), uSource);
        float edge = mix(0.25, 0.01, p_sharp);
        float m = smoothstep(duty - edge, duty + edge, s);
        float k = floor(v);
        return mix(sbInk(0.0), sbInk(1.0 + mod(k, max(uInkCount - 1.0, 1.0))), m);
      }
    `,
  },
  {
    id: 'sbIsocube',
    no: 29,
    name: 'Isocube',
    makes: 'tumbling block lattices',
    kind: 'Repeats',
    imageReactive: true,
    inks: ['#3a7af0', '#5fb0f0', '#2f6e4a', '#5fc09a', '#8a7af0', '#e0704a'],
    movements: ['Tumble', 'Light', 'Shuffle'],
    params: [
      slider('scale', 'Scale', 7, 2, 20, 0.5),
      slider('accent', 'Accent', 0.12, 0, 1),
      slider('shade', 'Shade', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec4 isoHex(vec2 p) {
        vec2 s = vec2(1.0, 1.7320508);
        vec2 a = mod(p, s) - s * 0.5;
        vec2 b = mod(p - s * 0.5, s) - s * 0.5;
        vec2 gv = dot(a, a) < dot(b, b) ? a : b;
        return vec4(gv, p - gv);
      }
      vec3 sbMain(vec2 p, vec2 uv) {
        float mLight = sbMv(1.0);
        vec4 h = isoHex(p * p_scale);
        vec2 gv = h.xy;
        vec2 id = floor(h.zw * 2.0 + 0.5);
        float ang = atan(gv.y, gv.x);
        // the three rhombi of each hexagon read as the top / left / right faces of a cube
        float face = (ang > SB_PI / 6.0 && ang < 5.0 * SB_PI / 6.0) ? 0.0 : ((ang >= 5.0 * SB_PI / 6.0 || ang < -SB_PI / 2.0) ? 1.0 : 2.0);
        // Tumble: cubes flip over, which reads as their faces trading shades
        face = mod(face + sbHop(sbR(id + 7.7), sbMv(0.0)), 3.0);
        float n = uInkCount;
        // Shuffle: blocks change colour one at a time
        float hop = sbHop(sbR(id + 8.8), sbMv(2.0)) * 4.1;
        float r = sbField(sbR(id + hop), sbUv(h.zw / p_scale));
        float fam = floor(clamp(r, 0.0, 0.999) * max(n - 1.0, 1.0));
        if (sbR(id + 5.0 + hop) < p_accent) fam = n - 1.0;
        // Light: a lamp circles the lattice
        float base = face < 0.5 ? 0.0 : (face < 1.5 ? 0.3 : 0.6);
        float lit = 0.3 * (1.0 - cos(face * SB_TAU / 3.0 + sbSpin(mLight)));
        float sh = 1.0 - p_shade * mix(base, lit, step(0.001, mLight));
        return sbInk(fam) * sh;
      }
    `,
  },
  {
    id: 'sbKaleido',
    no: 30,
    name: 'Kaleido',
    makes: 'folded pixel kaleidoscopes',
    kind: 'Repeats',
    imageReactive: true,
    dither: 0.3,
    inks: ['#111111', '#ff8a2a', '#5fd8ff', '#2a5aff', '#f2f2f2'],
    movements: ['Spin', 'Breathe', 'Churn'],
    params: [
      slider('cells', 'Pixels', 44, 12, 100, 1),
      select('folds', 'Folds', ['Mirror', 'Quad', 'Octo'], 'Quad'),
      slider('scale', 'Scale', 2.4, 0.5, 6),
      slider('checker', 'Checker', 0.35, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float cell = 1.0 / p_cells;
        vec2 q = (floor(p / cell) + 0.5) * cell;
        // Spin turns the scene inside the mirrors; the pixel grid stays put
        q = sbBreathe(sbRot(sbSpin(sbMv(0.0))) * q, sbMv(1.0));
        q.x = abs(q.x);
        if (p_folds > 0.5) q.y = abs(q.y);
        if (p_folds > 1.5 && q.y > q.x) q = q.yx;
        vec2 qc = floor(q / cell);
        q = (qc + 0.5) * cell;
        float f = sbField(sbStretch(sbFbm(sbChurn(q * p_scale, sbMv(2.0) * 1.5), 4.0), 2.6), sbUv(q));
        vec3 col = sbInkDCell(f, qc);
        float chk = mod(qc.x + qc.y, 2.0);
        float region = step(1.0 - p_checker * 0.5, sbNoise(q * p_scale * 3.0 + 9.0));
        return mix(col, mix(sbInk(0.0), sbInk(uInkCount - 1.0), chk), region);
      }
    `,
  },
  {
    id: 'sbKilim',
    no: 31,
    name: 'Kilim',
    makes: 'woven diamond pixels',
    kind: 'Repeats',
    imageReactive: true,
    inks: ['#fbf6f0', '#e8402a', '#f08a2a', '#c42a2a'],
    movements: ['Climb', 'Twinkle', 'Pulse'],
    params: [
      slider('cells', 'Pixels', 34, 12, 80, 1),
      slider('period', 'Period', 8, 3, 16, 1),
      toggle('mirror', 'Mirror', true),
      slider('motif', 'Diamonds', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 c = floor(p * p_cells);
        float x = c.x;
        if (p_mirror > 0.5) x = abs(x + 0.5) - 0.5;
        float P = p_period;
        float band = max(1.0, floor(P * 0.5));
        float v = c.y + abs(mod(x, P * 2.0) - P);
        v += sbSrc(sbUv((c + 0.5) / p_cells)) * P * 2.0 * uSource;
        // Climb: the coloured zigzags step upward a pixel at a time, one full
        // colour round per cycle so the loop closes
        v -= floor(sbMarch(sbMv(0.0)) * band * uInkCount);
        float k = floor(v / band);
        vec3 col = sbInk(mod(k, uInkCount));
        vec2 m = vec2(mod(x, P * 2.0) - P, mod(c.y, P * 2.0) - P);
        vec2 did = floor(vec2(x, c.y) / (P * 2.0));
        // Pulse: diamonds swell and shrink, neighbours out of step
        float size = P * 0.7 * p_motif * (1.0 + 0.9 * sbMv(2.0) * sbOsc(sbR(did + 1.3)));
        float dia = step(abs(m.x) + abs(m.y), size);
        // Twinkle: diamonds wink off for a frame
        float lit = step(sbMv(1.0) * 0.8, sbFr(did));
        // ...and the zigzag bands sparkle with stray pixels
        float spark = step(1.0 - sbMv(1.0) * 0.12, sbFr(c));
        col = mix(col, sbInk(mod(k + 2.0, uInkCount)), spark);
        return mix(col, sbInk(1.0), dia * lit * step(0.01, p_motif));
      }
    `,
  },
  {
    id: 'sbMoire',
    no: 32,
    name: 'Moire',
    makes: 'warped op-art grounds',
    kind: 'Repeats',
    imageReactive: true,
    inks: ['#0b0b0b', '#f0602a'],
    movements: ['Spin', 'Flow', 'Churn'],
    params: [
      select('style', 'Style', ['Radial', 'Rings', 'Linear', 'Checker']),
      slider('scale', 'Scale', 24, 4, 60, 1),
      slider('warp', 'Warp', 0.7, 0, 2),
      slider('twist', 'Twist', 0.4, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 c = (sbR2(vec2(1.0, 8.0)) - 0.5) * 0.4;
        vec2 q = sbRot(sbSpin(sbMv(0.0))) * (p - c);
        vec2 wp = sbChurn(p * 1.5, sbMv(2.0) * 1.4);
        vec2 w = vec2(sbFbm(wp + 3.0, 4.0), sbFbm(wp + 9.0, 4.0)) - 0.5;
        q += w * p_warp * 0.5;
        float r = length(q);
        float a = atan(q.y, q.x) / SB_TAU;
        float v;
        // whole numbers of rays / spiral arms keep the atan seam invisible
        if (p_style < 0.5) v = a * floor(p_scale) + r * p_twist * 6.0;
        else if (p_style < 1.5) v = r * p_scale + a * floor(p_twist * 4.0);
        else if (p_style < 2.5) v = (q.x + q.y * p_twist) * p_scale;
        else v = floor(q.x * p_scale * 0.5) + floor(q.y * p_scale * 0.5);
        // Flow: bands march two whole steps a cycle, which also keeps the
        // checker's parity, so the loop closes
        v -= sbMarch(sbMv(1.0)) * 2.0;
        float duty = mix(0.5, sbSrc(uv), uSource);
        float s = p_style < 2.5 ? step(duty, fract(v)) : mod(floor(v), 2.0);
        return mix(sbInk(0.0), sbInk(1.0 + mod(floor(v), max(uInkCount - 1.0, 1.0))), s);
      }
    `,
  },
  {
    id: 'sbQuadtree',
    no: 33,
    name: 'Quadtree',
    makes: 'subdivided pixel grids',
    kind: 'Repeats',
    imageReactive: true,
    inks: ['#ffffff', '#f07ad8', '#5fb0f0', '#5fe0e0', '#e8f0a0', '#c040c0'],
    movements: ['Split', 'Flicker', 'Cycle'],
    params: [
      slider('cells', 'Cells', 6, 2, 16, 1),
      slider('subdivide', 'Subdivide', 0.55, 0, 1),
      slider('depth', 'Depth', 3, 1, 4, 1),
      slider('white', 'White', 0.3, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float res = p_cells;
        vec2 id = floor(p * res);
        // Split: top-level cells re-divide themselves one after another
        float hop = sbHop(sbR(id + 0.3), sbMv(0.0)) * 9.1;
        // quadtree: keep halving a cell while its own coin flip says so
        for (int i = 0; i < 4; i++) {
          if (float(i) >= p_depth) break;
          if (sbR(id + float(i) * 17.3 + res * 0.01 + hop) > p_subdivide) break;
          res *= 2.0;
          id = floor(p * res);
        }
        float n = max(uInkCount - 1.0, 1.0);
        float k = sbField(sbR(id + 0.5 + hop), sbUv((id + 0.5) / res));
        // Cycle: every cell steps through the palette
        float idx = mod(floor(clamp(k, 0.0, 0.999) * n) + floor(sbMarch(sbMv(2.0)) * n), n);
        vec3 col = sbInk(1.0 + idx);
        float white = step(sbR(id + 2.5 + hop), p_white);
        // Flicker: cells blink between colour and paper
        if (sbFr(id) < sbMv(1.0) * 0.3) white = 1.0 - white;
        return mix(col, sbInk(0.0), white);
      }
    `,
  },
  {
    id: 'sbRagbag',
    no: 34,
    name: 'Ragbag',
    makes: 'glyph patch quilts',
    kind: 'Repeats',
    imageReactive: true,
    inks: ['#0b0b14', '#3a6cff', '#f5d23a', '#5fd07a', '#8ad0ff'],
    movements: ['Flicker', 'Shuffle', 'Drift'],
    params: [
      slider('cells', 'Cells', 48, 16, 100, 1),
      slider('regions', 'Patch Scale', 2.0, 0.5, 6),
      slider('glyphs', 'Glyphs', 0.85, 0, 1),
      slider('tint', 'Ground Tint', 0.3, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 g = p * p_cells;
        vec2 c = floor(g);
        vec2 f = fract(g);
        vec2 cc = (c + 0.5) / p_cells;
        float r = sbField(sbStretch(sbFbm(cc * p_regions + sbDrift(sbMv(2.0)) * 1.2, 3.0), 2.5), sbUv(cc));
        float n = max(uInkCount - 1.0, 1.0);
        vec3 ink = sbInk(1.0 + floor(clamp(r, 0.0, 0.999) * n));
        // Shuffle: each cell swaps its mark now and then
        float hop = sbHop(sbR(c + 6.6), sbMv(1.0)) * 2.9;
        float kind = sbR(c + 0.71 + hop);
        float on;
        if (kind < 0.25) on = 1.0 - step(0.28, length(f - 0.5));
        else if (kind < 0.4) on = clamp(step(abs(f.x - 0.5), 0.1) * step(abs(f.y - 0.5), 0.36) + step(abs(f.y - 0.5), 0.1) * step(abs(f.x - 0.5), 0.36), 0.0, 1.0);
        else on = sbGlyph(f, floor(sbR(c + hop) * 64.0));
        on *= step(1.0 - p_glyphs, sbR(c + 3.3));
        // Flicker: marks blink out for a frame
        on *= step(sbMv(0.0) * 0.45, sbFr(c));
        vec3 bg = mix(sbInk(0.0), ink, p_tint * 0.35);
        return mix(bg, ink, on);
      }
    `,
  },
  {
    id: 'sbRickrack',
    no: 35,
    name: 'Rickrack',
    makes: 'rounded zigzag bands',
    kind: 'Repeats',
    imageReactive: true,
    inks: ['#6ad84a', '#e8604a'],
    movements: ['March', 'Pulse', 'Rock'],
    params: [
      slider('bands', 'Bands', 6, 2, 16, 1),
      slider('zigs', 'Zigs', 9, 2, 30, 1),
      slider('amplitude', 'Amplitude', 0.35, 0, 1),
      slider('angle', 'Angle', 45, 0, 180, 1),
      slider('round', 'Roundness', 0.7, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 q = sbRot(radians(p_angle) + 0.5 * sbMv(2.0) * sbOsc(0.0)) * p;
        // March: the zigzag runs along its own band
        float tri = abs(fract(q.x * p_zigs + sbMarch(sbMv(0.0))) - 0.5) * 2.0;
        float rw = mix(tri, 0.5 - 0.5 * cos(tri * SB_PI), p_round);
        // Pulse: the zigs deepen and flatten in a travelling wave
        float amp = p_amplitude * (1.0 + 1.3 * sbMv(1.0) * sbOsc(q.y * 0.6));
        float y = q.y + (rw - 0.5) * amp / p_zigs * 2.0;
        float v = y * p_bands + sbSrc(uv) * uSource * 2.0;
        return sbInk(mod(floor(v), uInkCount));
      }
    `,
  },
  {
    id: 'sbRibbon',
    no: 36,
    name: 'Ribbon',
    makes: 'striped ribbon bands',
    kind: 'Repeats',
    imageReactive: true,
    inks: ['#2a1a14', '#e85a4a', '#5fc06a', '#3a8a3a', '#f0a090'],
    movements: ['Slide', 'Pulse', 'Shuffle'],
    params: [
      slider('bands', 'Ribbons', 7, 2, 16, 1),
      slider('density', 'Stripe Density', 48, 10, 120, 1),
      slider('variance', 'Variance', 0.6, 0, 1),
      slider('separators', 'Separators', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float y = uv.y;
        float total = 0.0;
        for (int i = 0; i < 16; i++) { if (float(i) >= p_bands) break; total += 0.4 + sbR(vec2(float(i), 1.0)) * p_variance * 1.6; }
        float acc = 0.0;
        float band = 0.0;
        float y0 = 0.0;
        float y1 = 1.0;
        for (int i = 0; i < 16; i++) {
          if (float(i) >= p_bands) break;
          float w = (0.4 + sbR(vec2(float(i), 1.0)) * p_variance * 1.6) / total;
          if (y >= acc && y < acc + w) { band = float(i); y0 = acc; y1 = acc + w; }
          acc += w;
        }
        float freq = p_density * (0.5 + sbR(vec2(band, 2.0)));
        float duty = mix(0.3 + 0.5 * sbR(vec2(band, 3.0)), sbSrc(uv), uSource);
        // Pulse: each ribbon's stripes fatten and thin on their own beat
        duty = clamp(duty + 0.25 * sbMv(1.0) * sbOsc(sbR(vec2(band, 8.0))), 0.05, 0.95);
        // Slide: neighbouring ribbons run in opposite directions
        float dir = mod(band, 2.0) * 2.0 - 1.0;
        float s = step(duty, fract(p.x * freq + sbR(vec2(band, 4.0)) + sbMarch(sbMv(0.0)) * dir));
        // Shuffle: ribbons are re-dyed one at a time
        float hop = sbHop(sbR(vec2(band, 9.0)), sbMv(2.0)) * 5.3;
        float n = uInkCount;
        vec3 col = mix(sbInk(floor(sbR(vec2(band, 6.0 + hop)) * n)), sbInk(floor(sbR(vec2(band, 7.0 + hop)) * n)), s);
        float sep = step(min(y - y0, y1 - y), 0.004 * p_separators) * step(0.01, p_separators);
        return mix(col, sbInk(0.0), sep);
      }
    `,
  },
  {
    id: 'sbSwatch',
    no: 37,
    name: 'Swatch',
    makes: 'modular tile swatches',
    kind: 'Repeats',
    imageReactive: true,
    inks: ['#111111', '#f2e6d8', '#ff4fa0', '#2fa07a', '#ff6a5a'],
    movements: ['Turn', 'Shuffle', 'Slide'],
    params: [
      slider('cells', 'Tiles', 12, 4, 30, 1),
      slider('variety', 'Motifs', 6, 1, 7, 1),
      slider('bands', 'Row Bands', 0.5, 0, 1),
      toggle('rotate', 'Rotate', true),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 g = p * p_cells;
        // Slide: rows shuffle sideways a tile or two and back
        g.x += floor(2.5 * sbMv(2.0) * sbOsc(sbR(vec2(floor(g.y), 3.3))) + 0.5);
        vec2 c = floor(g);
        vec2 f = fract(g);
        // Turn: tiles click round a quarter turn at a time
        float rot = floor(sbR(c + 0.9) * 4.0) * p_rotate + sbHop(sbR(c + 1.9), sbMv(0.0));
        rot = mod(rot, 4.0);
        if (rot > 0.5 && rot < 1.5) f = vec2(1.0 - f.y, f.x);
        else if (rot > 1.5 && rot < 2.5) f = 1.0 - f;
        else if (rot > 2.5) f = vec2(f.y, 1.0 - f.x);
        // Shuffle: tiles swap motifs
        float hop = sbHop(sbR(c + 2.4), sbMv(1.0)) * 6.7;
        float kind = floor(sbR(c + 0.3 + hop) * p_variety);
        float m;
        if (kind < 0.5) m = step(f.y, f.x);
        else if (kind < 1.5) m = step(length(f), 1.0);
        else if (kind < 2.5) m = step(0.5, fract(f.x * 3.0));
        else if (kind < 3.5) m = mod(floor(f.x * 2.0) + floor(f.y * 2.0), 2.0);
        else if (kind < 4.5) m = clamp(step(abs(f.x - 0.5), 0.17) + step(abs(f.y - 0.5), 0.17), 0.0, 1.0);
        else if (kind < 5.5) m = 1.0 - step(0.3, length(f - 0.5));
        else m = step(0.5, f.x);
        // rows can share a colour pair so the sheet reads in bands, like a sampler
        float key = mix(sbR(c + 1.7), sbR(vec2(floor(c.y / 3.0), 4.4)), p_bands);
        key = sbField(key, sbUv((c + 0.5) / p_cells));
        float n = uInkCount;
        float ia = floor(clamp(key, 0.0, 0.999) * n);
        float ib = mod(ia + 1.0 + floor(sbR(c + 2.9) * (n - 1.0)), n);
        return mix(sbInk(ia), sbInk(ib), m);
      }
    `,
  },
  {
    id: 'sbChips',
    no: 38,
    name: 'Chips',
    makes: 'blinking badge grids',
    kind: 'Emblems',
    imageReactive: true,
    inks: ['#050505', '#ff4fd8', '#3a4cff', '#5ff07a', '#ff6a3a', '#5fd0ff'],
    movements: ['Spin', 'Bounce', 'Pop'],
    params: [
      slider('cells', 'Grid', 11, 4, 24, 1),
      slider('density', 'Density', 0.32, 0, 1),
      slider('size', 'Size', 0.6, 0, 1),
      toggle('lines', 'Rules', true),
      slider('blink', 'Blink', 0.45, 0, 1),
      slider('cycle', 'Colour Cycle', 0.6, 0, 1),
      slider('speed', 'Speed', 1, 0, 4, 0.05),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 g = p * p_cells;
        vec2 c = floor(g);
        vec2 f = fract(g) - 0.5;
        vec3 col = sbInk(0.0);
        // Blink and Colour Cycle run on their own clock (Speed), so chips
        // twinkle whether or not Animate is on.
        float t = uTime * p_speed;
        if (p_lines > 0.5) {
          float edge = abs(fract(g.y) - 0.5);
          col = mix(col, vec3(0.18), step(0.5 - sbPx() * p_cells * 0.7, edge) * step(0.6, sbR(vec2(c.y, 3.3))));
        }
        float presence = mix(p_density, sbSrc(sbUv((c + 0.5) / p_cells)), uSource);
        // Blinkers re-roll their on/off state every tick at their own rate,
        // so the grid keeps its density while chips switch on and off.
        float blinker = step(sbR(c + 4.4), p_blink);
        float tick = floor(t * mix(0.8, 3.5, sbR(c + 5.5)) + sbR(c + 6.6) * 10.0) * blinker;
        if (sbR(c + tick * vec2(1.73, 0.61)) > presence) return col;
        float kind = floor(sbR(c + 1.1) * 6.0);
        // Spin: chips wheel round, alternate ones the other way
        float spinDir = sbR(c + 10.1) < 0.5 ? -1.0 : 1.0;
        f = sbRot(sbSpin(sbMv(0.0)) * spinDir * 0.25) * f;
        // Bounce: chips hop in their cells
        f.y -= 0.16 * sbMv(1.0) * abs(sbOsc(sbR(c + 11.2) * 0.5));
        // Pop: chips swell and shrink
        float s = mix(0.15, 0.42, p_size) * (1.0 + 0.4 * sbMv(2.0) * sbOsc(sbR(c + 12.3)));
        // Cyclers step through the palette, with a short crossfade per step.
        float n = max(uInkCount - 1.0, 1.0);
        float ci = floor(sbR(c + 2.2) * n);
        float cycler = step(sbR(c + 7.7), p_cycle);
        float ct = t * mix(0.4, 1.6, sbR(c + 8.8)) + sbR(c + 9.9) * 7.0;
        float k = floor(ct) * cycler;
        float fk = smoothstep(0.8, 1.0, fract(ct)) * cycler;
        vec3 ink = mix(sbInk(1.0 + mod(ci + k, n)), sbInk(1.0 + mod(ci + k + 1.0, n)), fk);
        float box = max(abs(f.x), abs(f.y));
        float m;
        if (kind < 0.5) m = step(box, s);
        else if (kind < 1.5) m = step(length(f), s);
        else if (kind < 2.5) m = step(abs(length(f) - s * 0.8), s * 0.18);
        else if (kind < 3.5) { vec2 ff = fract(f * 2.0 + 0.5) - 0.5; m = step(max(abs(ff.x), abs(ff.y)), s * 0.8) * step(box, s * 1.1); }
        else if (kind < 4.5) m = step(abs(f.x), s * 0.25) * step(abs(f.y), s) + step(abs(f.y), s * 0.25) * step(abs(f.x), s);
        else m = step(box, s) - step(box, s * 0.6);
        return mix(col, ink, clamp(m, 0.0, 1.0));
      }
    `,
  },
]
