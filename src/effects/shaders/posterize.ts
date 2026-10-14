// Posterize
// Flat color-band quantization (no dither pattern applied), for a
// screen-print / limited-palette look distinct from the ordered-dither effect.

export const posterizeVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const posterizeFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uLevels;   // 2..16
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec3 effectColor = floor(srcColor.rgb * uLevels + 0.5) / max(uLevels - 1.0, 1.0);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
