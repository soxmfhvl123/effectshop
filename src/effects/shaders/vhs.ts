// VHS Tracking
// Per-scanline horizontal jitter (driven by a hash of row + time) plus a
// slow-moving "tracking band" of exaggerated jitter, a small chromatic
// split, and dot noise — approximates analog tape mistracking.

export const vhsVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const vhsFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uJitter; // px, 0..20
  uniform float uNoise;  // 0..1
  uniform float uSpeed;  // tracking band speed, 0..2
  uniform float uOpacity;
  varying vec2 vUv;

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);

    float row = floor(vUv.y * uResolution.y);
    float rowNoise = rand(vec2(row, floor(uTime * 24.0))) - 0.5;

    float bandPos = fract(uTime * uSpeed * 0.15);
    float band = smoothstep(0.05, 0.0, abs(vUv.y - bandPos));
    float shiftPx = rowNoise * uJitter + band * uJitter * 3.0 * (rand(vec2(uTime, row)) - 0.5);

    vec2 uv = vec2(vUv.x + shiftPx / uResolution.x, vUv.y);
    uv.x = clamp(uv.x, 0.0, 1.0);

    float caPx = 2.0 / uResolution.x;
    float r = texture2D(tDiffuse, clamp(uv + vec2(caPx, 0.0), 0.0, 1.0)).r;
    float g = texture2D(tDiffuse, uv).g;
    float b = texture2D(tDiffuse, clamp(uv - vec2(caPx, 0.0), 0.0, 1.0)).b;
    vec3 effectColor = vec3(r, g, b);

    float grain = (rand(vUv * uResolution + uTime * 60.0) - 0.5) * uNoise;
    effectColor += grain;

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
