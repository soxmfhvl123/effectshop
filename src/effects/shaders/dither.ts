// Dither (ordered/Bayer dithering)
// True Floyd-Steinberg error diffusion is inherently sequential (each pixel
// depends on already-dithered neighbors in scan order) and doesn't map onto
// a single-pass, fully-parallel GLSL fragment shader in real time. Ordered
// (Bayer matrix) dithering is the standard real-time-GPU substitute and is
// what every "type" option here renders with; the 4 named types differ in
// matrix size + quantization levels rather than in effect family:
//   1-bit  -> 4x4 matrix, 2 levels   |  2-bit   -> 4x4 matrix, 4 levels
//   Bayer4x4 -> 4x4 matrix, 8 levels |  Bayer8x8 -> 8x8 matrix, 16 levels
// `palette` recolors the quantized luminance; Monochrome uses a grayscale
// ramp, Gameboy/Cyberpunk index into a fixed 4-color set.

export const ditherVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const ditherFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uPixelScale;  // dither cell size in px (1..8, from the scale param)
  uniform float uMatrixMode;  // 0 = Bayer 4x4, 1 = Bayer 8x8
  uniform float uLevels;      // quantization levels
  uniform float uPalette;     // 0 = monochrome, 1 = gameboy, 2 = cyberpunk
  uniform float uOpacity;
  varying vec2 vUv;

  float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
  }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

  vec3 gameboyColor(float idx) {
    if (idx < 0.5) return vec3(0.059, 0.220, 0.059);
    if (idx < 1.5) return vec3(0.188, 0.384, 0.188);
    if (idx < 2.5) return vec3(0.545, 0.675, 0.059);
    return vec3(0.608, 0.737, 0.059);
  }

  vec3 cyberpunkColor(float idx) {
    if (idx < 0.5) return vec3(0.051, 0.008, 0.129);
    if (idx < 1.5) return vec3(1.0, 0.125, 0.475);
    if (idx < 2.5) return vec3(0.0, 1.0, 0.949);
    return vec3(0.976, 0.973, 0.443);
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);

    vec2 px = vUv * uResolution;
    vec2 cellPx = floor(px / uPixelScale) * uPixelScale + uPixelScale * 0.5;
    vec3 cellColor = texture2D(tDiffuse, clamp(cellPx / uResolution, 0.0, 1.0)).rgb;
    float lum = dot(cellColor, vec3(0.299, 0.587, 0.114));

    float threshold = uMatrixMode < 0.5 ? bayer4(px / uPixelScale) : bayer8(px / uPixelScale);
    float dithered = lum + (threshold - 0.5) / uLevels;
    float level = clamp(floor(dithered * uLevels + 0.5) / max(uLevels - 1.0, 1.0), 0.0, 1.0);

    vec3 effectColor;
    if (uPalette < 0.5) {
      effectColor = vec3(level);
    } else {
      float idx = clamp(floor(level * 3.0 + 0.5), 0.0, 3.0);
      effectColor = uPalette < 1.5 ? gameboyColor(idx) : cyberpunkColor(idx);
    }

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
