// NTSC (Retro Display)
// Approximates composite-video artifacts: horizontal chroma bleed (a small
// box blur applied before splitting channels, simulating limited color
// bandwidth), an extra red/blue horizontal offset beyond the bleed, and
// animated dot-crawl-style noise.

export const ntscVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const ntscFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uBleed;      // px, chroma smear width
  uniform float uColorShift; // px, extra R/B horizontal offset
  uniform float uNoise;      // 0..1
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 texel = 1.0 / uResolution;

    vec3 bleedSum = vec3(0.0);
    const int TAPS = 5;
    for (int i = 0; i < TAPS; i++) {
      float o = (float(i) - float(TAPS - 1) * 0.5) * uBleed * texel.x;
      bleedSum += texture2D(tDiffuse, clamp(vUv + vec2(o, 0.0), 0.0, 1.0)).rgb;
    }
    vec3 bled = bleedSum / float(TAPS);

    float r = texture2D(tDiffuse, clamp(vUv + vec2(uColorShift * texel.x, 0.0), 0.0, 1.0)).r;
    float b = texture2D(tDiffuse, clamp(vUv - vec2(uColorShift * texel.x, 0.0), 0.0, 1.0)).b;
    vec3 color = vec3(mix(bled.r, r, 0.5), bled.g, mix(bled.b, b, 0.5));

    float n = (hash(vUv * uResolution + uTime * 30.0) - 0.5) * uNoise;
    color += n;

    vec3 outColor = mix(srcColor.rgb, color, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
