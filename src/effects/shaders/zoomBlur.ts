// Zoom Blur
// Averages samples taken along the line from each pixel toward a center
// point at shrinking distances, producing radial motion-blur streaks
// emanating from (uCenterX, uCenterY).

export const zoomBlurVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const zoomBlurFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uAmount;  // 0..1
  uniform float uCenterX; // 0..1
  uniform float uCenterY; // 0..1
  uniform float uOpacity;
  varying vec2 vUv;

  const int SAMPLES = 12;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);

    vec2 center = vec2(uCenterX, uCenterY);
    vec3 sum = vec3(0.0);
    for (int i = 0; i < SAMPLES; i++) {
      float t = float(i) / float(SAMPLES - 1);
      float scale = 1.0 - uAmount * 0.1 * t;
      vec2 sampleUv = center + (vUv - center) * scale;
      sum += texture2D(tDiffuse, clamp(sampleUv, 0.0, 1.0)).rgb;
    }
    vec3 effectColor = sum / float(SAMPLES);

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
