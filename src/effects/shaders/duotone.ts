// Duotone
// Remaps source luminance onto a two-color gradient (shadow -> highlight),
// the standard false-color / heatmap-style look (also covers cyanotype,
// thermal-camera and Y2K duotone presets without needing separate shaders).

export const duotoneVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const duotoneFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform vec3 uShadowColor;
  uniform vec3 uHighlightColor;
  uniform float uContrast; // 0.5..2
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    float lum = dot(srcColor.rgb, vec3(0.299, 0.587, 0.114));
    lum = clamp((lum - 0.5) * uContrast + 0.5, 0.0, 1.0);

    vec3 effectColor = mix(uShadowColor, uHighlightColor, lum);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
