import { slider } from './params'
import type { PlaygroundTool } from './types'

export const TEXTURES: PlaygroundTool[] = [
  {
    id: 'pgPith',
    no: 42,
    name: 'Pith',
    makes: 'dithered cell tissue',
    kind: 'Textures',
    imageReactive: true,
    inks: ['#0b0b05', '#4a4a8a', '#b6ff3a', '#e0e0c0'],
    params: [
      slider('cells', 'Cells', 14, 4, 30, 1),
      slider('coverage', 'Coverage', 0.62, 0, 1),
      slider('membrane', 'Membrane', 0.5, 0, 1),
      slider('dots', 'Dots', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec3 v = pgVoronoi(p * p_cells + vec2(pgT() * 0.2, 0.0), 0.9);
        float mask = pgField(pgFbm(p * 2.0 + 3.0, 4.0) + (0.2 - length(p) * 0.4), uv);
        float inside = step(mix(0.78, 0.32, p_coverage), mask);
        // F2 - F1 is small near cell borders: that band is the membrane
        float mem = 1.0 - smoothstep(0.02, 0.06 + 0.15 * p_membrane, v.y - v.x);
        vec3 col = pgInk(0.0);
        vec2 dc = floor(gl_FragCoord.xy / (pgDitherCell() * 2.0));
        col = mix(col, pgInk(3.0), step(1.0 - p_dots * 0.03, pgR(dc)));
        vec3 cellc = mix(pgInk(1.0), pgInk(1.0) * 0.7, step(0.5, v.z));
        vec3 tissue = mix(cellc, pgInk(2.0), pgDitherMask(mem));
        return mix(col, tissue, inside);
      }
    `,
  },
  {
    id: 'pgMosh',
    no: 28,
    name: 'Mosh',
    makes: 'corrupted signal',
    kind: 'Textures',
    imageReactive: true,
    inks: ['#111111', '#ff3ad8', '#5ff07a', '#f0f03a', '#3a5aff', '#ffffff', '#a03aff', '#5fe0ff'],
    params: [
      slider('bands', 'Bands', 6, 1, 12, 1),
      slider('resolution', 'Resolution', 150, 20, 300, 1),
      slider('spread', 'Colour Spread', 0.62, 0, 1),
      slider('tears', 'Tears', 0.55, 0, 1),
      slider('smear', 'Smear', 0.5, 0, 1),
      slider('flashes', 'Flashes', 0.3, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        float frame = floor(pgT() * 8.0);
        float b = floor(uv.y * p_bands);
        float kind = floor(pgR(vec2(b, 3.0 + frame)) * 3.0);
        float rows = p_resolution * 0.5;
        float row = floor(uv.y * rows);
        float tear = (pgR(vec2(row, 5.0 + frame)) - 0.5) * 0.3 * step(1.0 - p_tears * 0.5, pgR(vec2(row, 6.0 + frame)));
        vec2 su = vec2(uv.x + tear, uv.y);
        su.x = mix(su.x, floor(su.x * 6.0) / 6.0, p_smear * step(0.5, pgR(vec2(row, 7.0))));
        vec2 bc = floor(vec2(su.x * p_resolution, su.y * rows));
        float n = uInkCount;
        float base = floor(pgR(vec2(b, 8.0)) * n);
        float idx;
        if (kind < 0.5) idx = base + floor(pgR(bc) * n * p_spread);
        else if (kind < 1.5) idx = base + mod(bc.y, 2.0) + floor(su.x * 3.0) * p_spread * 2.0;
        else idx = base + floor(pgNoise(bc * 0.15) * n * p_spread * 1.5);
        vec3 col = pgInk(idx);
        // with Image up, the photo itself runs through the same corruption
        vec3 img = floor(texture2D(tDiffuse, clamp(su, 0.0, 1.0)).rgb * 6.0) / 6.0;
        col = mix(col, img, uSource);
        return mix(col, vec3(1.0), step(1.0 - p_flashes * 0.08, pgR(vec2(row, 9.0 + frame))));
      }
    `,
  },
  {
    id: 'pgAtlas',
    no: 24,
    name: 'Atlas',
    makes: 'text-mode terrain maps',
    kind: 'Textures',
    imageReactive: true,
    inks: ['#0f3a3a', '#5fd8f0', '#e05a6a', '#d8703a'],
    params: [
      slider('cells', 'Characters', 60, 20, 120, 1),
      slider('scale', 'Scale', 2.4, 0.5, 6),
      slider('contrast', 'Contrast', 1.8, 0.5, 3),
      slider('glyphs', 'Glyphs', 0.85, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 cs = p_cells * vec2(1.0, 0.6);
        vec2 g = p * cs;
        vec2 c = floor(g);
        vec2 f = fract(g);
        vec2 cc = (c + 0.5) / cs;
        float h = pgStretch(pgFbm(pgDomainWarp(cc * p_scale + vec2(pgT() * 0.04, 0.0), 0.8), 5.0), p_contrast);
        h = pgField(h, pgUv(cc));
        float band = floor(clamp(h, 0.0, 0.999) * uInkCount);
        vec3 ink = pgInk(band);
        // each elevation band gets its own small family of "characters"
        float gl = pgGlyph(f, band * 7.0 + floor(pgR(c) * 3.0)) * step(1.0 - p_glyphs, pgR(c + 1.0));
        vec3 glyphCol = band < 0.5 ? pgInk(1.0) * 0.6 : ink * 0.22;
        return mix(ink, glyphCol, gl);
      }
    `,
  },
  {
    id: 'pgStipple',
    no: 14,
    name: 'Stipple',
    makes: 'halftone dot portraits of light',
    kind: 'Textures',
    imageReactive: true,
    inks: ['#0a0a0a', '#5a1a2a', '#ff5a3a', '#ffb03a', '#ff6ad8', '#fff0c0'],
    params: [
      slider('cells', 'Dots', 90, 20, 200, 1),
      slider('contrast', 'Contrast', 1.4, 0.5, 3),
      slider('size', 'Dot Size', 0.8, 0, 1),
      slider('jitter', 'Jitter', 0.3, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 pgMain(vec2 p, vec2 uv) {
        vec2 g = p * p_cells;
        vec2 c = floor(g);
        vec2 f = fract(g) - 0.5;
        vec2 cc = (c + 0.5) / p_cells;
        float light = 0.0;
        for (int i = 0; i < 5; i++) {
          float fi = float(i);
          vec2 lp = (pgR2(vec2(fi, 3.0)) - 0.5) * pgAspect() * 0.9 + 0.05 * vec2(sin(pgT() + fi), cos(pgT() * 0.7 + fi));
          float rad = 0.15 + 0.25 * pgR(vec2(fi, 4.0));
          light += exp(-dot(cc - lp, cc - lp) / (rad * rad)) * (0.4 + 0.6 * pgR(vec2(fi, 5.0)));
        }
        light = clamp((light * 0.8 - 0.5) * p_contrast + 0.5, 0.0, 1.0);
        // Image up = a halftone portrait of the photo itself
        light = pgField(light, pgUv(cc));
        vec2 jit = (pgR2(c) - 0.5) * p_jitter * 0.4;
        float r = sqrt(light) * 0.5 * p_size;
        float dotm = 1.0 - smoothstep(r - 0.06, r + 0.06, length(f - jit));
        return mix(pgInk(0.0), pgInkGrad(light), dotm * step(0.02, light));
      }
    `,
  },
]
