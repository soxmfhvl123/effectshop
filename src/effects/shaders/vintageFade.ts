// Vintage Fade
// Lifts blacks (faded-print look), applies a warm/cool tint split, pulls
// saturation down slightly, and finishes with a soft radial vignette —
// an old-film/print color-grade combo.

export const vintageFadeVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const vintageFadeFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uFade;       // 0..1, lifts blacks
  uniform float uWarmth;     // -1..1, cool..warm tint
  uniform float uSaturation; // 0..2
  uniform float uVignette;   // 0..1
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec3 color = srcColor.rgb;

    color = mix(color, color * 0.8 + vec3(0.12, 0.10, 0.09), uFade);
    color += vec3(0.05, 0.02, -0.05) * uWarmth;

    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(lum), color, uSaturation);

    vec2 cc = vUv - 0.5;
    float vig = 1.0 - dot(cc, cc) * 2.0 * uVignette;
    color *= clamp(vig, 0.0, 1.0);

    vec3 outColor = mix(srcColor.rgb, color, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
