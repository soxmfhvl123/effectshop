// Flow Field (Generate)
// A grid of short oriented tick marks, each angled by a drifting value-noise
// field (classic TouchDesigner/creative-coding "flow field" look). Tick
// length is also modulated by the source image's local luminance so the
// field visibly responds to the picture, not just the noise.

export const flowFieldVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const flowFieldFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uSpacing;     // grid cell size, px
  uniform float uLineLength;  // base tick length, px
  uniform float uThickness;   // tick thickness, px
  uniform float uNoiseScale;  // spatial frequency of the angle field
  uniform float uSpeed;       // drift speed
  uniform float uLuminanceReactive; // 0 or 1
  uniform vec3 uLineColor;
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 px = vUv * uResolution;

    vec2 cell = floor(px / uSpacing);
    vec2 cellCenter = (cell + 0.5) * uSpacing;

    float angle = valueNoise(cell * uNoiseScale + uTime * uSpeed) * 6.28318;
    vec2 dir = vec2(cos(angle), sin(angle));

    float lum = dot(texture2D(tDiffuse, cellCenter / uResolution).rgb, vec3(0.299, 0.587, 0.114));
    float lenScale = mix(1.0, 0.3 + 1.4 * lum, uLuminanceReactive);
    float halfLen = uLineLength * 0.5 * lenScale;

    vec2 toPoint = px - cellCenter;
    float along = dot(toPoint, dir);
    vec2 perp = toPoint - dir * along;
    float distPerp = length(perp);

    float lineMask = step(distPerp, uThickness * 0.5) * step(abs(along), halfLen);

    vec3 effectColor = mix(srcColor.rgb, uLineColor, lineMask);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
