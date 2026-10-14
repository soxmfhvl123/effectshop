// Pinch / Bulge (Distort)
// Remaps the sample radius by a power curve within a center radius: amount
// > 0 bulges outward (lens/fisheye-like), amount < 0 pinches inward
// (black-hole-like), amount = 0 is a no-op.

export const pinchBulgeVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const pinchBulgeFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uAmount; // -0.9..2, negative = pinch, positive = bulge
  uniform float uRadius; // px
  uniform float uCenterX;
  uniform float uCenterY;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 px = vUv * uResolution;
    vec2 centerPx = vec2(uCenterX, uCenterY) * uResolution;
    vec2 delta = px - centerPx;
    float dist = length(delta);
    float radius = max(uRadius, 1.0);

    vec2 sampleUv = vUv;
    if (dist < radius) {
      float normalizedDist = dist / radius;
      float power = max(1.0 + uAmount, 0.05);
      float warped = pow(normalizedDist, power);
      vec2 newDelta = dist > 0.0001 ? normalize(delta) * warped * radius : vec2(0.0);
      sampleUv = (centerPx + newDelta) / uResolution;
    }

    vec3 effectColor = texture2D(tDiffuse, clamp(sampleUv, 0.0, 1.0)).rgb;
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
