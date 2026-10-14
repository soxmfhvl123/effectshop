// Halftone Screen / Dot Matrix
// Classic rotated-grid halftone: luminance of the source drives dot radius on
// a screen-angled grid. blendMode picks how the dot pattern composites with
// the incoming pixel color (Normal = pure black/white dots, Multiply = dots
// darken the source image, preserving its color). uOpacity blends the whole
// effect back against the untouched input (this pass's opacity slider).

export const halftoneVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const halftoneFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uScale;      // dot cell size in px (2..50)
  uniform float uAngle;      // screen angle in degrees (0..360)
  uniform float uContrast;   // 0..2
  uniform float uBlendMode;  // 0 = normal, 1 = multiply
  uniform float uOpacity;    // 0..1, mixes back to the untouched input
  varying vec2 vUv;

  vec2 rotate(vec2 p, float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c) * p;
  }

  float calcLuminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);

    vec2 px = vUv * uResolution;
    vec2 st = rotate(px, radians(uAngle));
    vec2 cellUv = st / max(uScale, 1.0);
    vec2 cellId = floor(cellUv);
    vec2 cellLocal = fract(cellUv) - 0.5;

    // Sample source luminance at the cell center (in rotated space) so the
    // dot size reflects the underlying image tone, not just this pixel.
    vec2 cellCenterPx = rotate((cellId + 0.5) * uScale, -radians(uAngle));
    vec2 cellCenterUv = cellCenterPx / uResolution;
    vec3 cellColor = texture2D(tDiffuse, clamp(cellCenterUv, 0.0, 1.0)).rgb;

    float lum = calcLuminance(cellColor);
    lum = clamp((lum - 0.5) * uContrast + 0.5, 0.0, 1.0);

    float radius = (1.0 - lum) * 0.62;
    float dist = length(cellLocal);
    float dot = 1.0 - smoothstep(radius - 0.06, radius + 0.06, dist);

    vec3 dotsNormal = mix(vec3(1.0), vec3(0.0), dot);
    vec3 dotsMultiply = srcColor.rgb * mix(vec3(1.0), vec3(0.08), dot);

    vec3 effectColor = mix(dotsNormal, dotsMultiply, uBlendMode);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
