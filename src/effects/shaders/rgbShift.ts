// RGB Shift / Chromatic Aberration
// Offsets the red and blue channels in opposite directions from green.
// radialDistortion swaps the fixed directional offset for one that grows
// with distance from center (lens-edge-style aberration). Movement animates
// the split even on a still image: Wobble breathes its width, Spin walks its
// direction round the circle, Jitter snaps both to a new value 12 times a
// second like a bad signal.

export const rgbShiftVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const rgbShiftFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uAmount;   // px, 0..50
  uniform float uAngle;    // degrees
  uniform float uRadial;   // 0 or 1
  uniform float uTime;
  uniform float uMove;     // 0 still, 1 wobble, 2 spin, 3 jitter
  uniform float uMoveAmt;  // 0..1
  uniform float uOpacity;
  varying vec2 vUv;

  float shiftHash(float n) { return fract(sin(n * 91.3458) * 47453.5453); }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);

    float ang = radians(uAngle);
    float amount = uAmount;
    if (uMove > 0.5 && uMove < 1.5) {
      amount *= 1.0 + uMoveAmt * sin(uTime * 3.0);
    } else if (uMove > 1.5 && uMove < 2.5) {
      ang += uTime * (0.5 + 2.5 * uMoveAmt);
    } else if (uMove > 2.5) {
      float f = floor(uTime * 12.0);
      ang += (shiftHash(f) - 0.5) * 6.2831853 * uMoveAmt;
      amount *= 1.0 + (shiftHash(f + 3.1) - 0.5) * 2.0 * uMoveAmt;
    }
    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 centered = vUv - 0.5;
    vec2 radialDir = length(centered) > 0.0001 ? normalize(centered) : dir;
    float distFromCenter = length(centered) * 2.0;

    vec2 offsetPx = mix(dir * amount, radialDir * amount * distFromCenter, uRadial);
    vec2 offsetUv = offsetPx / uResolution;

    float r = texture2D(tDiffuse, vUv + offsetUv).r;
    float g = srcColor.g;
    float b = texture2D(tDiffuse, vUv - offsetUv).b;

    vec3 effectColor = vec3(r, g, b);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
