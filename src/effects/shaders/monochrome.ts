// Monochrome (Color/Tone)
// Clean luminance-based black & white with an adjustable tint color and
// contrast curve — distinct from Duotone (two-color gradient) in that it's
// a single tint multiplied across the full tonal range.

export const monochromeVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const monochromeFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec3 uTint;
  uniform float uContrast; // 0.5..2
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    float lum = dot(srcColor.rgb, vec3(0.299, 0.587, 0.114));
    lum = clamp((lum - 0.5) * uContrast + 0.5, 0.0, 1.0);
    vec3 effectColor = uTint * lum;
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
