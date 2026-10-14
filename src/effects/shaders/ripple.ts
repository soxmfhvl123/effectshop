// Ripple (Distort)
// Concentric sine waves emanating from a center point, displacing the
// sample position radially — classic water-ripple distortion.

export const rippleVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const rippleFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uAmplitude; // px
  uniform float uFrequency; // waves per 100px of radius
  uniform float uSpeed;
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

    float wave = sin(dist * uFrequency * 0.0628 - uTime * uSpeed) * uAmplitude;
    vec2 dir = dist > 0.0001 ? delta / dist : vec2(0.0);
    vec2 uv = clamp((px + dir * wave) / uResolution, 0.0, 1.0);

    vec3 effectColor = texture2D(tDiffuse, uv).rgb;
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
