// Noise (Generate)
// Procedural per-cell random noise blended over the source, animated by
// stepping the random seed's time bucket. Monochrome uses one shared random
// value per cell for all channels; off uses an independent value per channel
// (RGB static).

export const noiseGenVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const noiseGenFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uIntensity;  // 0..1, how strongly noise replaces the source
  uniform float uScale;      // noise cell size in px, 1..8
  uniform float uMonochrome; // 0 or 1
  uniform float uSpeed;      // animation rate, 0..5
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);

    vec2 cell = floor(vUv * uResolution / max(uScale, 1.0));
    float t = floor(uTime * uSpeed * 24.0);
    float r = hash(cell + t);
    float g = uMonochrome > 0.5 ? r : hash(cell + t + vec2(11.0, 0.0));
    float b = uMonochrome > 0.5 ? r : hash(cell + t + vec2(23.0, 0.0));

    vec3 effectColor = mix(srcColor.rgb, vec3(r, g, b), uIntensity);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
