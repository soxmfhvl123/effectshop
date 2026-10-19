import { slider } from './params'
import type { SandboxTool } from './types'

// Surface textures, mostly meant to run over a photo. Movements are read as
// sbMv(0.0) / sbMv(1.0) / sbMv(2.0), in the order of `movements`.
export const SURFACES: SandboxTool[] = [
  {
    id: 'sbBitrot',
    no: 49,
    name: 'Bitrot',
    makes: 'corrupted signal bands',
    kind: 'Surfaces',
    imageReactive: true,
    inks: ['#111111', '#ff3ad8', '#5ff07a', '#f0f03a', '#3a5aff', '#ffffff', '#a03aff', '#5fe0ff'],
    movements: ['Glitch', 'Slip', 'Flash'],
    params: [
      slider('bands', 'Bands', 6, 1, 12, 1),
      slider('resolution', 'Resolution', 150, 20, 300, 1),
      slider('spread', 'Colour Spread', 0.62, 0, 1),
      slider('tears', 'Tears', 0.55, 0, 1),
      slider('smear', 'Smear', 0.5, 0, 1),
      slider('flashes', 'Flashes', 0.3, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mGlitch = sbMv(0.0);
        float mSlip = sbMv(1.0);
        float mFlash = sbMv(2.0);
        // Glitch: the corruption re-rolls on every frame
        float frame = sbFrame() * step(0.001, mGlitch);
        float b = floor(uv.y * p_bands);
        float kind = floor(sbR(vec2(b, 3.0 + frame)) * 3.0);
        float rows = p_resolution * 0.5;
        float row = floor(uv.y * rows);
        float tear = (sbR(vec2(row, 5.0 + frame)) - 0.5) * 0.3 * step(1.0 - (p_tears + mGlitch * 0.3) * 0.5, sbR(vec2(row, 6.0 + frame)));
        // Slip: whole bands lurch sideways and back in steps
        float slip = floor(4.0 * mSlip * sbOsc(sbR(vec2(b, 10.0))) + 0.5) / 12.0;
        vec2 su = vec2(uv.x + tear + slip, uv.y);
        su.x = mix(su.x, floor(su.x * 6.0) / 6.0, p_smear * step(0.5, sbR(vec2(row, 7.0))));
        vec2 bc = floor(vec2(su.x * p_resolution, su.y * rows));
        float n = uInkCount;
        float base = floor(sbR(vec2(b, 8.0 + frame)) * n);
        float idx;
        if (kind < 0.5) idx = base + floor(sbR(bc) * n * p_spread);
        else if (kind < 1.5) idx = base + mod(bc.y, 2.0) + floor(su.x * 3.0) * p_spread * 2.0;
        else idx = base + floor(sbNoise(bc * 0.15) * n * p_spread * 1.5);
        vec3 col = sbInk(idx);
        // with Image up, the photo itself runs through the same corruption
        vec3 img = floor(texture2D(tDiffuse, clamp(su, 0.0, 1.0)).rgb * 6.0) / 6.0;
        col = mix(col, img, uSource);
        // Flash: white rows strobe on and off
        float flashFrame = sbFrame() * step(0.001, mFlash) + frame;
        return mix(col, vec3(1.0), step(1.0 - (p_flashes + mFlash * 0.5) * 0.08, sbR(vec2(row, 9.0 + flashFrame))));
      }
    `,
  },
  {
    id: 'sbSpotlight',
    no: 50,
    name: 'Spotlight',
    makes: 'halftone pools of light',
    kind: 'Surfaces',
    imageReactive: true,
    inks: ['#0a0a0a', '#5a1a2a', '#ff5a3a', '#ffb03a', '#ff6ad8', '#fff0c0'],
    movements: ['Wander', 'Pulse', 'Shimmer'],
    params: [
      slider('cells', 'Dots', 90, 20, 200, 1),
      slider('contrast', 'Contrast', 1.4, 0.5, 3),
      slider('size', 'Dot Size', 0.8, 0, 1),
      slider('jitter', 'Jitter', 0.3, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        float mShimmer = sbMv(2.0);
        vec2 g = p * p_cells;
        vec2 c = floor(g);
        vec2 f = fract(g) - 0.5;
        vec2 cc = (c + 0.5) / p_cells;
        float light = 0.0;
        for (int i = 0; i < 5; i++) {
          float fi = float(i);
          // Wander: each lamp drifts on its own circuit
          vec2 lp = (sbR2(vec2(fi, 3.0)) - 0.5) * sbAspect() * 0.9 + sbCirc(fi * 0.19 + sbR(vec2(fi, 6.0))) * 0.14 * sbMv(0.0);
          float rad = 0.15 + 0.25 * sbR(vec2(fi, 4.0));
          // Pulse: lamps brighten and dim out of step
          float power = (0.4 + 0.6 * sbR(vec2(fi, 5.0))) * (1.0 + 0.55 * sbMv(1.0) * sbOsc(fi * 0.23));
          light += exp(-dot(cc - lp, cc - lp) / (rad * rad)) * power;
        }
        light = clamp((light * 0.8 - 0.5) * p_contrast + 0.5, 0.0, 1.0);
        // Image up = a halftone portrait of the photo itself
        light = sbField(light, sbUv(cc));
        // Shimmer: the dots jostle in their cells every frame
        vec2 jit = (sbR2(c) - 0.5) * p_jitter * 0.4 + (vec2(sbFr(c), sbFr(c + 3.1)) - 0.5) * 0.3 * mShimmer;
        float r = sqrt(light) * 0.5 * p_size;
        float dotm = 1.0 - smoothstep(r - 0.06, r + 0.06, length(f - jit));
        return mix(sbInk(0.0), sbInkGrad(light), dotm * step(0.02, light));
      }
    `,
  },
  {
    id: 'sbTissue',
    no: 51,
    name: 'Tissue',
    makes: 'dithered cell tissue',
    kind: 'Surfaces',
    imageReactive: true,
    inks: ['#0b0b05', '#4a4a8a', '#b6ff3a', '#e0e0c0'],
    movements: ['Boil', 'Grow', 'Flow'],
    params: [
      slider('cells', 'Cells', 14, 4, 30, 1),
      slider('coverage', 'Coverage', 0.62, 0, 1),
      slider('membrane', 'Membrane', 0.5, 0, 1),
      slider('dots', 'Dots', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        // Boil wobbles the cell walls every frame; Flow drifts the cells round
        vec2 vp = sbBoil(p, sbMv(0.0) * 1.4) * p_cells + sbDrift(sbMv(2.0)) * 2.0;
        vec3 v = sbVoronoi(vp, 0.9);
        float mask = sbField(sbFbm(p * 2.0 + 3.0 + sbDrift(sbMv(2.0)) * 0.4, 4.0) + (0.2 - length(p) * 0.4), uv);
        // Grow: the tissue spreads and recedes
        float coverage = clamp(p_coverage + 0.28 * sbMv(1.0) * sbOsc(0.0), 0.0, 1.0);
        float inside = step(mix(0.78, 0.32, coverage), mask);
        // F2 - F1 is small near cell borders: that band is the membrane
        float mem = 1.0 - smoothstep(0.02, 0.06 + 0.15 * p_membrane, v.y - v.x);
        vec3 col = sbInk(0.0);
        vec2 dc = floor(gl_FragCoord.xy / (sbDitherCell() * 2.0));
        col = mix(col, sbInk(3.0), step(1.0 - p_dots * 0.03, mix(sbR(dc), sbFr(dc), step(0.001, sbMv(0.0)))));
        vec3 cellc = mix(sbInk(1.0), sbInk(1.0) * 0.7, step(0.5, v.z));
        vec3 tissue = mix(cellc, sbInk(2.0), sbDitherMask(mem));
        return mix(col, tissue, inside);
      }
    `,
  },
  {
    id: 'sbTopo',
    no: 52,
    name: 'Topo',
    makes: 'text-mode relief maps',
    kind: 'Surfaces',
    imageReactive: true,
    inks: ['#0f3a3a', '#5fd8f0', '#e05a6a', '#d8703a'],
    movements: ['Drift', 'Shuffle', 'Rise'],
    params: [
      slider('cells', 'Characters', 60, 20, 120, 1),
      slider('scale', 'Scale', 2.4, 0.5, 6),
      slider('contrast', 'Contrast', 1.8, 0.5, 3),
      slider('glyphs', 'Glyphs', 0.85, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 cs = p_cells * vec2(1.0, 0.6);
        vec2 g = p * cs;
        vec2 c = floor(g);
        vec2 f = fract(g);
        vec2 cc = (c + 0.5) / cs;
        float h = sbStretch(sbFbm(sbDomainWarp(cc * p_scale + sbDrift(sbMv(0.0)) * 1.2, 0.8), 5.0), p_contrast);
        h = sbField(h, sbUv(cc));
        // Rise: elevation bands climb and wrap round
        float mRise = sbMv(2.0);
        if (mRise > 0.0) h = fract(h - sbMarch(mRise));
        float band = floor(clamp(h, 0.0, 0.999) * uInkCount);
        vec3 ink = sbInk(band);
        // each elevation band gets its own small family of "characters";
        // Shuffle re-types them cell by cell
        float hop = sbHop(sbR(c + 4.4), sbMv(1.0));
        float gl = sbGlyph(f, band * 7.0 + floor(sbR(c + hop * 1.3) * 3.0)) * step(1.0 - p_glyphs, sbR(c + 1.0));
        vec3 glyphCol = band < 0.5 ? sbInk(1.0) * 0.6 : ink * 0.22;
        return mix(ink, glyphCol, gl);
      }
    `,
  },
]
