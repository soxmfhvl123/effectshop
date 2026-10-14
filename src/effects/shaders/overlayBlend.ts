// Overlay Blend
// Generic alpha-composite of a Canvas2D-authored texture (tOverlay) on top
// of the source. Shared by any effect whose content is easier to draw with
// Canvas2D than GLSL (text layout, dashed lines, labels) — currently Text
// and Blob Tracker, which each populate tOverlay differently.

export const overlayBlendVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const overlayBlendFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tOverlay;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec4 overlay = texture2D(tOverlay, vUv);
    vec3 blended = mix(srcColor.rgb, overlay.rgb, overlay.a);
    vec3 outColor = mix(srcColor.rgb, blended, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
