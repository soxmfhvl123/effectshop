// Threshold (Color/Tone)
// Hard (optionally softened) two-level cutoff at a luminance threshold —
// distinct from Posterize (multiple bands) and Dither (patterned
// quantization): every pixel becomes exactly one of two flat colors.

export const thresholdVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const thresholdFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uLevel;    // 0..1
  uniform float uSoftness; // 0..0.3, edge antialiasing
  uniform vec3 uDarkColor;
  uniform vec3 uLightColor;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    float lum = dot(srcColor.rgb, vec3(0.299, 0.587, 0.114));
    float t = smoothstep(uLevel - uSoftness, uLevel + uSoftness, lum);
    vec3 effectColor = mix(uDarkColor, uLightColor, t);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
