import { select, slider } from './params'
import type { SandboxTool } from './types'

// Smooth colour fields. These blend their inks in OKLab (sbInkOk /
// sbInkLoop / sbMixOk in the kit) so transitions stay clean, and default to
// a little grain to keep 8-bit output from banding. Movements are read as
// sbMv(0.0) / sbMv(1.0) / sbMv(2.0), in the order of `movements`.
export const GRADIENTS: SandboxTool[] = [
  {
    id: 'sbMesh',
    no: 53,
    name: 'Mesh',
    makes: 'free-form mesh gradients',
    kind: 'Gradients',
    imageReactive: true,
    grain: 0.1,
    inks: ['#ff6a3d', '#ffb4a2', '#7b5cff', '#2ad4ff', '#fff3d6'],
    movements: ['Drift', 'Churn', 'Breathe'],
    params: [
      slider('points', 'Points', 5, 2, 8, 1),
      slider('softness', 'Softness', 0.55, 0, 1),
      slider('warp', 'Warp', 0.6, 0, 2),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        float mDrift = sbMv(0.0);
        vec2 q = sbChurn(p * 1.5, sbMv(1.0) * 2.5) / 1.5;
        q += p_warp * 0.12 * (vec2(sbFbm(p * 1.3 + 2.0, 3.0), sbFbm(p * 1.3 + 7.0, 3.0)) - 0.5);
        // a sharper falloff gives distinct pools of colour, a softer one a haze;
        // Breathe swings between the two
        float soft = clamp(p_softness + 0.45 * sbMv(2.0) * sbOsc(0.0), 0.0, 1.0);
        float reach = mix(0.18, 0.55, soft);
        float spin = sbR(vec2(7.0, 7.0)) * SB_TAU;
        vec3 acc = vec3(0.0);
        float wsum = 0.0;
        for (int i = 0; i < 8; i++) {
          if (float(i) >= p_points) break;
          float fi = float(i);
          // spread round a loose ring (one near the middle) so points never bunch up
          float ang = fi / p_points * SB_TAU + spin + (sbR(vec2(fi, 2.7)) - 0.5) * 1.2;
          float rad = fi < 0.5 ? 0.06 * sbR(vec2(fi, 3.1)) : 0.28 + 0.2 * sbR(vec2(fi, 3.1));
          vec2 c = vec2(cos(ang), sin(ang)) * rad * asp;
          // Drift: every colour point loops its own lazy circle
          c += sbCirc(sbR(vec2(fi, 5.1))) * (0.2 + 0.12 * sbR(vec2(fi, 6.2))) * mDrift;
          // with Image up, each point takes its colour from the photo beneath it
          vec3 ink = mix(sbInk(fi), texture2D(tDiffuse, clamp(sbUv(c), 0.0, 1.0)).rgb, uSource);
          vec2 d = q - c;
          float w = exp(-dot(d, d) / (reach * reach)) + 0.00001;
          acc += sbToOk(ink) * w;
          wsum += w;
        }
        return sbFromOk(acc / max(wsum, 0.000001));
      }
    `,
  },
  {
    id: 'sbFluted',
    no: 54,
    name: 'Fluted',
    makes: 'gradients through ribbed glass',
    kind: 'Gradients',
    imageReactive: true,
    grain: 0.08,
    inks: ['#05060f', '#0b1fd8', '#2f6bff', '#8fc8ff', '#f4f1ff'],
    movements: ['Sweep', 'Slide', 'Bend'],
    params: [
      select('base', 'Under the Glass', ['Linear', 'Radial', 'Sweep']),
      slider('ribs', 'Ribs', 16, 3, 80, 1),
      slider('refraction', 'Refraction', 0.6, 0, 1),
      slider('angle', 'Angle', 20, 0, 180, 1),
      slider('curve', 'Curve', 0.45, 0, 1),
      slider('contrast', 'Contrast', 1.2, 0.5, 3),
      slider('sheen', 'Sheen', 0.4, 0, 1),
    ],
    glsl: /* glsl */ `
      float flutedBase(vec2 sp) {
        vec2 c = (sbR2(vec2(3.0, 9.0)) - 0.5) * 0.6;
        // Sweep: the light behind the glass swings back and forth
        float a = radians(p_angle) + 0.7 + (sbR(vec2(5.0, 5.0)) - 0.5) * 1.6 + 0.7 * sbMv(0.0) * sbOsc(0.0);
        if (p_base < 0.5) return dot(sp, vec2(cos(a), sin(a))) * 1.15 + 0.5;
        if (p_base < 1.5) return length(sp - c) * 1.35 + 0.25 * sbMv(0.0) * sbOsc(0.0);
        return atan(sp.y - c.y, sp.x - c.x) / SB_TAU + a / SB_TAU;
      }
      vec3 sbMain(vec2 p, vec2 uv) {
        float ang = radians(p_angle);
        vec2 n = vec2(cos(ang), sin(ang));
        vec2 r = sbRot(ang) * p;
        // the ribs bow into arcs; Bend flexes them
        float curve = p_curve + 0.5 * sbMv(2.0) * sbOsc(0.0);
        float s = r.x + curve * 1.3 * r.y * r.y;
        // Slide: the glass moves over the gradient a whole rib at a time
        float sr = s * p_ribs + sbMarch(sbMv(1.0));
        float f = fract(sr) - 0.5;
        // inside each rib the scene is a squeezed, mirrored slice: reeded glass
        vec2 sp = p - n * f * p_refraction * (0.08 + 2.0 / p_ribs);
        float t = flutedBase(sp);
        vec3 col = p_base > 1.5 ? sbInkLoop(t) : sbInkOk(sbStretch(t, p_contrast));
        // the photo itself, seen through the glass
        col = mix(col, texture2D(tDiffuse, clamp(sbUv(sp), 0.0, 1.0)).rgb, uSource);
        // a thin highlight down one edge of every rib, a shadow down the other
        float hl = smoothstep(0.3, 0.5, f);
        float sh = smoothstep(-0.3, -0.5, f);
        return col * (1.0 - 0.35 * p_sheen * sh) + 0.25 * p_sheen * hl;
      }
    `,
  },
  {
    id: 'sbHourglass',
    no: 55,
    name: 'Hourglass',
    makes: 'mirrored ribbon tunnels',
    kind: 'Gradients',
    grain: 0.08,
    inks: ['#04040c', '#1426d6', '#3d7bff', '#9fd4ff', '#eef4ff', '#2433a8'],
    movements: ['Flow', 'Breathe', 'Rise'],
    params: [
      slider('bands', 'Ribbons', 7, 2, 20, 1),
      slider('pinch', 'Pinch', 0.65, 0, 1),
      slider('waist', 'Waist', 0.55, 0, 1),
      slider('softness', 'Softness', 0.55, 0, 1),
      slider('relief', 'Relief', 0.6, 0, 1),
      slider('glow', 'Glow', 0.5, 0, 1),
      slider('steps', 'Steps', 0, 0, 40, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        // Rise: the waist floats up and down
        float waist = (p_waist - 0.5) * asp.y * 0.9 + 0.07 * sbMv(2.0) * sbOsc(0.0);
        float y = p.y - waist;
        if (p_steps > 0.5) y = (floor(y * p_steps) + 0.5) / p_steps;
        // Breathe: the ribbons cinch in and let out
        float pinch = clamp(p_pinch + 0.35 * sbMv(1.0) * sbOsc(0.0), 0.0, 1.0);
        // mirrored about the spine; ribbons crowd together at the waist
        float u = abs(p.x) / (mix(0.9, 0.1, pinch) + pinch * abs(y) * 1.8);
        float v = u * p_bands;
        float k = floor(v);
        float f = fract(v);
        // Flow: colour streams out through the ribbons, a whole palette a cycle
        float spread = mix(0.12, 0.42, sbR(vec2(2.0, 5.0)));
        float flow = sbMarch(sbMv(0.0));
        float soft = mix(0.05, 0.6, p_softness);
        vec3 col = sbMixOk(sbInkLoop(k * spread - flow), sbInkLoop((k + 1.0) * spread - flow), smoothstep(1.0 - soft, 1.0, f));
        // each ribbon is rounded: brightest along its middle
        col *= mix(1.0, 0.65 + 0.45 * sin(f * SB_PI), p_relief);
        // light pools at the waist
        float glow = exp(-abs(y) * mix(14.0, 3.0, p_glow)) * p_glow;
        return sbMixOk(col, vec3(1.0), clamp(glow * 0.55, 0.0, 1.0));
      }
    `,
  },
  {
    id: 'sbLumen',
    no: 56,
    name: 'Lumen',
    makes: 'glowing light-room tunnels',
    kind: 'Gradients',
    grain: 0.1,
    inks: ['#7b3cff', '#d36bff', '#ffb7a6', '#f08a5d', '#4d3bd6'],
    movements: ['Pour', 'Breathe', 'Sway'],
    params: [
      select('shape', 'Shape', ['Room', 'Well']),
      slider('depth', 'Depth', 0.65, 0, 1),
      slider('perspective', 'Perspective', 0.45, 0, 1),
      slider('spread', 'Colour Range', 0.6, 0.2, 2.5),
      slider('faces', 'Walls', 0.3, 0, 1),
      slider('glow', 'Glow', 0.6, 0, 1),
      slider('haze', 'Haze', 0.3, 0, 1),
    ],
    glsl: /* glsl */ `
      float lumenShape(vec2 q, vec2 a) {
        vec2 r = q / a;
        return p_shape < 0.5 ? max(abs(r.x), abs(r.y)) : length(r);
      }
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        // the opening is the frame itself; a well's rings are ellipses, flattened by perspective
        vec2 a = asp * 0.5;
        if (p_shape > 0.5) a = vec2(max(asp.x, asp.y)) * 0.62 * vec2(1.0, mix(1.0, 0.6, p_perspective));
        // the far wall sits below centre (deeper with Perspective); Sway circles it
        vec2 vp = vec2((sbR(vec2(2.0, 8.0)) - 0.5) * 0.25 * asp.x, -p_perspective * 0.4 * asp.y) + sbCirc(0.0) * vec2(0.16, 0.08) * sbMv(2.0);
        // Breathe: the far wall comes closer and recedes
        float far = clamp(mix(0.55, 0.04, p_depth) * (1.0 + 1.0 * sbMv(1.0) * sbOsc(0.0)), 0.01, 0.9);
        // s: how deep into the room p sits, 0 at the opening to 1 at the far wall.
        // Cross-sections slide from the frame toward the vanishing point and
        // shrink, so p's depth is where it lands on a cross-section's edge.
        float s;
        if (lumenShape(p, a) >= 1.0) s = 0.0;
        else if (lumenShape(p - vp, a * far) <= 1.0) s = 1.0;
        else {
          float lo = 0.0;
          float hi = 1.0;
          for (int i = 0; i < 14; i++) {
            float m = 0.5 * (lo + hi);
            if (lumenShape(p - vp * m, a * mix(1.0, far, m)) < 1.0) lo = m; else hi = m;
          }
          s = 0.5 * (lo + hi);
        }
        // Pour: colour runs down the room into the far wall, a whole palette a cycle
        float phase = sbR(vec2(9.0, 9.0)) - sbMarch(sbMv(0.0));
        // near walls fill more of the view than far ones, so ease the depth
        float sd = 1.0 - pow(1.0 - s, 1.8);
        // the walls: one continuous run of colour from the opening down the room
        vec3 col = sbInkLoop(sd * p_spread + phase);
        // the light lives at the far end: the room brightens as it recedes and
        // the opening sinks into a soft dusk
        col *= mix(0.55, 1.1, smoothstep(0.0, 1.0, sd));
        // walls meet in soft corners; the floor catches the most light
        vec2 q = (p - vp * s) / (a * mix(1.0, far, s));
        if (p_shape < 0.5) {
          float sideW = smoothstep(-0.18, 0.18, abs(q.x) - abs(q.y));
          float floorW = (1.0 - sideW) * smoothstep(0.1, -0.4, q.y);
          float ceilW = (1.0 - sideW) * smoothstep(-0.1, 0.4, q.y);
          col *= 1.0 + (floorW * 0.24 - sideW * 0.1 - ceilW * 0.06) * p_faces * 2.0 * (1.0 - smoothstep(0.96, 1.0, s));
        }
        // the far wall: a colour from across the loop, glowing, brightest in
        // its middle, with light spilling round its edge into the room
        float fe = lumenShape(p - vp, a * far);
        vec3 farCol = sbMixOk(sbInkLoop(p_spread + phase + 0.5), vec3(1.0), 0.15 + 0.35 * p_glow);
        float inFar = 1.0 - smoothstep(0.97, 1.03, fe);
        col = sbMixOk(col, farCol * (1.0 + 0.15 * p_glow * (1.0 - fe)), inFar);
        float spill = exp(-max(fe - 1.0, 0.0) * mix(10.0, 2.5, p_glow)) * (1.0 - inFar);
        col = sbMixOk(col, farCol, clamp(spill * p_glow * 0.75, 0.0, 1.0));
        // haze: the air itself takes on the light's colour deeper in
        return sbMixOk(col, farCol, clamp(p_haze * 0.35 * sd, 0.0, 1.0));
      }
    `,
  },
  {
    id: 'sbHorizon',
    no: 57,
    name: 'Horizon',
    makes: 'curved sky-and-floor horizons',
    kind: 'Gradients',
    grain: 0.08,
    inks: ['#a8f0c6', '#c9b38a', '#f4ecff', '#b9a0ff', '#7fb6ff', '#7ff3ff'],
    movements: ['Rise', 'Flow', 'Shimmer'],
    params: [
      slider('horizon', 'Horizon', 0.55, 0, 1),
      slider('curve', 'Curve', 0.6, 0, 1),
      slider('squeeze', 'Squeeze', 0.4, 0, 1),
      slider('bands', 'Bands', 0, 0, 16, 1),
      slider('line', 'Horizon Line', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        float mFlow = sbMv(1.0);
        float mShim = sbMv(2.0);
        // Rise: the horizon bobs
        float h = (p_horizon - 0.5 + (sbR(vec2(4.0, 2.0)) - 0.5) * 0.12) * asp.y * 0.9 + 0.14 * sbMv(0.0) * sbOsc(0.0);
        // each variation tilts the horizon slightly and bows it differently
        float y = p.y - h + (sbR(vec2(4.0, 4.0)) - 0.5) * 0.14 * p.x;
        float side = y >= 0.0 ? 1.0 : -1.0;
        // bands bow toward the horizon at the edges, like a curved sky and floor
        float d = abs(y) + p_curve * (0.3 + 0.4 * sbR(vec2(4.0, 6.0))) * p.x * p.x;
        // perspective: everything crowds toward the horizon
        float z = 1.0 - exp(-d * mix(3.0, 9.0, p_squeeze));
        // Flow: soft swells roll in toward the horizon
        z += 0.1 * mFlow * sin(SB_TAU * (z * 4.0 + sbMarch(mFlow)));
        // first ink at the top edge, last at the bottom, the middle at the horizon
        float t = 0.5 - 0.5 * side * z;
        if (p_bands > 0.5) {
          float march = sbMarch(mFlow);
          float tq = (floor(t * p_bands + march) - march + 0.5) / p_bands;
          t = mix(t, tq, 0.85);
        }
        vec3 col = sbInkOk(t);
        // Shimmer: an iridescent sheen runs along the band around the horizon
        col = sbMixOk(col, sbInkLoop(p.x * 0.7 + sbMarch(mShim)), clamp(exp(-abs(y) * 5.0) * 0.45 * mShim, 0.0, 1.0));
        // the bright horizon line, with a soft halo; Shimmer slides a sheen along it
        float line = exp(-abs(y) / mix(0.003, 0.02, p_line)) * p_line;
        line *= 1.0 + mShim * 0.7 * sin(p.x * 14.0 + SB_TAU * sbMarch(mShim));
        vec3 lineCol = sbMixOk(vec3(1.0), sbInk(3.0), 0.25 + 0.25 * sin(p.x * 6.0 + SB_TAU * sbMarch(mShim)));
        col = sbMixOk(col, vec3(1.0), clamp(exp(-abs(y) * 10.0) * p_line * 0.3, 0.0, 1.0));
        return sbMixOk(col, lineCol, clamp(line, 0.0, 1.0));
      }
    `,
  },
  {
    id: 'sbSpectrum',
    no: 58,
    name: 'Spectrum',
    makes: 'linear, radial & conic ramps',
    kind: 'Gradients',
    imageReactive: true,
    grain: 0.08,
    inks: ['#ff3d77', '#ffb03a', '#fff07a', '#3ddc97', '#3a7bff'],
    movements: ['Spin', 'Flow', 'Breathe'],
    params: [
      select('type', 'Type', ['Linear', 'Radial', 'Conic', 'Diamond', 'Mirror']),
      slider('angle', 'Angle', 135, 0, 360, 1),
      slider('offset', 'Offset', 0.5, 0, 1),
      slider('repeat', 'Repeat', 1, 1, 8, 1),
      slider('balance', 'Balance', 0.5, 0, 1),
      slider('steps', 'Steps', 0, 0, 24, 1),
    ],
    glsl: /* glsl */ `
      // A triangle wave: repeats mirror back instead of jumping, and for one
      // repeat it is just t on 0..1.
      float spectrumTri(float x) { return 1.0 - abs(fract(x * 0.5) * 2.0 - 1.0); }
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        float mFlow = sbMv(1.0);
        // Spin: the whole ramp turns, a full turn a cycle
        // each variation nudges the angle and the centre a little
        float ang = radians(p_angle) + (sbR(vec2(6.0, 1.0)) - 0.5) * 0.5 + sbSpin(sbMv(0.0));
        vec2 dir = vec2(cos(ang), sin(ang));
        // radial / conic / diamond centre, slid along the angle by Offset
        vec2 c = dir * (p_offset - 0.5) * 0.8 + (sbR2(vec2(6.0, 2.0)) - 0.5) * 0.2;
        vec2 q = sbBreathe(p - c, sbMv(2.0));
        float span = abs(dir.x) * asp.x + abs(dir.y) * asp.y;
        float t;
        if (p_type < 0.5) t = dot(q, dir) / span + 0.5;
        else if (p_type < 1.5) t = length(q) * 1.4;
        else if (p_type < 2.5) t = fract(atan(q.y, q.x) / SB_TAU - ang / SB_TAU + 1.0);
        else if (p_type < 3.5) t = (abs(q.x) + abs(q.y)) * 1.1;
        else t = abs(dot(q, dir)) * 2.0 / span;
        // with Image up, the photo's tones drive the ramp: a gradient map
        t = sbField(t, uv);
        if (p_type > 1.5 && p_type < 2.5) {
          // conic wraps round, so it uses the looping ramp and stays seamless
          float tc = t * p_repeat - sbMarch(mFlow);
          if (p_steps > 0.5) tc = floor(fract(tc) * p_steps) / p_steps;
          return sbInkLoop(tc);
        }
        // Flow: the ramp slides two whole repeats a cycle, so the mirrored waves line up again
        t = spectrumTri(t * p_repeat - 2.0 * sbMarch(mFlow));
        // Balance pushes the midpoint toward either end (Breathe swings it)
        float balance = clamp(p_balance + 0.3 * sbMv(2.0) * sbOsc(0.0), 0.0, 1.0);
        t = pow(clamp(t, 0.0, 1.0), exp2((0.5 - balance) * 3.0));
        if (p_steps > 0.5) t = floor(t * p_steps * 0.9999) / max(p_steps - 1.0, 1.0);
        return sbInkOk(t);
      }
    `,
  },
  {
    id: 'sbSilk',
    no: 59,
    name: 'Silk',
    makes: 'glossy folded gradients',
    kind: 'Gradients',
    imageReactive: true,
    grain: 0.08,
    inks: ['#1a0b2e', '#5b2a86', '#c86bfa', '#ffd1f0', '#ffffff'],
    movements: ['Churn', 'Drift', 'Gleam'],
    params: [
      slider('scale', 'Scale', 1.4, 0.4, 4),
      slider('twist', 'Twist', 1.3, 0, 3),
      slider('softness', 'Softness', 0.5, 0, 1),
      slider('sheen', 'Sheen', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 q = p * p_scale + sbDrift(sbMv(1.0)) * 1.2;
        q = sbChurn(q, sbMv(0.0) * 1.6);
        q = sbDomainWarp(q, p_twist);
        float f = sbStretch(sbFbm(q, 4.0), mix(3.5, 1.5, p_softness));
        f = sbField(f, uv);
        vec3 col = sbInkOk(f);
        // sheen: light raking across the folds, from the field's slope
        vec2 g = vec2(dFdx(f), dFdy(f)) * min(uResolution.x, uResolution.y);
        vec3 nrm = normalize(vec3(-g * 0.06, 1.0));
        // Gleam: the light circles the cloth
        float la = 2.2 + sbSpin(sbMv(2.0));
        vec3 L = normalize(vec3(cos(la), sin(la), 0.9));
        float lit = dot(nrm, L);
        float spec = pow(max(lit, 0.0), 12.0);
        col *= mix(1.0, 0.75 + 0.5 * (lit * 0.5 + 0.5), p_sheen);
        return col + spec * p_sheen * 0.7;
      }
    `,
  },
  {
    id: 'sbOrbs',
    no: 60,
    name: 'Orbs',
    makes: 'out-of-focus light orbs',
    kind: 'Gradients',
    grain: 0.1,
    inks: ['#0d0b1a', '#241a4d', '#ff5fa2', '#ffb347', '#6ad1ff', '#b48cff'],
    movements: ['Wander', 'Pulse', 'Orbit'],
    params: [
      slider('orbs', 'Orbs', 6, 2, 12, 1),
      slider('size', 'Size', 0.55, 0, 1),
      slider('glow', 'Glow', 0.7, 0, 1),
      slider('stretch', 'Stretch', 0, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        // the ground: a soft vertical blend of the first two inks
        vec3 col = sbMixOk(sbInk(1.0), sbInk(0.0), smoothstep(-0.5 * asp.y, 0.5 * asp.y, p.y));
        float n = max(uInkCount - 2.0, 1.0);
        for (int i = 0; i < 12; i++) {
          if (float(i) >= p_orbs) break;
          float fi = float(i);
          vec2 c = (sbR2(vec2(fi, 1.7)) - 0.5) * asp * 0.9;
          // Wander: orbs drift on loose circles; Orbit carries them round the centre
          c += sbCirc(sbR(vec2(fi, 2.9))) * 0.1 * sbMv(0.0);
          c = sbRot(sbSpin(sbMv(2.0)) * (sbR(vec2(fi, 8.1)) < 0.5 ? -1.0 : 1.0)) * c;
          float r = mix(0.08, 0.32, p_size) * (0.55 + 0.9 * sbR(vec2(fi, 3.3)));
          // Pulse: orbs swell and fade back
          r *= 1.0 + 0.3 * sbMv(1.0) * sbOsc(sbR(vec2(fi, 4.4)));
          // Stretch pulls each orb into a long smear at its own angle
          vec2 e = sbRot(sbR(vec2(fi, 9.2)) * SB_PI) * (p - c);
          e.x /= 1.0 + p_stretch * (1.5 + 3.0 * sbR(vec2(fi, 9.9)));
          float d = length(e) / r;
          float a = exp(-d * d * mix(6.0, 1.2, p_glow));
          // a crisper disc when Glow is low
          a = max(a, (1.0 - smoothstep(0.85, 1.0, d)) * (1.0 - p_glow));
          col = sbMixOk(col, sbInk(2.0 + mod(fi, n)), clamp(a * 0.92, 0.0, 1.0));
        }
        return col;
      }
    `,
  },
  {
    id: 'sbCurtain',
    no: 61,
    name: 'Curtain',
    makes: 'vertical light curtains',
    kind: 'Gradients',
    grain: 0.08,
    inks: ['#030308', '#7a3cff', '#3a5cff', '#3dffa0', '#b98cff', '#5fd0ff'],
    movements: ['Sway', 'Flicker', 'Breathe'],
    params: [
      slider('bars', 'Bars', 18, 3, 40, 1),
      slider('width', 'Width', 0.5, 0, 1),
      slider('blur', 'Blur', 0.5, 0, 1),
      slider('height', 'Height', 0.7, 0, 1),
      slider('glow', 'Glow', 0.8, 0, 2),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        float mFlicker = sbMv(1.0);
        float n = max(uInkCount - 1.0, 1.0);
        vec3 acc = vec3(0.0);
        for (int i = 0; i < 40; i++) {
          if (float(i) >= p_bars) break;
          float fi = float(i);
          // Sway: bars drift side to side, each on its own beat
          float x = (sbR(vec2(fi, 1.3)) - 0.5) * asp.x * 1.05 + 0.05 * sbMv(0.0) * sbOsc(sbR(vec2(fi, 2.4)));
          // mostly thin bars with the odd wide one; Breathe swells them
          float w = mix(0.004, 0.06, pow(sbR(vec2(fi, 3.5)), 2.0)) * mix(0.5, 1.8, p_width);
          w *= 1.0 + 0.5 * sbMv(2.0) * sbOsc(sbR(vec2(fi, 4.6)));
          float bright = 0.25 + 0.75 * sbR(vec2(fi, 5.7));
          // Flicker: bars stutter like a failing projector
          bright *= mix(1.0, 0.15 + 1.7 * sbFr(vec2(fi, 6.8)), mFlicker);
          float d = abs(p.x - x) / w;
          acc += sbInk(1.0 + mod(fi, n)) * exp(-d * d / mix(0.3, 2.5, p_blur)) * bright;
        }
        // the curtain fades out toward the top and bottom
        float hy = asp.y * 0.5 * mix(0.5, 1.3, p_height);
        float v = exp(-pow(p.y / hy, 2.0) * 2.0);
        // light adds up, then rolls off softly instead of clipping
        return sbInk(0.0) + (1.0 - exp(-acc * v * p_glow * 1.6));
      }
    `,
  },
  {
    id: 'sbLightspeed',
    no: 62,
    name: 'Lightspeed',
    makes: 'warp-speed light streaks',
    kind: 'Gradients',
    grain: 0.08,
    inks: ['#05030c', '#3a1a7a', '#8a5cff', '#d9c8ff', '#ffffff'],
    movements: ['Rush', 'Turn', 'Pulse'],
    params: [
      slider('streaks', 'Streaks', 140, 20, 400, 1),
      slider('width', 'Width', 0.4, 0, 1),
      slider('length', 'Length', 0.5, 0, 1),
      slider('center', 'Vanishing Point', 0.5, 0, 1),
      slider('glow', 'Glow', 0.6, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        float mPulse = sbMv(2.0);
        vec2 vp = vec2((p_center - 0.5) * asp.x * 0.8, 0.32 * asp.y);
        vec2 q = p - vp;
        float r = length(q);
        // Turn: the tunnel rolls a little
        float a = atan(q.y, q.x) / SB_TAU + 0.04 * sbMv(1.0) * sbOsc(0.0);
        // the ground: a violet bloom around the vanishing point
        float glow = p_glow * (1.0 + 0.4 * mPulse * sbOsc(0.0));
        vec3 col = sbMixOk(sbInk(0.0), sbInk(1.0), clamp(exp(-r * r * 2.5) * glow * 1.4, 0.0, 1.0));
        col = sbMixOk(col, sbInk(2.0), clamp(exp(-r * r * 12.0) * glow, 0.0, 1.0));
        // one streak per angular lane, at a random spot across it
        float lanes = floor(p_streaks);
        // mod keeps the lane ids continuous across atan's seam
        float sector = mod(floor(a * lanes), lanes);
        float fa = fract(a * lanes) - 0.5;
        float off = (sbR(vec2(sector, 1.0)) - 0.5) * 0.7;
        float lw = mix(0.04, 0.3, p_width) * (0.4 + sbR(vec2(sector, 2.0)));
        float across = 1.0 - smoothstep(0.0, lw, abs(fa - off));
        // dashes along the ray, spaced in log-radius so they stretch as they
        // near the viewer; Rush flies them outward a whole spacing (or two) a cycle
        float speed = 1.0 + floor(sbR(vec2(sector, 4.0)) * 2.0);
        float z = log(r + 0.002) * mix(0.6, 1.4, sbR(vec2(sector, 3.0))) + sbR(vec2(sector, 5.0));
        float seg = fract(z - sbMarch(sbMv(0.0)) * speed);
        float len = mix(0.15, 0.85, p_length);
        float dash = smoothstep(0.0, 0.06, seg) * (1.0 - smoothstep(len - 0.1, len, seg));
        float near = smoothstep(0.03, 0.35, r);
        vec3 streak = sbMixOk(sbInk(3.0), sbInk(4.0), sbR(vec2(sector, 6.0)));
        return sbMixOk(col, streak, clamp(across * dash * near * (0.4 + 0.6 * sbR(vec2(sector, 7.0))), 0.0, 1.0));
      }
    `,
  },
  {
    id: 'sbHalo',
    no: 63,
    name: 'Halo',
    makes: 'glowing cores and rim-lit spheres',
    kind: 'Gradients',
    grain: 0.08,
    inks: ['#5fc8c8', '#a8e6b0', '#ffe96a', '#ffffff', '#c86bff'],
    movements: ['Pulse', 'Drift', 'Flare'],
    params: [
      slider('size', 'Core Size', 0.08, 0, 1),
      slider('spread', 'Spread', 0.5, 0, 1),
      slider('rim', 'Rim Light', 0.5, 0, 1),
      slider('offset', 'Offset', 0.2, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        // Drift: the core wanders a slow circle
        vec2 c = (sbR2(vec2(1.0, 3.0)) - 0.5) * asp * p_offset + sbCirc(0.0) * 0.07 * sbMv(1.0);
        vec2 q = p - c;
        float r = length(q);
        // Pulse: the core and its rings breathe
        float R = mix(0.012, 0.65, p_size * p_size) * (1.0 + 0.25 * sbMv(0.0) * sbOsc(0.0));
        float reach = R + mix(0.12, 1.1, p_spread) * (1.0 + 0.5 * sbMv(0.0) * sbOsc(0.1));
        // the field: the inks run from the outer ground (first) in to the core (last)
        float t = 1.0 - clamp((r - R) / (reach - R), 0.0, 1.0);
        // (the last ink is kept for the rim light)
        vec3 col = sbInkOk(pow(t, 1.6) * (uInkCount - 2.0) / max(uInkCount - 1.0, 1.0));
        // the core: a soft-edged disc, lit a little brighter toward one side
        float disc = 1.0 - smoothstep(R * 0.92, R * 1.04 + 0.004, r);
        float la = 2.3 + sbSpin(sbMv(2.0));
        vec2 ld = vec2(cos(la), sin(la));
        vec3 core = sbMixOk(sbInk(uInkCount - 2.0), vec3(1.0), clamp(0.6 + 0.4 * dot(q / max(R, 0.001), ld), 0.0, 1.0));
        col = sbMixOk(col, core, disc);
        // rim light hugging the core's edge; Flare walks its bright side round
        float rim = exp(-abs(r - R) / (0.01 + R * 0.12)) * p_rim * (0.35 + 0.65 * (0.5 + 0.5 * dot(normalize(q + 0.0001), ld)));
        col = sbMixOk(col, sbInk(uInkCount - 1.0), clamp(rim, 0.0, 1.0));
        // Flare: a six-point glint turns around the core, and a bright arc
        // sweeps round the halo
        float ga = atan(q.y, q.x) - la;
        float mFlare = sbMv(2.0);
        float glint = pow(abs(cos(ga * 3.0)), 30.0) * exp(-r / (R + 0.2) * 2.0) * mFlare;
        float ringR = R + (reach - R) * 0.45;
        float arc = exp(-pow((r - ringR) / 0.035, 2.0)) * pow(0.5 + 0.5 * cos(ga), 4.0) * mFlare * 0.8;
        return sbMixOk(col, vec3(1.0), clamp(glint + arc, 0.0, 1.0));
      }
    `,
  },
  {
    id: 'sbPortal',
    no: 64,
    name: 'Portal',
    makes: 'glowing windows in coloured walls',
    kind: 'Gradients',
    grain: 0.1,
    inks: ['#2a1c4f', '#4a2c7a', '#ff4f7a', '#ff9a5c', '#ffd0a8'],
    movements: ['Breathe', 'Shift', 'Drift'],
    params: [
      select('shape', 'Shape', ['Rect', 'Round', 'Arch']),
      slider('width', 'Width', 0.5, 0, 1),
      slider('height', 'Height', 0.6, 0, 1),
      slider('lift', 'Lift', 0.5, 0, 1),
      slider('softness', 'Edge Softness', 0.35, 0, 1),
      slider('spill', 'Light Spill', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        // the wall: a soft vertical wash, sinking into shadow toward the frame
        vec3 wall = sbMixOk(sbInk(0.0), sbInk(1.0), smoothstep(-0.6, 0.6, p.y / asp.y));
        wall *= 1.0 - 0.35 * smoothstep(0.3, 0.9, length(p / asp));
        // the window; Drift floats it, Breathe swells it
        vec2 c = vec2(0.0, (p_lift - 0.5) * 0.5 * asp.y) + sbCirc(0.0) * vec2(0.06, 0.04) * sbMv(2.0);
        vec2 hs = vec2(mix(0.12, 0.42, p_width) * asp.x, mix(0.12, 0.42, p_height) * asp.y) * (1.0 + 0.14 * sbMv(0.0) * sbOsc(0.0));
        vec2 q = p - c;
        float d;
        if (p_shape < 0.5) d = sbBox(q, hs);
        else if (p_shape < 1.5) d = sbRoundBox(q, hs, min(hs.x, hs.y) * 0.5);
        else {
          // an arch: a box whose top is a half circle
          float spring = hs.y - hs.x;
          d = q.y > spring ? length(q - vec2(0.0, spring)) - hs.x : sbBox(q, hs);
        }
        float soft = mix(0.002, 0.06, p_softness);
        float inside = 1.0 - smoothstep(-soft, soft, d);
        // inside, a deep field that seems to go on forever: brightest in the
        // middle, its colour slowly turning (Shift turns it a full loop a cycle)
        float r = length(q / hs);
        vec3 field = sbInkLoop(0.45 + r * 0.18 + sbR(vec2(3.0, 3.0)) * 0.3 - sbMarch(sbMv(1.0)));
        field *= mix(1.18, 0.85, smoothstep(0.0, 1.2, r));
        vec3 col = sbMixOk(wall, field, inside);
        // light spills out of the window onto the wall around it
        float spill = exp(-max(d, 0.0) / mix(0.02, 0.28, p_spill)) * (1.0 - inside) * p_spill;
        return sbMixOk(col, sbMixOk(field, vec3(1.0), 0.2), clamp(spill * 0.85, 0.0, 1.0));
      }
    `,
  },
  {
    id: 'sbOculus',
    no: 65,
    name: 'Oculus',
    makes: 'sky openings in lit ceilings',
    kind: 'Gradients',
    grain: 0.1,
    inks: ['#1d2b6b', '#4b6cff', '#a9c8ff', '#ffd6e8', '#ff8a6b', '#6a2a7a'],
    movements: ['Dusk', 'Drift', 'Breathe'],
    params: [
      select('shape', 'Shape', ['Square', 'Round']),
      slider('size', 'Opening', 0.5, 0, 1),
      slider('spread', 'Light Reach', 0.5, 0, 1),
      slider('clouds', 'Clouds', 0.4, 0, 1),
      slider('rim', 'Rim', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        // Dusk: sky and ceiling travel together through the palette, like an evening
        float dusk = sbR(vec2(1.0, 7.0)) * 0.2 - sbMarch(sbMv(0.0));
        float R = mix(0.1, 0.38, p_size) * (1.0 + 0.22 * sbMv(2.0) * sbOsc(0.0));
        float d = p_shape < 0.5 ? max(abs(p.x), abs(p.y)) : length(p);
        // a knife-thin edge, the way these openings are cut
        float inside = 1.0 - smoothstep(R - 0.0015, R + 0.0015, d);
        // the sky: a soft vertical gradient with drifting cloud
        vec2 cq = p * 3.0 + sbDrift(sbMv(1.0)) * 3.5;
        float cloud = smoothstep(0.38, 0.75, sbFbm(cq + 4.0, 5.0)) * p_clouds;
        vec3 sky = sbInkLoop(0.62 + 0.12 * (p.y / max(R, 0.01)) + dusk);
        sky = sbMixOk(sky, vec3(1.0), cloud * 0.7);
        // the ceiling, lit from the opening and falling off into the room's corners
        float roomD = mix(d, max(abs(p.x), abs(p.y)), 0.5);
        float fall = clamp((roomD - R) / mix(0.3, 1.0, p_spread), 0.0, 1.0);
        vec3 ceil = sbInkLoop(0.12 + fall * 0.3 + dusk) * mix(1.1, 0.45, pow(fall, 0.8));
        vec3 col = sbMixOk(ceil, sky, inside);
        // the opening's lip catches the light
        float lip = exp(-max(d - R, 0.0) / 0.006) * (1.0 - inside) * 0.5 * p_rim;
        return sbMixOk(col, vec3(1.0), clamp(lip, 0.0, 1.0));
      }
    `,
  },
  {
    id: 'sbCorner',
    no: 66,
    name: 'Corner',
    makes: 'floating light cubes in a room corner',
    kind: 'Gradients',
    grain: 0.1,
    inks: ['#1a1030', '#24163f', '#ff5aa0', '#ff8ad0', '#ffe0f0'],
    movements: ['Float', 'Turn', 'Pulse'],
    params: [
      slider('size', 'Cube Size', 0.4, 0, 1),
      slider('tilt', 'Tilt', 0.55, 0, 1),
      slider('glow', 'Glow', 0.6, 0, 1),
      slider('soft', 'Softness', 0.45, 0, 1),
      slider('room', 'Room Light', 0.5, 0, 1),
    ],
    glsl: /* glsl */ `
      vec3 cornerRotY(vec3 v, float a) { float c = cos(a); float s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
      vec3 cornerRotX(vec3 v, float a) { float c = cos(a); float s = sin(a); return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z); }
      vec3 sbMain(vec2 p, vec2 uv) {
        vec2 asp = sbAspect();
        float pulse = 1.0 + 0.35 * sbMv(2.0) * sbOsc(0.0);
        // the room: two walls meeting in a vertical corner, the floor below
        float seam = -0.18 * asp.y - 0.45 * abs(p.x);
        float onFloor = smoothstep(0.004, -0.004, p.y - seam);
        vec3 room = mix(sbInk(0.0) * mix(1.0, 0.8, step(0.0, p.x)), sbInk(1.0), onFloor) * mix(0.6, 1.4, p_room);
        // the cube, ray-traced: Float bobs it, Turn spins it (half a turn
        // repeats a cube exactly, so the loop closes)
        float cy = 0.04 + 0.12 * sbMv(0.0) * sbOsc(0.0);
        float yaw = 0.7854 + sbSpin(sbMv(1.0)) * 0.5 + (sbR(vec2(2.0, 2.0)) - 0.5) * 0.6;
        float pitch = mix(0.2, 0.75, p_tilt);
        vec3 ro = vec3(0.0, -cy, -3.2);
        vec3 rd = normalize(vec3(p, 1.6));
        // look down on it a little, so its top face shows
        ro = cornerRotY(cornerRotX(ro, pitch), -yaw);
        rd = cornerRotY(cornerRotX(rd, pitch), -yaw);
        float b = mix(0.25, 0.75, p_size);
        vec3 m = 1.0 / rd;
        vec3 n = m * ro;
        vec3 k = abs(m) * b;
        vec3 t1 = -n - k;
        vec3 t2 = -n + k;
        float tN = max(max(t1.x, t1.y), t1.z);
        float tF = min(min(t2.x, t2.y), t2.z);
        // closest approach of the ray to the cube's centre, for the glow
        float dc = length(ro - rd * dot(ro, rd));
        float glow = exp(-pow(max(dc - b * 0.8, 0.0) / mix(0.2, 0.9, p_glow), 2.0)) * p_glow * pulse;
        vec3 light = sbInk(4.0);
        vec3 col = sbMixOk(room, light, clamp(glow * 0.6, 0.0, 1.0));
        if (tN < tF && tF > 0.0) {
          // which face the ray enters through, back in room space for shading
          vec3 nl = -sign(rd) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);
          vec3 nw = cornerRotX(cornerRotY(nl, yaw), -pitch);
          // top face brightest; the side facing right vs left get their own inks
          vec3 face = abs(nw.y) > 0.5 ? sbInk(4.0) : (nw.x > 0.0 ? sbInk(2.0) : sbInk(3.0));
          // soft silhouette: thin slivers of cube fade into the glow
          float a = smoothstep(0.0, mix(0.005, 0.25, p_soft), tF - tN);
          // it is made of light: faces glow and blend a touch into the haze
          col = sbMixOk(col, sbMixOk(face, light, 0.2) * pulse, a * 0.92);
        }
        return col;
      }
    `,
  },
]
