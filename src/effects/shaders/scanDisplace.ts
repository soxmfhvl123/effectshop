// Scan Displace
// Smooth sine-wave horizontal displacement per scanline (rather than the
// randomized per-block jitter of Block Glitch/VHS), giving a continuous
// analog "heat ripple" wobble. Still renders a fixed wave on a still image
// since uTime defaults to 0.

export const scanDisplaceVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const scanDisplaceFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uAmplitude; // px, 0..30
  uniform float uFrequency; // waves per screen height, 1..40
  uniform float uSpeed;     // 0..10
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);

    float wave = sin(vUv.y * uFrequency * 6.28318 + uTime * uSpeed);
    vec2 uv = vec2(vUv.x + wave * uAmplitude / uResolution.x, vUv.y);
    vec3 effectColor = texture2D(tDiffuse, clamp(uv, 0.0, 1.0)).rgb;

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
