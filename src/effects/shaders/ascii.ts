// ASCII Art
// Real character rendering (not a procedural pattern fake): each screen
// cell of `uCharSize` px samples the source image once, maps its luminance
// to an index into a character ramp, and looks up that glyph's cell in a
// pre-rendered font-atlas texture (see effects/asciiAtlas.ts, built with
// Canvas2D fillText -- one row of glyphs, light -> dense).

export const asciiVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const asciiFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tCharAtlas;
  uniform vec2 uResolution;
  uniform float uCharSize;   // px, 4..24
  uniform float uCharCount;
  uniform float uInvert;     // 0 or 1
  uniform float uColorMode;  // 0 = monochrome, 1 = original color
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);

    vec2 px = vUv * uResolution;
    vec2 cellCoord = floor(px / uCharSize);
    vec2 cellCenterPx = cellCoord * uCharSize + uCharSize * 0.5;
    vec3 cellColor = texture2D(tDiffuse, clamp(cellCenterPx / uResolution, 0.0, 1.0)).rgb;

    float lum = dot(cellColor, vec3(0.299, 0.587, 0.114));
    float density = mix(1.0 - lum, lum, uInvert); // 0 = lightest char, 1 = densest char
    float charIdx = clamp(floor(density * uCharCount), 0.0, uCharCount - 1.0);

    vec2 local = fract(px / uCharSize);
    vec2 atlasUv = vec2((charIdx + local.x) / uCharCount, local.y);
    float glyphMask = texture2D(tCharAtlas, atlasUv).r;

    vec3 ink = uColorMode < 0.5 ? vec3(1.0) : cellColor;
    vec3 effectColor = mix(vec3(0.0), ink, glyphMask);

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
