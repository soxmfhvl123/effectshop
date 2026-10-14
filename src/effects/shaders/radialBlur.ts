// Radial Blur (Lens/Blur)
// Averages samples rotated around a center point — a "spin"/rotational
// blur, distinct from Zoom Blur's scale-based radial streaks.

export const radialBlurVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const radialBlurFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uAmount; // total spin angle across samples, degrees
  uniform float uCenterX;
  uniform float uCenterY;
  uniform float uOpacity;
  varying vec2 vUv;

  const int SAMPLES = 16;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 center = vec2(uCenterX, uCenterY);
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 centered = (vUv - center) * aspect;

    vec3 sum = vec3(0.0);
    for (int i = 0; i < SAMPLES; i++) {
      float t = (float(i) / float(SAMPLES - 1) - 0.5) * radians(uAmount);
      float s = sin(t);
      float c = cos(t);
      vec2 rotated = vec2(centered.x * c - centered.y * s, centered.x * s + centered.y * c);
      vec2 uv = center + rotated / aspect;
      sum += texture2D(tDiffuse, clamp(uv, 0.0, 1.0)).rgb;
    }
    vec3 effectColor = sum / float(SAMPLES);

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
