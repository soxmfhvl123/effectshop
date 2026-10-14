// Voronoi Cells (Generate)
// Classic cellular/Worley-noise mosaic: jittered feature points per grid
// cell, each pixel colored by (optionally) its nearest point's sampled
// image color, with edges drawn where the distance to the nearest and
// second-nearest points are close (the standard F2-F1 cell-edge trick).
// Feature points drift over time for an animated stained-glass look.

export const voronoiCellsVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const voronoiCellsFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uScale;         // cell size, px
  uniform float uEdgeThickness; // 0..5
  uniform vec3 uEdgeColor;
  uniform float uFillAmount;    // 0 = original image shows through, 1 = flat cell color
  uniform float uSpeed;         // feature-point drift speed
  uniform float uOpacity;
  varying vec2 vUv;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 uv = vUv * uResolution / max(uScale, 1.0);
    vec2 cellId = floor(uv);
    vec2 f = fract(uv);

    float minDist1 = 8.0;
    float minDist2 = 8.0;
    vec2 nearestPointId = cellId;

    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 pointId = cellId + neighbor;
        vec2 jitter = hash2(pointId);
        jitter = 0.5 + 0.45 * sin(uTime * uSpeed + 6.28318 * jitter);
        vec2 pointPos = neighbor + jitter - f;
        float dist = length(pointPos);
        if (dist < minDist1) {
          minDist2 = minDist1;
          minDist1 = dist;
          nearestPointId = pointId;
        } else if (dist < minDist2) {
          minDist2 = dist;
        }
      }
    }

    float edgeDist = minDist2 - minDist1;
    float edgeMask = 1.0 - smoothstep(0.0, max(uEdgeThickness, 0.05) * 0.05, edgeDist);

    vec2 samplePx = clamp((nearestPointId + 0.5) * uScale, vec2(0.0), uResolution);
    vec3 cellColor = texture2D(tDiffuse, samplePx / uResolution).rgb;
    vec3 fillColor = mix(srcColor.rgb, cellColor, uFillAmount);

    vec3 effectColor = mix(fillColor, uEdgeColor, edgeMask);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
