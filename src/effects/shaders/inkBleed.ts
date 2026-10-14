// Ink Bleed (Generate)
// Finds high-contrast edges, then grows a ragged fbm-noise-distorted ink
// mask outward from them so edges "bleed" like ink soaking into paper.

export const inkBleedVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const inkBleedFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uAmount;        // bleed reach, 0..20
  uniform float uScale;         // noise feature size in px, 2..40
  uniform float uEdgeThreshold; // 0..1
  uniform vec3 uInkColor;
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      v += amp * valueNoise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 texel = 1.0 / uResolution;

    float lumC = dot(srcColor.rgb, vec3(0.299, 0.587, 0.114));
    float lumX = dot(texture2D(tDiffuse, vUv + vec2(texel.x * 2.0, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    float lumY = dot(texture2D(tDiffuse, vUv + vec2(0.0, texel.y * 2.0)).rgb, vec3(0.299, 0.587, 0.114));
    float edge = clamp((abs(lumC - lumX) + abs(lumC - lumY)) * 4.0, 0.0, 1.0);

    vec2 noiseUv = vUv * uResolution / max(uScale, 1.0);
    float n = fbm(noiseUv);
    float bleed = smoothstep(uEdgeThreshold, uEdgeThreshold + 0.5, edge + (n - 0.5) * uAmount * 0.1);

    vec3 effectColor = mix(srcColor.rgb, uInkColor, bleed);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
