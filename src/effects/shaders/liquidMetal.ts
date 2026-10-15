// Liquid Metal (Generate)
// Classic 2D metaball field over the centers of every detected blob (CPU
// side, see metaballTracking.ts): wherever the summed implicit field from
// all blobs crosses a threshold, blobs visually MERGE into a single molten
// shape -- the iconic "liquid" look happens automatically as two tracked
// objects get close enough. Inside the merged field the source image is
// refracted (sampled with an offset along the field gradient) and tinted,
// with a bright specular rim right at the merge boundary.

export const liquidMetalVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const MAX_METABALLS = 8

export const liquidMetalFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  // xy = pixel-space center, z = radius (px); z == 0 means "unused slot".
  uniform vec3 uBalls[${MAX_METABALLS}];
  uniform float uMergeThreshold;
  uniform float uRefraction;
  uniform float uRimIntensity;
  uniform vec3 uLiquidColor;
  uniform float uTint;
  uniform float uOpacity;
  varying vec2 vUv;

  float fieldAt(vec2 p) {
    float f = 0.0;
    for (int i = 0; i < ${MAX_METABALLS}; i++) {
      vec3 b = uBalls[i];
      if (b.z <= 0.0) continue;
      float d2 = max(dot(p - b.xy, p - b.xy), 1.0);
      f += (b.z * b.z) / d2;
    }
    return f;
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 px = vUv * uResolution;

    float f = fieldAt(px);
    float edge = max(uMergeThreshold * 0.08, 0.001);
    float inside = smoothstep(uMergeThreshold - edge, uMergeThreshold + edge, f);

    // Cheap screen-space gradient of the field, wobbled slightly over time
    // for a gentle "liquid surface" ripple rather than a static lens.
    vec2 texel = 1.0 / uResolution;
    float wobble = sin(uTime * 1.3 + px.x * 0.02) * 0.4;
    float fx1 = fieldAt(px + vec2(2.0 + wobble, 0.0));
    float fx0 = fieldAt(px - vec2(2.0 + wobble, 0.0));
    float fy1 = fieldAt(px + vec2(0.0, 2.0 - wobble));
    float fy0 = fieldAt(px - vec2(0.0, 2.0 - wobble));
    vec2 grad = vec2(fx1 - fx0, fy1 - fy0);

    vec2 refractedUv = clamp(vUv + grad * uRefraction * texel, 0.0, 1.0);
    vec3 refracted = texture2D(tDiffuse, refractedUv).rgb;
    vec3 liquidBase = mix(refracted, refracted * uLiquidColor * 1.4, uTint);

    // Bright rim exactly at the merge boundary -- specular highlight.
    float rim = (1.0 - abs(inside - 0.5) * 2.0) * uRimIntensity;
    vec3 liquid = liquidBase + vec3(rim);

    vec3 effectColor = mix(srcColor.rgb, liquid, inside);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
