// Object Glow (Generate)
// Follows the real silhouette of whatever's far enough from a key color
// (same chroma-key mask as Blob Tracker/Point Cloud, computed per-pixel),
// and glows outward from its edge — a rim-light/outline around the actual
// detected shape, not a bounding box.

export const objectGlowVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const objectGlowFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform vec3 uKeyColor;
  uniform float uThreshold;   // 0..1, key-color distance to count as "object"
  uniform float uGlowWidth;   // px, how far the glow reaches
  uniform float uGlowIntensity;
  uniform vec3 uGlowColor;
  uniform float uOpacity;
  varying vec2 vUv;

  const int DIRS = 8;
  const int RINGS = 3;

  float maskAt(vec2 uv) {
    vec3 c = texture2D(tDiffuse, clamp(uv, 0.0, 1.0)).rgb;
    float maxDist = sqrt(3.0);
    return step(uThreshold * maxDist, length(c - uKeyColor));
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 texel = 1.0 / uResolution;
    float m = maskAt(vUv);

    float surroundSum = 0.0;
    for (int r = 1; r <= RINGS; r++) {
      float radius = uGlowWidth * float(r) / float(RINGS);
      for (int i = 0; i < DIRS; i++) {
        float angle = (float(i) / float(DIRS)) * 6.28318;
        vec2 offset = vec2(cos(angle), sin(angle)) * radius * texel;
        surroundSum += maskAt(vUv + offset);
      }
    }
    float surround = surroundSum / float(DIRS * RINGS);

    // Glow in the background, brightest just outside the object edge.
    float outerGlow = clamp(surround * (1.0 - m) * uGlowIntensity, 0.0, 1.0);
    // A thin brighter rim just inside the edge too.
    float innerRim = m * smoothstep(0.15, 0.85, 1.0 - surround) * 0.8;

    vec3 effectColor = mix(srcColor.rgb, uGlowColor, clamp(outerGlow + innerRim, 0.0, 1.0));
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
