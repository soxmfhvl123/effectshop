// Paper Scan (Generate)
// Flatbed-scanner look: contrast push toward near-monochrome, intermittent
// horizontal scan streaks, dust specks, a subtle sine warp, and a soft
// corner vignette.

export const paperScanVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const paperScanFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uContrast; // 0..1, push toward B&W
  uniform float uStreaks;  // 0..1
  uniform float uDust;     // 0..1
  uniform float uWarp;     // 0..1
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);

    vec2 uv = vUv;
    uv.x += sin(uv.y * 40.0 + uTime * 0.3) * uWarp * 0.01;
    uv = clamp(uv, 0.0, 1.0);

    vec3 color = texture2D(tDiffuse, uv).rgb;
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    float bw = clamp((lum - 0.5) * (1.0 + uContrast * 4.0) + 0.5, 0.0, 1.0);
    color = mix(color, vec3(bw), uContrast);

    float row = floor(uv.y * uResolution.y);
    float streakNoise = hash(vec2(row, floor(uTime * 2.0)));
    float streak = step(1.0 - uStreaks * 0.12, streakNoise);
    color = mix(color, vec3(0.85), streak * uStreaks);

    float speck = hash(floor(uv * uResolution / 1.5));
    float dustMask = step(1.0 - uDust * 0.025, speck);
    color = mix(color, vec3(0.08), dustMask);

    vec2 vc = uv - 0.5;
    float vig = 1.0 - dot(vc, vc) * 0.6;
    color *= clamp(vig, 0.55, 1.0);

    vec3 outColor = mix(srcColor.rgb, color, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
