// Color Isolation (Generate)
// Chroma-key masks the "object" (far from a key color, same logic as the
// rest of the detection-based Generate effects) and either (a) desaturates
// everything else — classic "color pop" — or (b) tints just the object,
// toggled by Tint Object.

export const colorIsolationVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const colorIsolationFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec3 uKeyColor;
  uniform float uThreshold;
  uniform float uTintMode; // 0 = color pop background, 1 = tint object
  uniform vec3 uTintColor;
  uniform float uTintStrength;
  uniform float uBackgroundSaturation; // 0..1
  uniform float uBackgroundBrightness; // 0..1.5
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec3 color = srcColor.rgb;

    float maxDist = sqrt(3.0);
    float dist = length(color - uKeyColor);
    float m = step(uThreshold * maxDist, dist);

    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 desaturated = mix(vec3(lum), color, uBackgroundSaturation) * uBackgroundBrightness;
    vec3 popResult = mix(desaturated, color, m);

    vec3 tinted = mix(color, color * uTintColor * 2.0, uTintStrength);
    vec3 tintResult = mix(color, tinted, m);

    vec3 effectColor = mix(popResult, tintResult, uTintMode);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
