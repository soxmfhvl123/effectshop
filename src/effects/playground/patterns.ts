import { select, slider, toggle } from './params'
import type { PlaygroundTool } from './types'

export const PATTERNS: PlaygroundTool[] = [
  {
    id: 'pgMotley',
    no: 50,
    name: 'Motley',
    makes: 'glyph patchwork',
    kind: 'Patterns',
    imageReactive: true,
    inks: ['#0b0b14', '#3a6cff', '#f5d23a', '#5fd07a', '#8ad0ff'],
    params: [
      slider('cells', 'Cells', 48, 16, 100, 1),
      slider('regions', 'Patch Scale', 2.0, 0.5, 6),
      slider('glyphs', 'Glyphs', 0.85, 0, 1),
      slider('tint', 'Ground Tint', 0.3, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 g = p * p_cells;
        vec2 c = floor(g);
        vec2 f = fract(g);
        vec2 cc = (c + 0.5) / p_cells;
        float r = pgField(pgStretch(pgFbm(cc * p_regions + pgT() * 0.05, 3.0), 2.5), pgUv(cc));
        float n = max(uInkCount - 1.0, 1.0);
        vec3 ink = pgInk(1.0 + floor(clamp(r, 0.0, 0.999) * n));
        float kind = pgR(c + 0.71);
        float on;
        if (kind < 0.25) on = 1.0 - step(0.28, length(f - 0.5));
        else if (kind < 0.4) on = clamp(step(abs(f.x - 0.5), 0.1) * step(abs(f.y - 0.5), 0.36) + step(abs(f.y - 0.5), 0.1) * step(abs(f.x - 0.5), 0.36), 0.0, 1.0);
        else on = pgGlyph(f, floor(pgR(c) * 64.0));
        on *= step(1.0 - p_glyphs, pgR(c + 3.3));
        vec3 bg = mix(pgInk(0.0), ink, p_tint * 0.35);
        return mix(bg, ink, on);
      }
    `,
  },
  {
    id: 'pgCipher',
    no: 49,
    name: 'Cipher',
    makes: 'glyph-grid fields',
    kind: 'Patterns',
    imageReactive: true,
    inks: ['#16160a', '#b4ff3a', '#c43cff', '#f2f2f2'],
    params: [
      slider('cells', 'Cells', 42, 16, 90, 1),
      slider('band', 'Band Width', 0.35, 0, 1),
      slider('meander', 'Meander', 0.5, 0, 1),
      slider('density', 'Density', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 g = p * p_cells;
        vec2 c = floor(g);
        vec2 f = fract(g);
        vec2 cc = (c + 0.5) / p_cells;
        float x0 = sin(cc.y * mix(2.0, 9.0, p_meander) + pgR(vec2(1.0, 1.0)) * PG_TAU + pgT() * 0.5) * 0.36 * p_meander;
        float inBand = step(abs(cc.x - x0), mix(0.05, 0.3, p_band));
        // with Image up, the band follows the photo's darks instead
        inBand = step(0.5, mix(inBand, 1.0 - pgSrc(pgUv(cc)), uSource));
        float gl = pgGlyph(f, floor(pgR(c) * 97.0));
        vec3 bandCol = mix(pgInk(2.0), pgInk(0.0), gl);
        float on = gl * step(1.0 - p_density, pgR(c + 5.0));
        vec3 outCol = mix(pgInk(0.0), pgInk(1.0), on);
        outCol = mix(outCol, pgInk(3.0), gl * step(0.985, pgR(c + 9.0)));
        return mix(outCol, bandCol, inBand);
      }
    `,
  },
  {
    id: 'pgFold',
    no: 46,
    name: 'Fold',
    makes: 'kaleidoscope pixel art',
    kind: 'Patterns',
    imageReactive: true,
    dither: 0.3,
    inks: ['#111111', '#ff8a2a', '#5fd8ff', '#2a5aff', '#f2f2f2'],
    params: [
      slider('cells', 'Pixels', 44, 12, 100, 1),
      select('folds', 'Folds', ['Mirror', 'Quad', 'Octo'], 'Quad'),
      slider('scale', 'Scale', 2.4, 0.5, 6),
      slider('checker', 'Checker', 0.35, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        float cell = 1.0 / p_cells;
        vec2 q = (floor(p / cell) + 0.5) * cell;
        q.x = abs(q.x);
        if (p_folds > 0.5) q.y = abs(q.y);
        if (p_folds > 1.5 && q.y > q.x) q = q.yx;
        vec2 qc = floor(q / cell);
        float f = pgField(pgStretch(pgFbm(q * p_scale + pgT() * 0.1, 4.0), 2.6), pgUv(q));
        vec3 col = pgInkDCell(f, qc);
        float chk = mod(qc.x + qc.y, 2.0);
        float region = step(1.0 - p_checker * 0.5, pgNoise(q * p_scale * 3.0 + 9.0));
        return mix(col, mix(pgInk(0.0), pgInk(uInkCount - 1.0), chk), region);
      }
    `,
  },
  {
    id: 'pgSprig',
    no: 40,
    name: 'Sprig',
    makes: 'drawn botanical repeats',
    kind: 'Patterns',
    inks: ['#cfe3f5', '#1f2a6e', '#9ec3e8'],
    params: [
      slider('tiles', 'Repeat', 2.5, 1, 6),
      slider('flowers', 'Flowers', 3, 1, 6, 1),
      slider('line', 'Line Weight', 0.4, 0, 1),
      slider('fill', 'Leaf Fill', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 t = fract(p * p_tiles + vec2(0.0, pgT() * 0.05)) - 0.5;
        float px = pgPx() * p_tiles;
        float lw = mix(0.6, 2.5, p_line) * px;
        float lines = 0.0;
        float centers = 0.0;
        float leaves = 0.0;
        for (int i = 0; i < 6; i++) {
          if (float(i) >= p_flowers) break;
          float fi = float(i);
          vec2 c = pgR2(vec2(fi, 5.0)) - 0.5;
          float R = 0.1 + 0.1 * pgR(vec2(fi, 9.0));
          float petals = 5.0 + floor(pgR(vec2(fi, 3.0)) * 4.0);
          float ringOn = step(0.5, pgR(vec2(fi, 4.0)));
          float la = pgR(vec2(fi, 6.0)) * PG_TAU;
          // 3x3 neighbourhood so motifs wrap seamlessly across tile edges
          for (int ox = -1; ox <= 1; ox++) {
            for (int oy = -1; oy <= 1; oy++) {
              vec2 q = t - c - vec2(float(ox), float(oy));
              float ang = atan(q.y, q.x);
              float rr = R * (0.65 + 0.35 * abs(cos(ang * petals * 0.5)));
              lines = max(lines, 1.0 - smoothstep(lw * 0.5, lw * 0.5 + px, abs(length(q) - rr)));
              centers = max(centers, 1.0 - smoothstep(0.0, px, length(q) - R * 0.22));
              lines = max(lines, ringOn * (1.0 - smoothstep(lw * 0.5, lw * 0.5 + px, abs(length(q) - R * 1.4))));
              vec2 lq = pgRot(la) * (q - vec2(cos(la), sin(la)) * R * 1.9);
              float leaf = max(length(lq - vec2(0.0, -0.045)) - 0.07, length(lq + vec2(0.0, -0.045)) - 0.07);
              leaves = max(leaves, 1.0 - smoothstep(0.0, px, leaf));
              lines = max(lines, 1.0 - smoothstep(lw * 0.5, lw * 0.5 + px, abs(leaf)));
            }
          }
        }
        vec3 col = mix(pgInk(0.0), pgInk(2.0), leaves * p_fill);
        return mix(col, pgInk(1.0), max(lines, centers));
      }
    `,
  },
  {
    id: 'pgWhorl',
    no: 39,
    name: 'Whorl',
    makes: 'warped op-art stripes',
    kind: 'Patterns',
    imageReactive: true,
    inks: ['#0b0b0b', '#7af0c0'],
    params: [
      slider('stripes', 'Stripes', 26, 6, 60, 1),
      slider('warp', 'Warp', 1.0, 0, 2),
      slider('center', 'Off-center', 0.5, 0, 1),
      slider('sharp', 'Sharpness', 0.85, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 c = (pgR2(vec2(2.0, 7.0)) - 0.5) * pgAspect() * p_center;
        float w = pgFbm(p * 1.6 + pgT() * 0.05, 4.0) - 0.5;
        float d = length((p - c) * vec2(1.0, 1.3)) + w * p_warp * 0.6;
        float s = fract(d * p_stripes);
        // the photo's tones thicken / thin the stripes, op-art halftone style
        float duty = mix(0.5, pgSrc(uv), uSource);
        float edge = mix(0.25, 0.01, p_sharp);
        float m = smoothstep(duty - edge, duty + edge, s);
        float k = floor(d * p_stripes);
        return mix(pgInk(0.0), pgInk(1.0 + mod(k, max(uInkCount - 1.0, 1.0))), m);
      }
    `,
  },
  {
    id: 'pgRelief',
    no: 26,
    name: 'Relief',
    makes: 'isometric block lattices',
    kind: 'Patterns',
    imageReactive: true,
    inks: ['#3a7af0', '#5fb0f0', '#2f6e4a', '#5fc09a', '#8a7af0', '#e0704a'],
    params: [
      slider('scale', 'Scale', 7, 2, 20, 0.5),
      slider('accent', 'Accent', 0.12, 0, 1),
      slider('shade', 'Shade', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec4 reliefHex(vec2 p) {
        vec2 s = vec2(1.0, 1.7320508);
        vec2 a = mod(p, s) - s * 0.5;
        vec2 b = mod(p - s * 0.5, s) - s * 0.5;
        vec2 gv = dot(a, a) < dot(b, b) ? a : b;
        return vec4(gv, p - gv);
      }
      vec3 pgMain(vec2 p, vec2 uv) {
        vec4 h = reliefHex(p * p_scale + vec2(pgT() * 0.2, 0.0));
        vec2 gv = h.xy;
        vec2 id = floor(h.zw * 2.0 + 0.5);
        float ang = atan(gv.y, gv.x);
        // the three rhombi of each hexagon read as the top / left / right faces of a cube
        float face = (ang > PG_PI / 6.0 && ang < 5.0 * PG_PI / 6.0) ? 0.0 : ((ang >= 5.0 * PG_PI / 6.0 || ang < -PG_PI / 2.0) ? 1.0 : 2.0);
        float n = uInkCount;
        float r = pgField(pgR(id), pgUv(h.zw / p_scale));
        float fam = floor(clamp(r, 0.0, 0.999) * max(n - 1.0, 1.0));
        if (pgR(id + 5.0) < p_accent) fam = n - 1.0;
        float sh = face < 0.5 ? 1.0 : (face < 1.5 ? 1.0 - 0.3 * p_shade : 1.0 - 0.6 * p_shade);
        return pgInk(fam) * sh;
      }
    `,
  },
  {
    id: 'pgSampler',
    no: 25,
    name: 'Sampler',
    makes: 'modular tile samplers',
    kind: 'Patterns',
    imageReactive: true,
    inks: ['#111111', '#f2e6d8', '#ff4fa0', '#2fa07a', '#ff6a5a'],
    params: [
      slider('cells', 'Tiles', 12, 4, 30, 1),
      slider('variety', 'Motifs', 6, 1, 7, 1),
      slider('bands', 'Row Bands', 0.5, 0, 1),
      toggle('rotate', 'Rotate', true),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 g = p * p_cells;
        vec2 c = floor(g);
        vec2 f = fract(g);
        if (p_rotate > 0.5) {
          float rot = floor(pgR(c + 0.9) * 4.0);
          if (rot > 0.5 && rot < 1.5) f = vec2(1.0 - f.y, f.x);
          else if (rot > 1.5 && rot < 2.5) f = 1.0 - f;
          else if (rot > 2.5) f = vec2(f.y, 1.0 - f.x);
        }
        float kind = floor(pgR(c + 0.3) * p_variety);
        float m;
        if (kind < 0.5) m = step(f.y, f.x);
        else if (kind < 1.5) m = step(length(f), 1.0);
        else if (kind < 2.5) m = step(0.5, fract(f.x * 3.0));
        else if (kind < 3.5) m = mod(floor(f.x * 2.0) + floor(f.y * 2.0), 2.0);
        else if (kind < 4.5) m = clamp(step(abs(f.x - 0.5), 0.17) + step(abs(f.y - 0.5), 0.17), 0.0, 1.0);
        else if (kind < 5.5) m = 1.0 - step(0.3, length(f - 0.5));
        else m = step(0.5, f.x);
        // rows can share a colour pair so the sheet reads in bands, like a sampler
        float key = mix(pgR(c + 1.7), pgR(vec2(floor(c.y / 3.0), 4.4)), p_bands);
        key = pgField(key, pgUv((c + 0.5) / p_cells));
        float n = uInkCount;
        float ia = floor(clamp(key, 0.0, 0.999) * n);
        float ib = mod(ia + 1.0 + floor(pgR(c + 2.9) * (n - 1.0)), n);
        return mix(pgInk(ia), pgInk(ib), m);
      }
    `,
  },
  {
    id: 'pgWeave',
    no: 13,
    name: 'Weave',
    makes: 'striped ribbon bands',
    kind: 'Patterns',
    imageReactive: true,
    inks: ['#2a1a14', '#e85a4a', '#5fc06a', '#3a8a3a', '#f0a090'],
    params: [
      slider('bands', 'Ribbons', 7, 2, 16, 1),
      slider('density', 'Stripe Density', 48, 10, 120, 1),
      slider('variance', 'Variance', 0.6, 0, 1),
      slider('separators', 'Separators', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        float y = uv.y;
        float total = 0.0;
        for (int i = 0; i < 16; i++) { if (float(i) >= p_bands) break; total += 0.4 + pgR(vec2(float(i), 1.0)) * p_variance * 1.6; }
        float acc = 0.0;
        float band = 0.0;
        float y0 = 0.0;
        float y1 = 1.0;
        for (int i = 0; i < 16; i++) {
          if (float(i) >= p_bands) break;
          float w = (0.4 + pgR(vec2(float(i), 1.0)) * p_variance * 1.6) / total;
          if (y >= acc && y < acc + w) { band = float(i); y0 = acc; y1 = acc + w; }
          acc += w;
        }
        float freq = p_density * (0.5 + pgR(vec2(band, 2.0)));
        float duty = mix(0.3 + 0.5 * pgR(vec2(band, 3.0)), pgSrc(uv), uSource);
        float s = step(duty, fract(p.x * freq + pgR(vec2(band, 4.0)) + pgT() * 0.1 * (pgR(vec2(band, 5.0)) - 0.5)));
        float n = uInkCount;
        vec3 col = mix(pgInk(floor(pgR(vec2(band, 6.0)) * n)), pgInk(floor(pgR(vec2(band, 7.0)) * n)), s);
        float sep = step(min(y - y0, y1 - y), 0.004 * p_separators) * step(0.01, p_separators);
        return mix(col, pgInk(0.0), sep);
      }
    `,
  },
  {
    id: 'pgVee',
    no: 10,
    name: 'Vee',
    makes: 'mirrored chevron stripes',
    kind: 'Patterns',
    imageReactive: true,
    inks: ['#f4ece0', '#c4602a'],
    params: [
      slider('stripes', 'Stripes', 22, 4, 60, 1),
      select('mode', 'Shape', ['Diamond', 'Chevron', 'Bowtie']),
      slider('weight', 'Weight', 0.5, 0.05, 0.95),
      slider('rotate', 'Rotate', 0, 0, 90, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 r = pgRot(radians(p_rotate)) * p;
        vec2 q = abs(r);
        float d;
        if (p_mode < 0.5) d = q.x + q.y;
        else if (p_mode < 1.5) d = q.x + r.y;
        else d = abs(q.x - q.y);
        d += pgT() * 0.05;
        float duty = mix(p_weight, pgSrc(uv), uSource);
        float s = step(duty, fract(d * p_stripes));
        float k = floor(d * p_stripes);
        return mix(pgInk(0.0), pgInk(1.0 + mod(k, max(uInkCount - 1.0, 1.0))), s);
      }
    `,
  },
  {
    id: 'pgWarp',
    no: 7,
    name: 'Warp',
    makes: 'warped op-art patterns',
    kind: 'Patterns',
    imageReactive: true,
    inks: ['#0b0b0b', '#f0602a'],
    params: [
      select('style', 'Style', ['Radial', 'Rings', 'Linear', 'Checker']),
      slider('scale', 'Scale', 24, 4, 60, 1),
      slider('warp', 'Warp', 0.7, 0, 2),
      slider('twist', 'Twist', 0.4, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 c = (pgR2(vec2(1.0, 8.0)) - 0.5) * 0.4;
        vec2 q = p - c;
        vec2 w = vec2(pgFbm(p * 1.5 + 3.0 + pgT() * 0.05, 4.0), pgFbm(p * 1.5 + 9.0, 4.0)) - 0.5;
        q += w * p_warp * 0.5;
        float r = length(q);
        float a = atan(q.y, q.x) / PG_TAU;
        float v;
        // whole numbers of rays / spiral arms keep the atan seam invisible
        if (p_style < 0.5) v = a * floor(p_scale) + r * p_twist * 6.0;
        else if (p_style < 1.5) v = r * p_scale + a * floor(p_twist * 4.0);
        else if (p_style < 2.5) v = (q.x + q.y * p_twist) * p_scale;
        else v = floor(q.x * p_scale * 0.5) + floor(q.y * p_scale * 0.5);
        float duty = mix(0.5, pgSrc(uv), uSource);
        float s = p_style < 2.5 ? step(duty, fract(v)) : mod(v, 2.0);
        return mix(pgInk(0.0), pgInk(1.0 + mod(floor(v), max(uInkCount - 1.0, 1.0))), s);
      }
    `,
  },
  {
    id: 'pgQuilt',
    no: 5,
    name: 'Quilt',
    makes: 'pixel blanket patterns',
    kind: 'Patterns',
    imageReactive: true,
    inks: ['#fbf6f0', '#e8402a', '#f08a2a', '#c42a2a'],
    params: [
      slider('cells', 'Pixels', 34, 12, 80, 1),
      slider('period', 'Period', 8, 3, 16, 1),
      toggle('mirror', 'Mirror', true),
      slider('motif', 'Diamonds', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 c = floor(p * p_cells);
        float x = c.x;
        if (p_mirror > 0.5) x = abs(x + 0.5) - 0.5;
        float P = p_period;
        float v = c.y + abs(mod(x, P * 2.0) - P);
        v += pgSrc(pgUv((c + 0.5) / p_cells)) * P * 2.0 * uSource;
        float k = floor(v / max(1.0, floor(P * 0.5)));
        vec3 col = pgInk(mod(k, uInkCount));
        vec2 m = vec2(mod(x, P * 2.0) - P, mod(c.y, P * 2.0) - P);
        float dia = step(abs(m.x) + abs(m.y), P * 0.7 * p_motif);
        return mix(col, pgInk(1.0), dia * step(0.01, p_motif));
      }
    `,
  },
  {
    id: 'pgZig',
    no: 4,
    name: 'Zig',
    makes: 'rounded zigzag patterns',
    kind: 'Patterns',
    imageReactive: true,
    inks: ['#6ad84a', '#e8604a'],
    params: [
      slider('bands', 'Bands', 6, 2, 16, 1),
      slider('zigs', 'Zigs', 9, 2, 30, 1),
      slider('amplitude', 'Amplitude', 0.35, 0, 1),
      slider('angle', 'Angle', 45, 0, 180, 1),
      slider('round', 'Roundness', 0.7, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 q = pgRot(radians(p_angle)) * p;
        float tri = abs(fract(q.x * p_zigs + pgT() * 0.2) - 0.5) * 2.0;
        float rw = mix(tri, 0.5 - 0.5 * cos(tri * PG_PI), p_round);
        float y = q.y + (rw - 0.5) * p_amplitude / p_zigs * 2.0;
        float v = y * p_bands + pgSrc(uv) * uSource * 2.0;
        return pgInk(mod(floor(v), uInkCount));
      }
    `,
  },
  {
    id: 'pgOddgrid',
    no: 1,
    name: 'Oddgrid',
    makes: 'generative pixel compositions',
    kind: 'Patterns',
    imageReactive: true,
    inks: ['#ffffff', '#f07ad8', '#5fb0f0', '#5fe0e0', '#e8f0a0', '#c040c0'],
    params: [
      slider('cells', 'Cells', 6, 2, 16, 1),
      slider('subdivide', 'Subdivide', 0.55, 0, 1),
      slider('depth', 'Depth', 3, 1, 4, 1),
      slider('white', 'White', 0.3, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        float res = p_cells;
        vec2 id = floor(p * res);
        // quadtree: keep halving a cell while its own coin flip says so
        for (int i = 0; i < 4; i++) {
          if (float(i) >= p_depth) break;
          if (pgR(id + float(i) * 17.3 + res * 0.01) > p_subdivide) break;
          res *= 2.0;
          id = floor(p * res);
        }
        float n = max(uInkCount - 1.0, 1.0);
        float k = pgField(pgR(id + 0.5), pgUv((id + 0.5) / res));
        vec3 col = pgInk(1.0 + floor(clamp(k, 0.0, 0.999) * n));
        return mix(col, pgInk(0.0), step(pgR(id + 2.5), p_white));
      }
    `,
  },
  {
    id: 'pgTokens',
    no: 9,
    name: 'Tokens',
    makes: 'geometric badge sets',
    kind: 'Badges',
    imageReactive: true,
    inks: ['#050505', '#ff4fd8', '#3a4cff', '#5ff07a', '#ff6a3a', '#5fd0ff'],
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
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 g = p * p_cells;
        vec2 c = floor(g);
        vec2 f = fract(g) - 0.5;
        vec3 col = pgInk(0.0);
        // Runs on its own clock (Speed) so tokens twinkle without Animate;
        // Animate speeds it up further.
        float t = uTime * p_speed * (1.0 + uMotion);
        if (p_lines > 0.5) {
          float edge = abs(fract(g.y) - 0.5);
          col = mix(col, vec3(0.18), step(0.5 - pgPx() * p_cells * 0.7, edge) * step(0.6, pgR(vec2(c.y, 3.3))));
        }
        float presence = mix(p_density, pgSrc(pgUv((c + 0.5) / p_cells)), uSource);
        // Blinkers re-roll their on/off state every tick at their own rate,
        // so the grid keeps its density while tokens switch on and off.
        float blinker = step(pgR(c + 4.4), p_blink);
        float tick = floor(t * mix(0.8, 3.5, pgR(c + 5.5)) + pgR(c + 6.6) * 10.0) * blinker;
        if (pgR(c + tick * vec2(1.73, 0.61)) > presence) return col;
        float kind = floor(pgR(c + 1.1) * 6.0);
        float s = mix(0.15, 0.42, p_size);
        // Cyclers step through the palette, with a short crossfade per step.
        float n = max(uInkCount - 1.0, 1.0);
        float ci = floor(pgR(c + 2.2) * n);
        float cycler = step(pgR(c + 7.7), p_cycle);
        float ct = t * mix(0.4, 1.6, pgR(c + 8.8)) + pgR(c + 9.9) * 7.0;
        float k = floor(ct) * cycler;
        float fk = smoothstep(0.8, 1.0, fract(ct)) * cycler;
        vec3 ink = mix(pgInk(1.0 + mod(ci + k, n)), pgInk(1.0 + mod(ci + k + 1.0, n)), fk);
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
