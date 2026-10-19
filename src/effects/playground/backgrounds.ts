import { select, slider } from './params'
import type { PlaygroundTool } from './types'

export const BACKGROUNDS: PlaygroundTool[] = [
  {
    id: 'pgCrowd',
    no: 52,
    name: 'Crowd',
    makes: 'blurred crowd',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#08140e', '#3fe08f', '#e3337a', '#86d6ff', '#ffffff'],
    params: [
      slider('figures', 'Figures', 20, 4, 40, 1),
      slider('size', 'Size', 0.49, 0, 1),
      slider('wobble', 'Wobble', 0.24, 0, 1),
      slider('blur', 'Blur', 0.52, 0, 1),
      slider('halo', 'Halo', 0.49, 0, 1),
      slider('rim', 'Dark Rim', 0.16, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 asp = pgAspect();
        float sz = mix(0.018, 0.07, p_size);
        float field = 0.0;
        for (int i = 0; i < 40; i++) {
          if (float(i) >= p_figures) break;
          float fi = float(i);
          vec2 r = pgR2(vec2(fi, 3.7));
          float w = sz * (0.6 + 0.6 * pgR(vec2(fi, 1.3)));
          float h = w * (2.2 + 2.6 * pgR(vec2(fi, 9.1)));
          vec2 base = vec2((r.x - 0.5) * asp.x * 1.15, (r.y - 0.5) * asp.y * 1.3 - h * 0.4);
          vec2 q = p - base;
          q.x += sin(q.y * 11.0 + fi * 2.1 + pgT() * 1.5) * p_wobble * w * 0.9;
          float body = pgSegment(q, vec2(0.0), vec2(0.0, h)) - w;
          float head = length(q - vec2(0.0, h + w * 1.35)) - w * 0.8;
          float d = min(body, head);
          float spread = mix(0.2, 1.3, p_blur) * w + 0.002;
          field += 1.0 / (1.0 + exp(min(d / (spread * 0.35), 30.0)));
        }
        float heat = 1.0 - exp(-field * mix(0.55, 1.5, p_halo));
        heat = pgField(heat, uv);
        vec3 col = mix(pgInkGrad(heat), pgInkD(heat), uDither);
        col *= 1.0 - p_rim * 0.85 * exp(-pow((heat - 0.42) / 0.035, 2.0));
        col = mix(col, pgInk(uInkCount - 1.0), step(0.988, pgSpeck()) * (1.0 - heat));
        return col;
      }
    `,
  },
  {
    id: 'pgVein',
    no: 51,
    name: 'Vein',
    makes: 'cut-paper marbling',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#0d3a20', '#1f7a45', '#49c28a', '#9fe8c8', '#3a6fd6', '#e9fff3'],
    params: [
      slider('scale', 'Scale', 2.4, 0.5, 6),
      slider('warp', 'Warp', 1.2, 0, 2),
      slider('bands', 'Layers', 7, 3, 12, 1),
      slider('edge', 'Paper Edge', 0.5, 0, 1),
      slider('shadow', 'Shadow', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      float veinF(vec2 p) {
        vec2 q = pgDomainWarp(p * p_scale + vec2(pgT() * 0.04, 0.0), p_warp);
        return pgField(pgStretch(pgFbm(q, 5.0), 2.2), pgUv(p));
      }
      vec3 pgMain(vec2 p, vec2 uv) {
        float n = p_bands;
        float f = veinF(p);
        float b = floor(clamp(f + pgDitherOffset() * uDither * 2.0 / n, 0.0, 0.9999) * n);
        vec2 sh = vec2(0.006, -0.008) * (0.4 + p_shadow);
        float bs = floor(clamp(veinF(p + sh), 0.0, 0.9999) * n);
        vec3 col = pgInk(b);
        // a higher paper layer just up-left casts a shadow onto this one
        col *= 1.0 - step(b + 0.5, bs) * 0.45 * p_shadow;
        float e = fract(f * n);
        col = mix(col, vec3(1.0), (1.0 - smoothstep(0.0, 0.07 * p_edge + 0.001, e)) * p_edge * 0.8);
        col = mix(col, pgInk(0.0), step(0.994, pgSpeck()) * 0.6);
        return col;
      }
    `,
  },
  {
    id: 'pgCoral',
    no: 47,
    name: 'Coral',
    makes: 'sea-fan textile',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#2b1d10', '#d9c45a', '#8fc59a', '#c6e6b8'],
    params: [
      slider('stripes', 'Stripes', 16, 4, 40, 1),
      slider('warp', 'Warp', 1.0, 0, 2),
      slider('patches', 'Patches', 0.45, 0, 1),
      slider('speckle', 'Speckle', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 q = pgDomainWarp(p * 1.6 + vec2(0.0, pgT() * 0.03), p_warp);
        float s = sin((q.x * 0.55 + q.y) * p_stripes + pgFbm(q * 2.0, 3.0) * 5.0);
        float stripe = smoothstep(0.1, 0.3, s);
        float patchF = pgField(pgFbm(p * 2.2 + 11.0, 4.0), uv);
        float th = 0.62 - p_patches * 0.25;
        float inPatch = smoothstep(th, th + 0.01, patchF);
        float rim = smoothstep(th - 0.012, th, patchF) * (1.0 - inPatch);
        vec3 col = mix(pgInk(0.0), pgInk(1.0), stripe);
        vec3 patchCol = mix(pgInk(2.0), pgInk(3.0), step(1.0 - p_speckle * 0.5, pgSpeck()));
        col = mix(col, patchCol, inPatch);
        return mix(col, pgInk(0.0), rim);
      }
    `,
  },
  {
    id: 'pgStitch',
    no: 45,
    name: 'Stitch',
    makes: 'glitched pixel grids',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#f2e8c8', '#b8ea6a', '#e9c86a', '#78d86a', '#111111'],
    params: [
      slider('cells', 'Cells', 26, 8, 64, 1),
      slider('lines', 'Plaid Lines', 0.5, 0, 1),
      slider('drips', 'Drips', 0.45, 0, 1),
      slider('glitch', 'Glitch', 0.3, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 asp = pgAspect();
        vec2 g = (p + asp * 0.5) * p_cells;
        float rows = asp.y * p_cells;
        float row = floor(g.y);
        float slide = step(1.0 - p_glitch * 0.45, pgR(vec2(row, 4.2))) * floor((pgR(vec2(row, 8.8)) - 0.5) * 10.0);
        slide += floor(pgT() * 2.0) * step(0.94, pgR(vec2(row, 1.9)));
        float fromTop = rows - g.y;
        g.x += slide;
        vec2 c = floor(g);
        vec2 f = fract(g);
        float lineInk = uInkCount - 1.0;
        float n = max(uInkCount - 1.0, 1.0);
        float region = pgField(pgStretch(pgFbm(c / p_cells * 3.0, 3.0), 2.2), pgUv((c + 0.5) / p_cells - asp * 0.5));
        float k = floor(clamp(region + (pgR(c) - 0.5) * 0.35, 0.0, 0.999) * n);
        vec3 col = pgInk(k);
        float vline = step(1.0 - p_lines * 0.3, pgR(vec2(c.x, 2.0))) * step(f.x, 0.2);
        float hline = step(1.0 - p_lines * 0.3, pgR(vec2(c.y, 7.0))) * step(f.y, 0.2);
        col = mix(col, pgInk(lineInk), max(vline, hline));
        float dripLen = pgR(vec2(c.x, 5.5)) * rows * 0.6 * p_drips * step(0.45, pgR(vec2(c.x, 6.6)));
        float drip = step(fromTop, dripLen + (pgR(c + 0.5) - 0.5) * 3.0);
        return mix(col, pgInk(lineInk), drip);
      }
    `,
  },
  {
    id: 'pgBenday',
    no: 44,
    name: 'Benday',
    makes: 'dot-screened thermal fields',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#1b1b20', '#2e1f6e', '#6a49ff', '#46b4ff', '#55f0c0', '#eee6ff'],
    params: [
      slider('scale', 'Scale', 2.2, 0.5, 6),
      slider('warp', 'Warp', 1.3, 0, 2),
      slider('dots', 'Screen', 40, 16, 180, 1),
      slider('angle', 'Angle', 45, 0, 90, 1),
      slider('contrast', 'Contrast', 1.6, 0.5, 3),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 q = pgDomainWarp(p * p_scale + vec2(0.0, pgT() * 0.05), p_warp);
        float f = pgField(pgStretch(pgFbm(q, 5.0), p_contrast), uv);
        vec2 r = pgRot(radians(p_angle)) * p * p_dots;
        vec2 cell = fract(r) - 0.5;
        float rad = sqrt(f) * 0.62;
        // AA is in cell units; cap it so small renders keep crisp dots
        float aa = min(p_dots * pgPx(), 0.08);
        float dotMask = 1.0 - smoothstep(rad - aa, rad + aa, length(cell));
        vec3 inkc = mix(pgInkGrad(f), pgInkD(f), uDither);
        return mix(pgInk(0.0), inkc, dotMask);
      }
    `,
  },
  {
    id: 'pgHiss',
    no: 43,
    name: 'Hiss',
    makes: 'television-snow posters',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#000000', '#ffffff', '#4f6bff', '#8a55ff', '#3ad8ff', '#d0ff55'],
    params: [
      slider('snow', 'Snow', 0.8, 0, 1),
      slider('shape', 'Column', 0.5, 0, 1),
      slider('stripes', 'Swirls', 0.5, 0, 1),
      slider('color', 'Color', 0.7, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 asp = pgAspect();
        float frame = floor(pgT() * 12.0);
        float sn = pgR(floor(gl_FragCoord.xy / pgDitherCell()) + frame * vec2(37.0, 11.0));
        float v = clamp((sn - 0.5) * (1.0 + p_snow * 4.0) + 0.5, 0.0, 1.0);
        // with Image up, the snow becomes a noise-dithered version of the photo
        v = mix(v, step(sn, pgSrc(uv)), uSource);
        float d = 10.0;
        for (int k = 0; k < 6; k++) {
          float fk = float(k);
          vec2 c = vec2(sin(fk * 1.7 + pgR(vec2(fk, 1.0)) * 6.0) * 0.08 * asp.x, (fk / 5.0 - 0.5) * asp.y * 0.95);
          float rad = (0.12 + 0.1 * pgR(vec2(fk, 2.0))) * (0.6 + p_shape);
          float dk = length((p - c) * vec2(1.0, 0.8)) - rad;
          float h = clamp(0.5 + 0.5 * (dk - d) / 0.08, 0.0, 1.0);
          d = mix(dk, d, h) - 0.08 * h * (1.0 - h);
        }
        float inShape = pgFill(d);
        float f = pgFbm(p * 2.5 + 4.0, 4.0);
        float region = smoothstep(0.55 - p_stripes * 0.15, 0.57 - p_stripes * 0.15, f);
        float stripe = step(0.5, fract((p.x + f * 0.6) * 34.0));
        float n = max(uInkCount - 2.0, 1.0);
        float k0 = mod(floor(f * 9.0), n);
        vec3 iri = mix(pgInk(2.0 + k0), pgInk(2.0 + mod(k0 + 1.0, n)), stripe);
        vec3 col = mix(pgInk(0.0), iri, region * p_color);
        return mix(col, mix(pgInk(0.0), pgInk(1.0), v), inShape);
      }
    `,
  },
  {
    id: 'pgFrond',
    no: 41,
    name: 'Frond',
    makes: 'degraded still life',
    kind: 'Backgrounds',
    inks: ['#f2e3e7', '#8ff36a', '#111111', '#ffffff'],
    params: [
      slider('blob', 'Plant', 0.55, 0, 1),
      slider('scribble', 'Scribble', 7, 0, 12, 1),
      slider('glitch', 'Glitch', 0.4, 0, 1),
      slider('degrade', 'Degrade', 0.35, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec3 col = pgInk(0.0);
        vec2 dir = normalize(p + 0.00001);
        float rad = (0.16 + 0.22 * p_blob) * (0.7 + 0.6 * pgFbm(dir * 1.4 + 3.0, 3.0));
        float d = length(p - vec2(0.02, -0.01)) - rad;
        d += (pgSpeck() - 0.5) * 0.04 * p_degrade;
        col = mix(col, pgInk(1.0), pgFill(d));
        float lw = pgPx() * 1.3;
        for (int i = 0; i < 12; i++) {
          if (float(i) >= p_scribble) break;
          float fi = float(i);
          vec2 c = (pgR2(vec2(fi, 4.0)) - 0.5) * 0.35;
          vec2 ab = vec2(0.08 + 0.18 * pgR(vec2(fi, 5.0)), 0.03 + 0.08 * pgR(vec2(fi, 6.0)));
          vec2 q = pgRot(pgR(vec2(fi, 7.0)) * PG_PI + pgT() * 0.2) * (p - c);
          float e = (length(q / ab) - 1.0) * min(ab.x, ab.y);
          col = mix(col, pgInk(2.0), 1.0 - smoothstep(lw * 0.5, lw * 1.5, abs(e)));
        }
        for (int i = 0; i < 5; i++) {
          float fi = float(i);
          if (pgR(vec2(fi, 9.0)) > p_glitch) continue;
          vec2 c = (pgR2(vec2(fi, 10.0)) - 0.5) * pgAspect() * 0.85;
          vec2 hs = vec2(0.03 + 0.06 * pgR(vec2(fi, 11.0)), 0.04 + 0.08 * pgR(vec2(fi, 12.0)));
          if (abs(p.x - c.x) < hs.x && abs(p.y - c.y) < hs.y) {
            float bit = step(0.5, pgR(floor((p - c) / (pgPx() * 6.0)) + fi * 7.0));
            col = mix(pgInk(3.0), pgInk(2.0), bit);
          }
        }
        return col;
      }
    `,
  },
  {
    id: 'pgSplice',
    no: 38,
    name: 'Splice',
    makes: 'cut-up riso collages',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#7a5a1c', '#bfe9f2', '#8a4be0', '#e8e0c8', '#111111'],
    params: [
      slider('scale', 'Scale', 4.5, 1, 10),
      slider('wobble', 'Wobble', 0.8, 0, 2),
      slider('outline', 'Outline', 0.6, 0, 1),
      slider('marks', 'Marks', 0.4, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 q = pgDomainWarp(p * p_scale, p_wobble);
        float f = pgField(pgStretch(pgFbm(q, 4.0), 2.4), uv);
        float n = max(uInkCount - 1.0, 1.0);
        float b = floor(clamp(f + pgDitherOffset() * uDither * 2.0 / n, 0.0, 0.9999) * n);
        vec3 col = pgInk(b);
        float e = abs(fract(f * n) - 0.5);
        col = mix(col, pgInk(uInkCount - 1.0), smoothstep(0.5 - 0.07 * p_outline, 0.5, e) * step(0.01, p_outline));
        vec2 mg = p * 55.0;
        vec2 mc = floor(mg);
        vec2 mf = fract(mg) - 0.5;
        float pick = step(1.0 - p_marks * 0.22, pgR(mc));
        float seg = pgSegment(pgRot(pgR(mc + 0.5) * PG_PI) * mf, vec2(-0.32, 0.0), vec2(0.32, 0.0));
        return mix(col, pgInk(uInkCount - 1.0), pick * (1.0 - smoothstep(0.06, 0.11, seg)));
      }
    `,
  },
  {
    id: 'pgChaff',
    no: 37,
    name: 'Chaff',
    makes: 'thrown blade scatters',
    kind: 'Backgrounds',
    inks: ['#e8f4e8', '#3d9a38', '#2a6b28'],
    params: [
      slider('blades', 'Blades', 16, 4, 40, 1),
      slider('size', 'Size', 0.5, 0, 1),
      slider('curve', 'Curve', 0.55, 0, 1),
      slider('specks', 'Specks', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 asp = pgAspect();
        vec3 col = pgInk(0.0);
        for (int i = 0; i < 40; i++) {
          if (float(i) >= p_blades) break;
          float fi = float(i);
          vec2 c = (pgR2(vec2(fi, 2.3)) - 0.5) * asp * 1.1;
          float a = pgR(vec2(fi, 6.1)) * PG_TAU + pgT() * 0.4 * (pgR(vec2(fi, 1.1)) - 0.5);
          float s = mix(0.05, 0.17, p_size) * (0.6 + 0.8 * pgR(vec2(fi, 7.7)));
          vec2 q = pgRot(a) * (p - c) / s;
          // crescent: a unit disc with an offset disc bitten out of it
          float d1 = length(q) - 1.0;
          float d2 = length(q - vec2(0.0, mix(0.25, 0.85, p_curve))) - mix(0.85, 1.05, p_curve);
          float d = max(d1, -d2) * s;
          col = mix(col, pgInk(1.0 + mod(fi, max(uInkCount - 1.0, 1.0))), pgFill(d));
        }
        return mix(col, pgInk(1.0), step(1.0 - p_specks * 0.045, pgSpeck()));
      }
    `,
  },
  {
    id: 'pgStrand',
    no: 36,
    name: 'Strand',
    makes: 'branching rod chains',
    kind: 'Backgrounds',
    inks: ['#14290f', '#3c7af0', '#f2ece2', '#0a1a0a'],
    params: [
      slider('chains', 'Chains', 5, 1, 8, 1),
      slider('length', 'Length', 5, 2, 8, 1),
      slider('thickness', 'Thickness', 0.5, 0, 1),
      slider('rim', 'Rim', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 asp = pgAspect();
        float w = mix(0.022, 0.055, p_thickness);
        float dMin = 10.0;
        float dShadow = 10.0;
        vec2 sh = vec2(0.011, -0.011);
        for (int c = 0; c < 8; c++) {
          if (float(c) >= p_chains) break;
          float fc = float(c);
          vec2 a = (pgR2(vec2(fc, 1.9)) - 0.5) * asp;
          float ang = pgR(vec2(fc, 4.4)) * PG_TAU + pgT() * 0.2;
          for (int s = 0; s < 8; s++) {
            if (float(s) >= p_length) break;
            float fs = float(s);
            ang += (pgR(vec2(fc * 13.0 + fs, 2.2)) - 0.5) * 2.2;
            vec2 b = a + vec2(cos(ang), sin(ang)) * mix(0.09, 0.17, pgR(vec2(fc, fs + 0.5)));
            dMin = min(dMin, pgSegment(p, a, b) - w);
            dShadow = min(dShadow, pgSegment(p - sh, a, b) - w);
            a = b;
          }
        }
        float sp = pgSpeck();
        vec3 col = mix(pgInk(0.0), pgInk(3.0), step(0.6, sp));
        float rimW = 0.006 * (0.3 + p_rim * 1.4);
        col = mix(col, pgInk(2.0), max(pgFill(dShadow), pgFill(dMin - rimW)));
        vec3 rod = mix(pgInk(1.0), pgInk(1.0) * 0.55, step(0.72, sp));
        return mix(col, rod, pgFill(dMin));
      }
    `,
  },
  {
    id: 'pgHusk',
    no: 35,
    name: 'Husk',
    makes: 'eaten husk scatters',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#0b0b0b', '#3a44ee', '#f2f2f2', '#1a1f70'],
    params: [
      slider('count', 'Count', 14, 4, 30, 1),
      slider('size', 'Size', 0.5, 0, 1),
      slider('rim', 'Rim', 0.5, 0, 1),
      slider('speckle', 'Speckle', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 asp = pgAspect();
        float field = 0.0;
        for (int i = 0; i < 30; i++) {
          if (float(i) >= p_count) break;
          float fi = float(i);
          vec2 c = (pgR2(vec2(fi, 3.1)) - 0.5) * asp * 1.05;
          c += 0.02 * vec2(sin(pgT() + fi), cos(pgT() * 0.8 + fi));
          float r = mix(0.03, 0.09, p_size) * (0.5 + pgR(vec2(fi, 5.2)));
          vec2 dv = p - c;
          field += (r * r) / (dot(dv, dv) + 0.00001);
        }
        field *= 0.8 + 0.4 * pgNoise(p * 38.0);
        field = mix(field, pgSrc(uv) * 2.2, uSource);
        float inside = step(1.0, field);
        float rim = step(1.0 - 0.5 * p_rim - 0.05, field) * (1.0 - inside);
        vec3 col = mix(pgInk(0.0), pgInk(2.0), rim);
        vec3 body = mix(pgInk(1.0), pgInk(3.0), step(0.55 + 0.4 * (1.0 - p_speckle), pgSpeck()));
        return mix(col, body, inside);
      }
    `,
  },
  {
    id: 'pgCulture',
    no: 34,
    name: 'Culture',
    makes: 'grainy colony fields',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#132820', '#7dd6e8', '#f07a8a', '#c9425d'],
    params: [
      slider('colonies', 'Colonies', 12, 3, 30, 1),
      slider('size', 'Size', 0.55, 0, 1),
      slider('fuzz', 'Fuzz', 0.5, 0, 1),
      slider('rings', 'Rings', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 asp = pgAspect();
        float f = 0.0;
        for (int i = 0; i < 30; i++) {
          if (float(i) >= p_colonies) break;
          float fi = float(i);
          vec2 c = (pgR2(vec2(fi, 4.7)) - 0.5) * asp * 1.1;
          float r = mix(0.05, 0.14, p_size) * (0.55 + 0.9 * pgR(vec2(fi, 2.9)));
          vec2 dv = p - c;
          f += exp(-dot(dv, dv) / (r * r));
        }
        f = 1.0 - exp(-f * 1.3);
        f += (pgSpeck() - 0.5) * 0.3 * p_fuzz + (pgNoise(p * 30.0) - 0.5) * 0.15 * p_fuzz;
        f = pgField(clamp(f, 0.0, 1.0), uv);
        float n = max(uInkCount - 1.0, 1.0);
        float t2 = pow(clamp((f - 0.28) / 0.72, 0.0, 1.0), mix(1.6, 0.6, p_rings));
        float idx = f < 0.28 ? 0.0 : 1.0 + floor(clamp(t2 + pgDitherOffset() * uDither * 2.0 / n, 0.0, 0.999) * n);
        vec3 col = pgInk(idx);
        return mix(col, pgInk(0.0) * 1.6, step(0.97, pgSpeck()) * step(f, 0.28));
      }
    `,
  },
  {
    id: 'pgCarve',
    no: 33,
    name: 'Carve',
    makes: 'carved panel collages',
    kind: 'Backgrounds',
    inks: ['#111111', '#f4f4f4', '#9dff3a', '#6fd62a'],
    params: [
      slider('panels', 'Rows', 4, 2, 8, 1),
      slider('density', 'Line Density', 24, 4, 60, 1),
      slider('variety', 'Variety', 0.7, 0, 1),
      slider('texture', 'Texture', 0.4, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        float rowsN = p_panels;
        float row = floor(uv.y * rowsN);
        float colsN = 1.0 + floor(pgR(vec2(row, 1.0)) * 3.0);
        vec2 cellCount = vec2(colsN, rowsN);
        vec2 id = vec2(floor(uv.x * colsN), row);
        vec2 lp = fract(uv * cellCount);
        float n = uInkCount;
        float ia = floor(pgR(id + 1.1) * n);
        float ib = mod(ia + 1.0 + floor(pgR(id + 2.2) * (n - 1.0)), n);
        float kind = floor(pgR(id + 0.3) * mix(2.0, 6.0, p_variety));
        float freq = p_density;
        float m;
        if (kind < 0.5) m = step(0.5, fract(p.x * freq));
        else if (kind < 1.5) m = step(0.5, fract(p.y * freq));
        else if (kind < 2.5) m = max(step(0.85, fract(p.x * freq * 0.5)), step(0.85, fract(p.y * freq * 0.5)));
        else if (kind < 3.5) m = step(pgSpeck(), lp.y * 0.9 + p_texture * 0.2);
        else if (kind < 4.5) m = step(fract(p.x * freq * 0.25), abs(fract(p.y * freq * 0.25) - 0.5) * 2.0);
        else m = 0.0;
        vec3 col = mix(pgInk(ia), pgInk(ib), m);
        vec2 edgePx = min(lp, 1.0 - lp) / cellCount * uResolution;
        col = mix(col, pgInk(0.0), step(min(edgePx.x, edgePx.y), 1.5));
        return col + (pgSpeck() - 0.5) * 0.15 * p_texture;
      }
    `,
  },
  {
    id: 'pgSear',
    no: 32,
    name: 'Sear',
    makes: 'smeared thermal fields',
    kind: 'Backgrounds',
    imageReactive: true,
    dither: 0.4,
    inks: ['#163626', '#2c66ff', '#8a6bff', '#ff4fd8', '#e83cff'],
    params: [
      slider('scale', 'Scale', 2.0, 0.5, 6),
      slider('smear', 'Smear', 0.65, 0, 1),
      slider('tear', 'Tear', 0.45, 0, 1),
      slider('streaks', 'Streaks', 0.4, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        float row = floor(p.y * 90.0);
        float frame = floor(pgT() * 6.0);
        float torn = step(1.0 - p_tear * 0.5, pgR(vec2(row, 5.5 + frame)));
        float off = (pgR(vec2(row, 1.7 + frame)) - 0.5) * 0.45 * torn;
        vec2 q = vec2((p.x + off) * mix(1.0, 0.12, p_smear), p.y) * p_scale;
        q = pgDomainWarp(q + vec2(pgT() * 0.1, 0.0), 0.6);
        float f = pgStretch(pgFbm(q, 5.0), 2.4);
        f = pgField(f, vec2(uv.x + off / pgAspect().x, uv.y));
        vec3 col = pgInkD(f);
        return mix(col, pgInk(uInkCount - 1.0), step(0.975, pgR(vec2(row, 9.0))) * p_streaks);
      }
    `,
  },
  {
    id: 'pgBloom',
    no: 31,
    name: 'Bloom',
    makes: 'symmetrical pixel fields',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#a6ef48', '#c9c7f5', '#8d8ae6', '#f4ef6a', '#e7c86a'],
    params: [
      slider('cells', 'Pixels', 36, 8, 96, 1),
      slider('scale', 'Scale', 2.2, 0.5, 6),
      select('symmetry', 'Symmetry', ['Mirror', 'Quad', 'Kaleido'], 'Quad'),
      slider('soft', 'Softness', 0.0, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        float cell = 1.0 / p_cells;
        vec2 q = (floor(p / cell) + 0.5) * cell;
        q.x = abs(q.x);
        if (p_symmetry > 0.5) q.y = abs(q.y);
        if (p_symmetry > 1.5 && q.y > q.x) q = q.yx;
        float f = pgStretch(pgFbm(q * p_scale + vec2(0.0, pgT() * 0.15), 4.0), 2.5);
        f = pgField(f, pgUv(q));
        return mix(pgInkDCell(f, floor(q / cell)), pgInkGrad(f), p_soft);
      }
    `,
  },
  {
    id: 'pgSonar',
    no: 30,
    name: 'Sonar',
    makes: 'dithered landmasses',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#0a0a0a', '#c8c23a', '#ff4f8a', '#5fe0ff'],
    params: [
      slider('scale', 'Scale', 2.6, 0.5, 6),
      slider('level', 'Sea Level', 0.5, 0, 1),
      slider('coast', 'Coastline', 0.5, 0, 1),
      slider('grid', 'Grid', 0.35, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 q = pgDomainWarp(p * p_scale + vec2(pgT() * 0.05, 0.0), 0.8);
        float h = pgField(pgStretch(pgFbm(q, 5.0), 2.2), uv);
        float lvl = p_level;
        float land = pgDitherMask(smoothstep(lvl - 0.06, lvl + 0.06, h));
        vec3 col = mix(pgInk(0.0), pgInk(1.0), land);
        vec2 cellPx = floor(gl_FragCoord.xy / pgDitherCell());
        float dotGrid = step(mod(cellPx.x, 3.0), 0.5) * step(mod(cellPx.y, 3.0), 0.5);
        col = mix(col, pgInk(0.0), dotGrid * land * step(lvl + 0.12, h));
        float coast = (1.0 - smoothstep(0.0, 0.035 * p_coast + 0.001, abs(h - lvl))) * step(0.55, pgSpeck());
        col = mix(col, pgInk(2.0 + step(0.5, pgR(cellPx + 3.0))), coast * step(0.01, p_coast));
        vec2 gl = abs(fract(p * 6.0) - 0.5);
        float grid = step(0.5 - pgPx() * 4.8, max(gl.x, gl.y));
        return mix(col, pgInk(1.0) * 0.7, grid * p_grid * land);
      }
    `,
  },
  {
    id: 'pgPane',
    no: 29,
    name: 'Pane',
    makes: 'gradient panels',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#7a2cff', '#ff4fd8', '#ff3b5c', '#ff9f3a', '#9df05a', '#5fd0ff', '#f2f2f2'],
    params: [
      slider('rows', 'Rows', 3, 1, 6, 1),
      slider('columns', 'Columns', 4, 1, 8, 1),
      slider('soft', 'Softness', 0.8, 0, 1),
      slider('gap', 'Gap', 0, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        float total = 0.0;
        for (int i = 0; i < 6; i++) { if (float(i) >= p_rows) break; total += 0.5 + pgR(vec2(float(i), 1.0)); }
        float acc = 0.0;
        float row = 0.0;
        float y0 = 0.0;
        float y1 = 1.0;
        for (int i = 0; i < 6; i++) {
          if (float(i) >= p_rows) break;
          float w = (0.5 + pgR(vec2(float(i), 1.0))) / total;
          if (uv.y >= acc && uv.y < acc + w) { row = float(i); y0 = acc; y1 = acc + w; }
          acc += w;
        }
        float colsN = 1.0 + floor(pgR(vec2(row, 2.0)) * p_columns);
        float ctotal = 0.0;
        for (int j = 0; j < 8; j++) { if (float(j) >= colsN) break; ctotal += 0.4 + pgR(vec2(row, float(j) + 3.0)); }
        float cacc = 0.0;
        float colIdx = 0.0;
        float x0 = 0.0;
        float x1 = 1.0;
        for (int j = 0; j < 8; j++) {
          if (float(j) >= colsN) break;
          float w = (0.4 + pgR(vec2(row, float(j) + 3.0))) / ctotal;
          if (uv.x >= cacc && uv.x < cacc + w) { colIdx = float(j); x0 = cacc; x1 = cacc + w; }
          cacc += w;
        }
        vec2 id = vec2(colIdx, row);
        vec2 lp = vec2((uv.x - x0) / (x1 - x0), (uv.y - y0) / (y1 - y0));
        float dirSel = pgR(id + 0.7);
        float t = dirSel < 0.4 ? lp.x : (dirSel < 0.8 ? lp.y : (lp.x + lp.y) * 0.5);
        if (pgR(id + 0.9) < 0.5) t = 1.0 - t;
        t = pgField(t, uv);
        t = smoothstep(0.5 - 0.5 * p_soft - 0.02, 0.5 + 0.5 * p_soft + 0.02, t);
        float n = uInkCount;
        vec3 a = pgInk(floor(pgR(id + 1.3) * n));
        vec3 b = pgInk(floor(pgR(id + 2.6) * n));
        vec3 c3 = pgInk(floor(pgR(id + 3.9) * n));
        vec3 g = t < 0.5 ? mix(a, b, t * 2.0) : mix(b, c3, t * 2.0 - 1.0);
        vec2 edgePx = vec2(min(uv.x - x0, x1 - uv.x), min(uv.y - y0, y1 - uv.y)) * uResolution;
        float gap = step(min(edgePx.x, edgePx.y), 1.0 + p_gap * 10.0) * step(0.01, p_gap);
        return mix(g, pgInk(uInkCount - 1.0), gap);
      }
    `,
  },
  {
    id: 'pgMist',
    no: 22,
    name: 'Mist',
    makes: 'sprayed neon washes',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#9cf57a', '#f2c6d8', '#d8c8ae', '#c6efa0', '#f5a6cf'],
    params: [
      slider('scale', 'Scale', 1.4, 0.3, 4),
      slider('streak', 'Streak', 0.7, 0, 1),
      slider('softness', 'Softness', 0.6, 0, 1),
      slider('spray', 'Spray', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 q = p * p_scale * vec2(mix(1.0, 6.0, p_streak), mix(1.0, 0.35, p_streak));
        q = pgDomainWarp(q + vec2(0.0, pgT() * 0.1), 0.5);
        float f = pgStretch(pgFbm(q, 5.0), mix(3.2, 1.3, p_softness));
        f = pgField(f, uv);
        vec3 col = mix(pgInkGrad(f), pgInkD(f), uDither);
        return col + (pgSpeck() - 0.5) * 0.14 * p_spray;
      }
    `,
  },
  {
    id: 'pgDelta',
    no: 21,
    name: 'Delta',
    makes: 'corrupted satellite mosaics',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#211866', '#4628b0', '#7c5ad8', '#c8ff48', '#98ff5a', '#e6d0ff'],
    params: [
      slider('scale', 'Scale', 2.5, 0.5, 6),
      slider('blocks', 'Blocks', 0.45, 0, 1),
      slider('pixels', 'Pixels', 0.5, 0, 1),
      slider('band', 'Top Band', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 q = pgDomainWarp(p * p_scale, 1.0);
        float f = pgField(pgStretch(pgFbm(q, 6.0), 2.0), uv);
        vec3 col = mix(pgInk(0.0), pgInk(1.0), smoothstep(0.2, 0.55, f));
        col = mix(col, pgInk(2.0), smoothstep(0.55, 0.85, f));
        col = mix(col, pgInk(5.0), smoothstep(0.85, 1.0, f) * 0.6);
        vec2 bg = p * 9.0;
        vec2 bc = floor(bg);
        vec2 bf = fract(bg);
        float inBlock = step(1.0 - p_blocks * 0.22, pgR(bc)) * step(0.08, bf.x) * step(bf.x, 0.92) * step(0.12, bf.y) * step(bf.y, 0.88);
        col = mix(col, pgInk(3.0 + mod(bc.x + bc.y, 2.0)), inBlock);
        vec2 pc = floor(p * 72.0);
        float pix = step(1.0 - p_pixels * 0.45, pgNoise(p * 5.0 + 20.0)) * step(0.55, pgR(pc));
        col = mix(col, pgInk(3.0 + mod(pc.x, 2.0)), pix);
        float top = step(0.5 * pgAspect().y - 0.05 * p_band, p.y) * step(0.01, p_band);
        return mix(col, pgInk(4.0), top);
      }
    `,
  },
  {
    id: 'pgPrism',
    no: 19,
    name: 'Prism',
    makes: 'pixel aurora backdrops',
    kind: 'Backgrounds',
    imageReactive: true,
    dither: 0.6,
    inks: ['#050505', '#2a3cff', '#c43cff', '#ff5a2a', '#ffc83a', '#ffffff'],
    params: [
      slider('cells', 'Pixels', 56, 16, 120, 1),
      slider('waves', 'Waves', 2, 1, 4, 1),
      slider('spread', 'Spread', 0.5, 0, 1),
      slider('dots', 'Dots', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        float cell = 1.0 / p_cells;
        vec2 cid = floor(p / cell);
        vec2 q = (cid + 0.5) * cell;
        float glow = 0.0;
        for (int i = 0; i < 4; i++) {
          if (float(i) >= p_waves) break;
          float fi = float(i);
          float yc = (pgR(vec2(fi, 1.0)) - 0.5) * pgAspect().y * 0.8;
          float amp = 0.05 + 0.15 * pgR(vec2(fi, 2.0));
          float fr = 2.0 + 4.0 * pgR(vec2(fi, 3.0));
          float y = yc + amp * sin(q.x * fr + pgR(vec2(fi, 4.0)) * PG_TAU + pgT() * 0.6) + 0.05 * (pgNoise(vec2(q.x * 6.0, fi * 7.0)) - 0.5);
          float d = q.y - y;
          float w = mix(0.03, 0.2, p_spread);
          // an aurora curtain: long falloff above the bright edge, sharp below
          glow += exp(-abs(d) / (d > 0.0 ? w : w * 0.35));
        }
        glow = pgField(clamp(glow, 0.0, 1.0), pgUv(q));
        vec3 col = pgInkDCell(glow, cid);
        vec2 dc = fract(p * 40.0) - 0.5;
        float dotm = (1.0 - step(0.12, length(dc))) * p_dots * step(glow, 0.12);
        return mix(col, pgInk(1.0) * 0.5, dotm);
      }
    `,
  },
  {
    id: 'pgRise',
    no: 18,
    name: 'Rise',
    makes: 'radial stripe arcs',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#6c2a3a', '#5fe0a0', '#2f8a6a'],
    params: [
      slider('stripes', 'Stripes', 22, 6, 60, 1),
      slider('rings', 'Rings', 2, 1, 5, 1),
      slider('offset', 'Offset', 0.3, 0, 1),
      slider('angle', 'Angle', 0, 0, 180, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 r = pgRot(radians(p_angle)) * p;
        vec2 c = (pgR2(vec2(3.0, 1.0)) - 0.5) * p_offset * 0.6;
        float k = 0.0;
        for (int i = 0; i < 5; i++) {
          if (float(i) >= p_rings) break;
          float fi = float(i);
          float rad = 0.46 * (1.0 - fi / (p_rings + 0.6));
          k += step(length(p - c * (fi + 1.0)), rad);
        }
        // each ring changes the stripe weight and flips which ink is the ground
        float duty = mix(0.5 + 0.32 * sin(k * 1.9 + 0.6), pgSrc(uv), uSource);
        float s = step(duty, fract(r.x * p_stripes));
        vec3 a = pgInk(0.0);
        vec3 b = pgInk(1.0 + mod(k, max(uInkCount - 1.0, 1.0)));
        return mod(k, 2.0) > 0.5 ? mix(b, a, s) : mix(a, b, s);
      }
    `,
  },
  {
    id: 'pgAura',
    no: 6,
    name: 'Aura',
    makes: 'soft vibrant gradients',
    kind: 'Backgrounds',
    imageReactive: true,
    grain: 0.08,
    inks: ['#f0a0c4', '#ffd24a', '#ff7aa0', '#f6c89a', '#e86aa6'],
    params: [
      slider('scale', 'Scale', 1.3, 0.3, 4),
      slider('warp', 'Warp', 1.6, 0, 3),
      slider('detail', 'Detail', 4, 1, 6, 1),
      slider('softness', 'Softness', 0.8, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 q = p * p_scale + vec2(pgT() * 0.05, pgT() * 0.03);
        q = pgDomainWarp(q, p_warp);
        q = pgDomainWarp(q * 1.3, p_warp * 0.5);
        float f = pgStretch(pgFbm(q, p_detail), mix(4.0, 1.6, p_softness));
        f = pgField(f, uv);
        return mix(pgInkD(f), pgInkGrad(f), p_softness * (1.0 - uDither));
      }
    `,
  },
  {
    id: 'pgFilament',
    no: 3,
    name: 'Filament',
    makes: 'flowing thread fields',
    kind: 'Backgrounds',
    imageReactive: true,
    inks: ['#08081e', '#3a4cff', '#8fa0ff', '#ffffff', '#ff6aa0'],
    params: [
      slider('density', 'Threads', 55, 10, 120, 1),
      slider('warp', 'Warp', 1.6, 0, 3),
      slider('thickness', 'Thickness', 0.55, 0, 1),
      slider('coverage', 'Coverage', 0.7, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 q = pgDomainWarp(p * 1.4 + vec2(pgT() * 0.04, 0.0), p_warp);
        float f = pgField(pgFbm(q, 4.0), uv);
        float lines = abs(fract(f * p_density) - 0.5) * 2.0;
        float thread = 1.0 - smoothstep(0.0, mix(0.06, 0.3, p_thickness), lines);
        float dots = step(0.15, pgSpeck());
        float halo = (1.0 - smoothstep(0.0, 0.7, lines)) * 0.3;
        float mask = smoothstep(0.55 - p_coverage * 0.4, 0.62 - p_coverage * 0.4, pgFbm(p * 1.8 + 7.0, 3.0));
        vec3 tc = pgInk(1.0 + mod(floor(f * p_density * 0.37), max(uInkCount - 1.0, 1.0)));
        return mix(pgInk(0.0), tc, max(thread * dots, halo) * mask);
      }
    `,
  },
  {
    id: 'pgTerrain',
    no: 2,
    name: 'Terrain',
    makes: 'layered contour landscapes',
    kind: 'Backgrounds',
    imageReactive: true,
    dither: 0.5,
    grain: 0.3,
    inks: ['#ff5ad8', '#a05aff', '#5fe0d0', '#f5f06a', '#7af07a', '#ff9fd0'],
    params: [
      slider('fieldScale', 'Field Scale', 2.6, 0.5, 6),
      slider('warp', 'Warp', 1.1, 0, 2),
      slider('detail', 'Detail', 5, 1, 7, 1),
      slider('contrast', 'Contrast', 1.7, 0.5, 3),
      slider('blockiness', 'Blockiness', 0, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 pp = p;
        if (p_blockiness > 0.001) {
          float cell = mix(0.003, 0.05, p_blockiness);
          pp = (floor(p / cell) + 0.5) * cell;
        }
        vec2 q = pgDomainWarp(pp * p_fieldScale + vec2(pgT() * 0.05, 0.0), p_warp);
        float f = pgStretch(pgFbm(q, p_detail), p_contrast);
        f = pgField(f, pgUv(pp));
        return pgInkD(f);
      }
    `,
  },
]
