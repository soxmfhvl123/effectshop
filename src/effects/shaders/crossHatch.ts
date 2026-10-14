// Cross Hatch
// Classic pen-and-ink engraving look: overlays several diagonal line bands,
// each only drawn where the source is darker than that band's threshold, so
// shadows accumulate more crossing strokes than highlights.

export const crossHatchVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const crossHatchFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uSpacing;   // px between hatch lines, 4..30
  uniform float uThickness; // relative line thickness, 0.05..0.5
  uniform float uInvert;    // 0 = dark ink on light paper, 1 = light ink on dark
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    float lum = dot(srcColor.rgb, vec3(0.299, 0.587, 0.114));

    vec2 px = vUv * uResolution;
    float lineWidth = max(uSpacing * uThickness, 0.75);
    float ink = 1.0;

    if (lum < 0.9 && mod(px.x + px.y, uSpacing) < lineWidth) ink = 0.0;
    if (lum < 0.7 && mod(px.x - px.y, uSpacing) < lineWidth) ink = 0.0;
    if (lum < 0.5 && mod(px.x + px.y - uSpacing * 0.5, uSpacing) < lineWidth) ink = 0.0;
    if (lum < 0.3 && mod(px.x - px.y - uSpacing * 0.5, uSpacing) < lineWidth) ink = 0.0;

    vec3 effectColor = uInvert > 0.5 ? vec3(1.0 - ink) : vec3(ink);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
