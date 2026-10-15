// Magnetic Field (Generate)
// Iron-filing-style flux lines that curve around whatever's detected as the
// "object" (same chroma-key mask as Object Glow), instead of being driven by
// noise like Flow Field. Each grid cell samples the mask at a ring of
// offsets to estimate "which direction is the object, and how close" —
// that vector's perpendicular is the field's local tangent, the classic
// trick for drawing streamlines that wrap around an obstacle. A scrolling
// alpha pattern along the tangent gives the lines a sense of flow.

export const magneticFieldVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const magneticFieldFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec3 uKeyColor;
  uniform float uThreshold;
  uniform float uSpacing;     // grid cell size, px
  uniform float uLineLength;  // tick length, px
  uniform float uThickness;   // tick thickness, px
  uniform float uFalloff;     // px, how far the field reaches from the object
  uniform float uFlowSpeed;
  uniform vec3 uFieldColor;
  uniform float uOpacity;
  varying vec2 vUv;

  const int DIRS = 12;

  float maskAt(vec2 uv) {
    vec3 c = texture2D(tDiffuse, clamp(uv, 0.0, 1.0)).rgb;
    float maxDist = sqrt(3.0);
    return step(uThreshold * maxDist, length(c - uKeyColor));
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 px = vUv * uResolution;

    vec2 cell = floor(px / uSpacing);
    vec2 cellCenter = (cell + 0.5) * uSpacing;
    vec2 texel = 1.0 / uResolution;

    // Weighted direction toward nearby object pixels, sampled at a ring of
    // offsets scaled by uFalloff -- magnitude is strong when the object is
    // close/large nearby, ~0 once nothing is within range.
    vec2 field = vec2(0.0);
    for (int i = 0; i < DIRS; i++) {
      float angle = (float(i) / float(DIRS)) * 6.28318;
      vec2 dir = vec2(cos(angle), sin(angle));
      vec2 sampleUv = cellCenter * texel + dir * uFalloff * texel;
      float m = maskAt(sampleUv);
      field += dir * m;
    }
    field /= float(DIRS);
    float strength = clamp(length(field) * 2.2, 0.0, 1.0);

    // Perpendicular of the "toward object" vector = flux line tangent, so
    // lines wrap around the object instead of pointing straight at it.
    vec2 toward = length(field) > 0.0001 ? normalize(field) : vec2(1.0, 0.0);
    vec2 tangent = vec2(-toward.y, toward.x);

    vec2 toPoint = px - cellCenter;
    float along = dot(toPoint, tangent);
    vec2 perp = toPoint - tangent * along;
    float distPerp = length(perp);

    float halfLen = uLineLength * 0.5;
    float lineMask = step(distPerp, uThickness * 0.5) * step(abs(along), halfLen);

    // Scrolling dash along the tangent gives the line a sense of flow.
    float dash = fract(along * 0.15 - uTime * uFlowSpeed);
    float dashMask = smoothstep(0.0, 0.08, dash) * smoothstep(1.0, 0.75, dash);

    float finalMask = lineMask * dashMask * strength;
    vec3 effectColor = mix(srcColor.rgb, uFieldColor, finalMask);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
