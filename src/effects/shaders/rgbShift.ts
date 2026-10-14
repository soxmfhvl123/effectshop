// RGB Shift / Chromatic Aberration
// Offsets the red and blue channels in opposite directions from green.
// radialDistortion swaps the fixed directional offset for one that grows
// with distance from center (lens-edge-style aberration).

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
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);

    vec2 dir = vec2(cos(radians(uAngle)), sin(radians(uAngle)));
    vec2 centered = vUv - 0.5;
    vec2 radialDir = length(centered) > 0.0001 ? normalize(centered) : dir;
    float distFromCenter = length(centered) * 2.0;

    vec2 offsetPx = mix(dir * uAmount, radialDir * uAmount * distFromCenter, uRadial);
    vec2 offsetUv = offsetPx / uResolution;

    float r = texture2D(tDiffuse, vUv + offsetUv).r;
    float g = srcColor.g;
    float b = texture2D(tDiffuse, vUv - offsetUv).b;

    vec3 effectColor = vec3(r, g, b);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
