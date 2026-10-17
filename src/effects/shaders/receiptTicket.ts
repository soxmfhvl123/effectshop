// Receipt Ticket (Print & Texture)
// A convenience-store thermal-receipt print: ordered (Bayer) dithering like
// Dither, but faded to grays instead of true black, plus paper grain,
// vertical "print head" streaks, horizontal density banding, an optional
// narrower print width (paper margins on either side), and zigzag torn
// top/bottom edges. The torn/margin regions go fully transparent rather
// than being painted a background color, so PNG export reads as a real
// cutout receipt rather than a rectangle with a ragged line drawn on it.

export const receiptTicketVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const receiptTicketFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uDitherScale;
  uniform float uFade;
  uniform float uContrast;
  uniform vec3 uInkColor;
  uniform vec3 uPaperColor;
  uniform float uPaperNoise;
  uniform float uHeadStreaks;
  uniform float uBanding;
  uniform float uPrintWidth;
  uniform float uTornEdges; // 0 or 1
  uniform float uEdgeSize;  // px
  uniform float uOpacity;
  varying vec2 vUv;

  float receiptBayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
  }
  float receiptBayer4(vec2 a) { return receiptBayer2(0.5 * a) * 0.25 + receiptBayer2(a); }

  float receiptHash(vec2 p) {
    return fract(sin(dot(p, vec2(41.3, 289.1))) * 12543.231);
  }
  float receiptHash1(float x) {
    return fract(sin(x * 127.1) * 43758.5453);
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 px = vUv * uResolution;

    float lum = dot(srcColor.rgb, vec3(0.299, 0.587, 0.114));
    lum = clamp((lum - 0.5) * uContrast + 0.5, 0.0, 1.0);

    float threshold = receiptBayer4(px / uDitherScale);
    float ink = step(threshold, lum);

    // headStreaks: a handful of thin vertical columns where the print head
    // skipped, chosen by hashing the column index so they stay fixed.
    float col = floor(px.x / 2.0);
    float streakPick = receiptHash1(col);
    float streak = step(1.0 - uHeadStreaks * 0.08, streakPick);
    ink = mix(ink, 1.0, streak);

    // banding: slow horizontal luminance wobble from uneven paper feed.
    float band = sin(px.y * 0.07 + receiptHash1(floor(px.y / 18.0)) * 6.28318) * 0.5 + 0.5;
    float bandedFade = clamp(uFade + (band - 0.5) * uBanding * 0.6, 0.0, 1.0);

    vec3 printedColor = mix(uInkColor, uPaperColor, bandedFade);
    vec3 base = mix(uPaperColor, printedColor, ink);

    float grain = (receiptHash(px * 0.7) - 0.5) * uPaperNoise * 0.25;
    base += grain;

    // Narrower print width: paper margins on either side go transparent.
    float halfMargin = (1.0 - clamp(uPrintWidth, 0.05, 1.0)) * 0.5;
    float widthMask = step(halfMargin, vUv.x) * step(vUv.x, 1.0 - halfMargin);

    // Torn zigzag top/bottom edge.
    float edgeMask = 1.0;
    if (uTornEdges > 0.5 && uEdgeSize > 0.5) {
      float teeth = max(uResolution.x / max(uEdgeSize, 1.0) * 0.5, 1.0);
      float zig = abs(fract(px.x / uResolution.x * teeth) - 0.5) * 2.0;
      float tornDepth = uEdgeSize * (0.4 + 0.6 * zig);
      edgeMask *= step(tornDepth, px.y);
      edgeMask *= step(tornDepth, uResolution.y - px.y);
    }

    float alpha = srcColor.a * widthMask * edgeMask;
    vec3 outColor = mix(srcColor.rgb, base, uOpacity);
    float outAlpha = mix(srcColor.a, alpha, uOpacity);
    gl_FragColor = vec4(outColor, outAlpha);
  }
`
