import { select, slider } from './params'
import type { PlaygroundTool } from './types'

export const POSTERS: PlaygroundTool[] = [
  {
    id: 'pgDahlia',
    no: 48,
    name: 'Dahlia',
    makes: 'chrysanthemum burst posters',
    kind: 'Posters',
    inks: ['#d6ead0', '#5a2ab0', '#c8a03a', '#f2ecd8', '#8a5ad0'],
    params: [
      slider('petals', 'Petals', 96, 20, 200, 1),
      slider('layers', 'Layers', 4, 1, 4, 1),
      slider('length', 'Length', 0.75, 0, 1),
      slider('taper', 'Taper', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 c = (pgR2(vec2(4.0, 2.0)) - 0.5) * 0.12;
        vec2 q = p - c;
        float r = length(q);
        float a = atan(q.y, q.x) / PG_TAU + 0.5;
        vec3 col = pgInk(0.0);
        float n = max(uInkCount - 1.0, 1.0);
        // back to front: the longest, sparsest layer first
        for (int L = 0; L < 4; L++) {
          if (float(L) >= p_layers) break;
          float fl = float(L);
          float count = floor(p_petals * (1.0 - fl * 0.18));
          float rot = pgR(vec2(fl, 5.0)) + pgT() * 0.01 * (fl + 1.0);
          float x = fract(a + rot) * count;
          float id = floor(x);
          float fx = fract(x) - 0.5;
          float len = (0.24 + 0.3 * p_length) * (0.72 + 0.28 * pgR(vec2(id, fl + 1.0))) * (1.0 - fl * 0.16);
          float t = clamp(r / len, 0.0, 1.0);
          float width = 0.49 * mix(1.0, 1.0 - t * 0.85, p_taper);
          float inPetal = step(abs(fx), width) * step(r, len) * step(0.015, r);
          vec3 pc = pgInk(1.0 + mod(id + fl * 2.0, n)) * (0.7 + 0.3 * t);
          col = mix(col, pc, inPetal);
        }
        // seed head
        col = mix(col, pgInk(2.0), step(r, 0.035) * step(0.35, pgSpeck()));
        return col;
      }
    `,
  },
  {
    id: 'pgKiosk',
    no: 27,
    name: 'Kiosk',
    makes: 'typographic fly-posters',
    kind: 'Posters',
    inks: ['#111111', '#ff7a3a', '#b6ff3a', '#c43cff', '#3a7a3a', '#f2f2f2'],
    params: [
      slider('stripes', 'Stripes', 14, 4, 40, 1),
      slider('arcs', 'Arcs', 8, 2, 20, 1),
      slider('panels', 'Panels', 3, 0, 6, 1),
      slider('glyphs', 'Type', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 asp = pgAspect();
        float n = uInkCount;
        float split = (0.4 + 0.2 * pgR(vec2(1.0, 1.0)) - 0.5) * asp.x;
        vec3 col;
        if (p.x < split) {
          vec2 corner = vec2(-0.5 * asp.x, 0.5 * asp.y - 0.15);
          float k = floor(length(p - corner) * p_arcs + pgT() * 0.3);
          col = pgInk(1.0 + mod(k, n - 1.0));
        } else {
          float k = floor((p.x - split) * p_stripes * 2.0);
          col = pgInk(1.0 + mod(k * 3.0, n - 1.0));
        }
        for (int i = 0; i < 6; i++) {
          if (float(i) >= p_panels) break;
          float fi = float(i);
          vec2 c = (pgR2(vec2(fi, 3.0)) - 0.5) * asp * 0.8;
          vec2 hs = vec2(0.08 + 0.15 * pgR(vec2(fi, 4.0)), 0.06 + 0.12 * pgR(vec2(fi, 5.0)));
          vec2 d = abs(p - c);
          if (d.x < hs.x && d.y < hs.y) {
            vec2 g = (p - c + hs) * 70.0;
            if (mod(fi, 3.0) < 0.5) {
              float dotr = length(fract(g * 0.5) - 0.5);
              col = mix(pgInk(0.0), pgInk(n - 1.0), step(dotr, 0.25 + 0.2 * (p.y - c.y) / hs.y));
            } else {
              float gl = pgGlyph(fract(g), floor(pgR(floor(g)) * 50.0)) * step(1.0 - p_glyphs, pgR(floor(g) + 1.0));
              col = mix(pgInk(0.0), pgInk(n - 1.0), gl);
            }
          }
        }
        vec2 g2 = p * 50.0;
        float m = pgGlyph(fract(g2), floor(pgR(floor(g2) + 7.0) * 40.0)) * step(1.0 - p_glyphs * 0.12, pgR(floor(g2) + 9.0));
        return mix(col, pgInk(0.0), m);
      }
    `,
  },
  {
    id: 'pgTotem',
    no: 23,
    name: 'Totem',
    makes: 'mirrored pixel banners',
    kind: 'Posters',
    inks: ['#3a9af0', '#3a8a5a', '#111111', '#ff5a8a', '#f2c0d0', '#8a5aff'],
    params: [
      slider('width', 'Width', 0.55, 0, 1),
      slider('segments', 'Segments', 7, 3, 12, 1),
      slider('cells', 'Pixels', 40, 16, 80, 1),
      slider('frame', 'Frame', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 asp = pgAspect();
        float cell = 1.0 / p_cells;
        vec2 cid = floor(p / cell);
        vec2 pc = (cid + 0.5) * cell;
        vec3 col = pgInk(0.0);
        col = mix(col, pgInk(1.0), step(0.62, pgNoise(pc * 8.0)) * step(0.5, pgR(cid)));
        float hw = 0.12 + 0.2 * p_width;
        float hh = 0.42 * asp.y;
        float fw = cell * (1.0 + 2.0 * p_frame);
        vec2 b = vec2(abs(pc.x), pc.y);
        if (b.x < hw + fw && abs(pc.y) < hh + fw) col = pgInk(2.0);
        if (b.x < hw && abs(pc.y) < hh) {
          float yy = (pc.y + hh) / (2.0 * hh);
          float seg = floor(yy * p_segments + pgT() * 0.2);
          float kind = floor(pgR(vec2(seg, 1.0)) * 5.0);
          // b.x is mirrored, so every motif is symmetrical about the banner's spine
          vec2 lc = floor(vec2(b.x, pc.y) / cell);
          float m;
          if (kind < 0.5) m = mod(lc.x + lc.y, 2.0);
          else if (kind < 1.5) m = mod(lc.y, 2.0);
          else if (kind < 2.5) m = step(mod(lc.x + lc.y, 4.0), 1.5);
          else if (kind < 3.5) m = step(abs(mod(lc.x, 6.0) - 3.0) + abs(mod(lc.y, 6.0) - 3.0), 2.5);
          else m = step(0.5, pgR(vec2(lc.x, lc.y + seg * 31.0)));
          float n = max(uInkCount - 3.0, 1.0);
          col = mix(pgInk(3.0 + mod(seg, n)), pgInk(3.0 + mod(seg + 1.0, n)), m);
          if (fract(yy * p_segments + pgT() * 0.2) < 0.06) col = pgInk(2.0);
        }
        return col;
      }
    `,
  },
  {
    id: 'pgRiso',
    no: 20,
    name: 'Riso',
    makes: 'torn paper collage',
    kind: 'Posters',
    inks: ['#b6ff3a', '#ff4a2a', '#1a1a3a', '#f2f0e0', '#ff4fd8'],
    params: [
      slider('shapes', 'Shapes', 6, 2, 10, 1),
      slider('tear', 'Tear', 0.5, 0, 1),
      slider('scribble', 'Scribble', 0.5, 0, 1),
      slider('misregister', 'Misregister', 0.35, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 risoLayers(vec2 p) {
        vec3 col = pgInk(0.0);
        vec2 asp = pgAspect();
        float n = max(uInkCount - 1.0, 1.0);
        for (int i = 0; i < 10; i++) {
          if (float(i) >= p_shapes) break;
          float fi = float(i);
          vec2 c = (pgR2(vec2(fi, 2.0)) - 0.5) * asp;
          float kind = floor(pgR(vec2(fi, 3.0)) * 3.0);
          vec2 q = p - c;
          float d;
          if (kind < 0.5) d = length(q) - (0.1 + 0.18 * pgR(vec2(fi, 4.0)));
          else if (kind < 1.5) d = pgBox(q, vec2(0.15 + 0.3 * pgR(vec2(fi, 5.0)), 0.03 + 0.08 * pgR(vec2(fi, 6.0))));
          else d = max(abs(q.y - abs(fract(q.x * 12.0) - 0.5) * 0.06) - 0.025, abs(q.x) - 0.3);
          // torn edges: two octaves of noise pushed into the shape's boundary
          d += (pgNoise(p * 60.0 + fi) - 0.5) * 0.02 * p_tear + (pgNoise(p * 12.0 + fi) - 0.5) * 0.03 * p_tear;
          col = mix(col, pgInk(1.0 + mod(fi, n)), step(d, 0.0));
        }
        return col;
      }
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 off = vec2(0.006, -0.004) * p_misregister;
        vec3 a = risoLayers(p);
        vec3 b = risoLayers(p + off);
        vec3 col = vec3(a.r, mix(a.g, b.g, 0.5), b.b);
        float s = 0.0;
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          float y = sin(p.x * (6.0 + 6.0 * pgR(vec2(fi, 8.0))) + fi * 2.0 + pgT()) * 0.12 + (pgR(vec2(fi, 9.0)) - 0.5) * 0.6;
          s = max(s, 1.0 - smoothstep(0.0, pgPx() * 1.5, abs(p.y - y + 0.03 * sin(p.x * 40.0 + fi))));
        }
        col = mix(col, vec3(0.02), s * p_scribble);
        return mix(col, pgInk(3.0), step(0.97, pgSpeck()) * 0.6);
      }
    `,
  },
  {
    id: 'pgOptic',
    no: 17,
    name: 'Optic',
    makes: 'striped counterchange posters',
    kind: 'Posters',
    imageReactive: true,
    inks: ['#6a2a9a', '#9ae05a'],
    params: [
      slider('stripes', 'Stripes', 20, 6, 60, 1),
      slider('shapes', 'Shapes', 3, 1, 5, 1),
      select('turn', 'Turn', ['Diagonal', 'Square']),
      slider('weight', 'Weight', 0.5, 0.05, 0.95),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        float k = 0.0;
        for (int i = 0; i < 5; i++) {
          if (float(i) >= p_shapes) break;
          float fi = float(i);
          vec2 c = (pgR2(vec2(fi, 1.0)) - 0.5) * 0.5;
          float rad = 0.12 + 0.28 * pgR(vec2(fi, 2.0));
          float isBox = step(0.6, pgR(vec2(fi, 3.0)));
          float d = mix(length(p - c) - rad, pgBox(p - c, vec2(rad)), isBox);
          k += step(d, 0.0);
        }
        // every nesting level turns the stripes and swaps the two inks
        float ang = k * (p_turn < 0.5 ? PG_PI / 4.0 : PG_PI / 2.0) + pgT() * 0.1;
        vec2 q = pgRot(ang) * p;
        float duty = mix(p_weight, pgSrc(uv), uSource);
        float s = step(duty, fract(q.y * p_stripes));
        s = abs(s - mod(k, 2.0));
        return mix(pgInk(0.0), pgInk(1.0), s);
      }
    `,
  },
  {
    id: 'pgStatic',
    no: 16,
    name: 'Static',
    makes: 'glitch pixel posters',
    kind: 'Posters',
    imageReactive: true,
    inks: ['#5a1a4a', '#5ff0d8'],
    params: [
      slider('cells', 'Pixels', 34, 8, 80, 1),
      slider('scale', 'Scale', 3.0, 0.5, 8),
      slider('glitch', 'Glitch', 0.5, 0, 1),
      slider('streaks', 'Streaks', 0.4, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        float cell = 1.0 / p_cells;
        vec2 c = floor(p / cell);
        float frame = floor(pgT() * 3.0);
        float rowShift = step(1.0 - p_glitch * 0.6, pgR(vec2(c.y, 1.0 + frame))) * floor((pgR(vec2(c.y, 2.0 + frame)) - 0.5) * 12.0);
        vec2 cs = vec2(c.x + rowShift, c.y);
        float f = pgNoise(cs * cell * p_scale) * 0.7 + pgR(cs) * 0.3;
        f = pgField(f, pgUv((c + 0.5) * cell));
        float on = step(0.5, f);
        float topRow = step(0.28 * pgAspect().y, (c.y + 0.5) * cell);
        float streakRow = step(pgR(vec2(c.y, 9.0)), p_streaks) * topRow;
        on = mix(on, step(mod(c.x + c.y, 4.0), 1.5), streakRow);
        return mix(pgInk(0.0), pgInk(1.0 + mod(floor(pgR(cs + 3.0) * 2.0), max(uInkCount - 1.0, 1.0))), on);
      }
    `,
  },
  {
    id: 'pgModular',
    no: 15,
    name: 'Modular',
    makes: 'rounded modular grid posters',
    kind: 'Posters',
    inks: ['#f5f07a', '#111111', '#9a8af0', '#f2e0b0', '#c0c8f0'],
    params: [
      slider('modules', 'Modules', 4, 2, 8, 1),
      slider('pixels', 'Pixels', 10, 4, 24, 1),
      slider('rounding', 'Rounding', 0.35, 0, 1),
      slider('gap', 'Gap', 0.15, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 g = p * p_modules;
        vec2 c = floor(g);
        vec2 f = fract(g) - 0.5;
        float n = uInkCount;
        float kind = floor(pgR(c + 0.4 + floor(pgT() * 0.5)) * 4.0);
        float d = pgRoundBox(f, vec2(0.5 - (0.01 + 0.08 * p_gap)), 0.45 * p_rounding);
        vec3 a = pgInk(floor(pgR(c + 1.0) * n));
        vec3 b = pgInk(floor(pgR(c + 2.0) * n));
        vec2 sc = floor((f + 0.5) * p_pixels);
        vec3 col;
        if (kind < 0.5) col = a;
        else if (kind < 1.5) col = mix(a, b, f.y + 0.5);
        else if (kind < 2.5) col = mix(a, b, step(0.5, pgR(sc + c * 31.0)));
        else col = mix(a, b, step(sc.x + sc.y * 0.7, p_pixels * (0.6 + 0.4 * pgR(c + 3.0))));
        float px = pgPx() * p_modules;
        return mix(pgInk(1.0), col, 1.0 - smoothstep(-px, px, d));
      }
    `,
  },
  {
    id: 'pgParcel',
    no: 12,
    name: 'Parcel',
    makes: 'pixel parcel posters',
    kind: 'Posters',
    imageReactive: true,
    inks: ['#e0d4d4', '#f0306a', '#111111'],
    params: [
      slider('cells', 'Pixels', 24, 8, 60, 1),
      slider('fill', 'Fill', 0.5, 0, 1),
      slider('lines', 'Rules', 4, 0, 8, 1),
      slider('scale', 'Scale', 1.6, 0.5, 5),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        float cell = 1.0 / p_cells;
        vec2 pc = (floor(p / cell) + 0.5) * cell;
        // noise biased toward one central mass, so it reads as a single parcel
        float f = pgFbm(pc * p_scale + 4.0 + pgT() * 0.05, 3.0) + (0.25 - length(pc) * 0.5);
        f = pgField(f, pgUv(pc));
        vec3 col = mix(pgInk(0.0), pgInk(1.0), step(mix(0.95, 0.45, p_fill), f));
        for (int i = 0; i < 8; i++) {
          if (float(i) >= p_lines) break;
          float fi = float(i);
          float vertical = step(0.5, pgR(vec2(fi, 1.0)));
          float pos = (pgR(vec2(fi, 2.0)) - 0.5) * 0.8;
          float a0 = (pgR(vec2(fi, 3.0)) - 0.5) * 0.8;
          float a1 = a0 + 0.1 + 0.4 * pgR(vec2(fi, 4.0));
          vec2 q = vertical > 0.5 ? p.yx : p;
          float line = step(abs(q.y - pos), pgPx() * 1.2) * step(a0, q.x) * step(q.x, a1);
          col = mix(col, pgInk(2.0), line);
        }
        return col;
      }
    `,
  },
  {
    id: 'pgFete',
    no: 11,
    name: 'Fete',
    makes: 'festival patch posters',
    kind: 'Posters',
    imageReactive: true,
    inks: ['#3a7af0', '#f0a03a', '#5ff07a', '#e03af0', '#ffffff', '#111111'],
    params: [
      slider('cells', 'Pixels', 40, 12, 80, 1),
      slider('regions', 'Patch Scale', 2.2, 0.5, 6),
      slider('orbits', 'Orbits', 3, 0, 6, 1),
      slider('dots', 'Beads', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        float cell = 1.0 / p_cells;
        vec2 pc = (floor(p / cell) + 0.5) * cell;
        float f = pgField(pgStretch(pgFbm(pgDomainWarp(pc * p_regions, 0.6), 4.0), 2.6), pgUv(pc));
        // the last two inks are reserved for the orbit lines and their beads
        float nreg = max(uInkCount - 2.0, 1.0);
        vec3 col = pgInk(floor(clamp(f, 0.0, 0.999) * nreg));
        float lineW = pgPx() * 2.0;
        float lines = 0.0;
        float beads = 0.0;
        for (int i = 0; i < 6; i++) {
          if (float(i) >= p_orbits) break;
          float fi = float(i);
          float ang = fi / max(p_orbits, 1.0) * PG_PI + pgR(vec2(fi, 2.0)) * 0.3 + pgT() * 0.1;
          vec2 q = pgRot(ang) * p;
          vec2 ab = vec2(0.32 + 0.08 * pgR(vec2(fi, 3.0)), 0.1 + 0.05 * pgR(vec2(fi, 4.0)));
          float d = (length(q / ab) - 1.0) * min(ab.x, ab.y);
          lines = max(lines, 1.0 - smoothstep(lineW * 0.5, lineW, abs(d)));
          float t = atan(q.y / ab.y, q.x / ab.x);
          float seg = PG_TAU / 7.0;
          float tb = (floor(t / seg) + 0.5) * seg;
          vec2 bp = vec2(cos(tb), sin(tb)) * ab;
          beads = max(beads, step(length(q - bp), 0.012) * step(1.0 - p_dots, pgR(vec2(fi, floor(t / seg) + 5.0))));
        }
        col = mix(col, pgInk(uInkCount - 2.0), lines);
        return mix(col, pgInk(uInkCount - 1.0), beads);
      }
    `,
  },
  {
    id: 'pgSpecimen',
    no: 8,
    name: 'Specimen',
    makes: 'type specimen posters',
    kind: 'Posters',
    imageReactive: true,
    inks: ['#f4efe4', '#d6d0c4', '#e03af0', '#d8f03a', '#5ff0c0', '#5a2ab0'],
    params: [
      slider('columns', 'Columns', 5, 2, 10, 1),
      slider('rows', 'Rows', 7, 2, 12, 1),
      slider('fill', 'Fill', 0.3, 0, 1),
      slider('warp', 'Warp', 0.8, 0, 2),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 grid = vec2(p_columns, p_rows);
        vec2 g = uv * grid;
        vec2 c = floor(g);
        vec2 f = fract(g);
        vec3 col = pgInk(0.0);
        vec2 cellPx = grid / uResolution;
        col = mix(col, pgInk(1.0), clamp(step(f.x, cellPx.x * 1.5) + step(f.y, cellPx.y * 1.5), 0.0, 1.0));
        // a run of filled cells in reading order, like a specimen line being set
        float bandRow = floor(pgR(vec2(1.0, 2.0)) * p_rows);
        float span = floor(p_fill * p_columns * p_rows);
        float idx = (p_rows - 1.0 - c.y) * p_columns + c.x;
        float start = bandRow * p_columns;
        if (idx >= start && idx < start + span) {
          vec2 q = pgDomainWarp(uv * 3.0 + c + pgT() * 0.05, p_warp);
          float v = pgFbm(q, 4.0);
          float n = max(uInkCount - 2.0, 1.0);
          vec3 fc = pgInk(2.0 + floor(clamp(pgStretch(v, 2.5), 0.0, 0.999) * n));
          if (pgR(c) > 0.6) fc = mix(pgInk(2.0), pgInk(uInkCount - 1.0), step(length(fract(uv * 120.0) - 0.5), 0.3));
          // with Image up, the photo shows through the set cells
          col = mix(fc, texture2D(tDiffuse, uv).rgb, uSource);
        }
        return col;
      }
    `,
  },
]
