// Motion Blur (Lens/Blur)
// Averages samples along a straight line at a fixed angle — simple linear
// directional blur, distinct from Zoom Blur (radial) and Tilt-Shift
// (focus-band based).

export const motionBlurVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const motionBlurFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uAmount; // px, total streak length
  uniform float uAngle;  // degrees
  uniform float uOpacity;
  varying vec2 vUv;

  const int SAMPLES = 16;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 dir = vec2(cos(radians(uAngle)), sin(radians(uAngle))) / uResolution;

    vec3 sum = vec3(0.0);
    for (int i = 0; i < SAMPLES; i++) {
      float t = (float(i) / float(SAMPLES - 1) - 0.5) * uAmount;
      vec2 uv = clamp(vUv + dir * t, 0.0, 1.0);
      sum += texture2D(tDiffuse, uv).rgb;
    }
    vec3 effectColor = sum / float(SAMPLES);

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
