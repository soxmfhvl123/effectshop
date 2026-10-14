// Swirl (Distort)
// Rotates the sample position around a center point by an angle that falls
// off with distance (squared falloff so the twist is concentrated near the
// center) — classic whirlpool/twist distortion.

export const swirlVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const swirlFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uAngle;  // max twist, degrees
  uniform float uRadius; // falloff radius, px
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

    float t = clamp(1.0 - dist / radius, 0.0, 1.0);
    float angle = radians(uAngle) * t * t;
    float s = sin(angle);
    float c = cos(angle);
    vec2 rotated = vec2(delta.x * c - delta.y * s, delta.x * s + delta.y * c);

    vec2 uv = clamp((centerPx + rotated) / uResolution, 0.0, 1.0);
    vec3 effectColor = texture2D(tDiffuse, uv).rgb;
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
