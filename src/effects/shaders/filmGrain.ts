// Film Grain & Halation
// Grain: per-pixel hash noise re-seeded each frame via uTime, scaled by
// grainSize, blended by grainIntensity. Halation: a cheap single-pass
// approximation of the glow that blooms out of highlights on real film --
// a multi-tap radial sample around each pixel, weighted toward bright taps,
// tinted by halationTint and faded out as halationRadius approaches 0.

export const filmGrainVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const filmGrainFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uGrainSize;      // 0.5..3.0
  uniform float uGrainIntensity; // 0..1
  uniform float uHalationRadius; // px, 0..30
  uniform vec3 uHalationTint;
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 px = vUv * uResolution;

    float n = hash(floor(px / max(uGrainSize, 0.25)) + uTime * 97.0);
    n = (n - 0.5) * 2.0;
    vec3 grained = srcColor.rgb + n * uGrainIntensity * 0.22;

    const int TAPS = 12;
    vec3 glow = vec3(0.0);
    float totalWeight = 0.0001;
    for (int i = 0; i < TAPS; i++) {
      float a = (float(i) / float(TAPS)) * 6.28318530718;
      vec2 offset = vec2(cos(a), sin(a)) * uHalationRadius / uResolution;
      vec3 tapColor = texture2D(tDiffuse, clamp(vUv + offset, 0.0, 1.0)).rgb;
      float brightness = max(max(tapColor.r, tapColor.g), tapColor.b);
      float weight = smoothstep(0.55, 1.0, brightness);
      glow += tapColor * weight;
      totalWeight += weight;
    }
    glow /= totalWeight;
    float radiusFactor = smoothstep(0.0, 4.0, uHalationRadius);

    vec3 effectColor = grained + glow * uHalationTint * radiusFactor * 0.85;
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
