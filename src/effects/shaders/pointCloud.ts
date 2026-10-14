// Point Cloud / Object Dots (Generate)
// Scatters jittered dots over a grid, but a dot only renders where that
// grid cell's sampled color is far enough from a chosen key color — i.e.
// only over "foreground"/"object" regions, chroma-key style (same mask
// logic as Blob Tracker, just per-pixel instead of per-blob). Classic
// TouchDesigner/creative-coding "points on the subject" look.
//
// Each dot gets a thin darkened rim: with "use source color" on, a dot
// sampled from inside a flat-colored region is otherwise the *exact* same
// color as what's already under it (mix(pink, pink, alpha) == pink), so it
// renders completely invisible there — correct by the math, but reads as
// "the dots aren't showing up" for any image with large flat/smooth areas,
// which in practice is most images. The rim keeps every dot visible
// regardless of what's behind it, same as how a real point-cloud marker is
// never just a flat-filled disc.

export const pointCloudVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const pointCloudFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform vec3 uKeyColor;
  uniform float uThreshold;     // 0..1, key-color distance to count as "object"
  uniform float uSpacing;       // grid spacing, px
  uniform float uDotSize;       // base dot radius, px
  uniform float uJitter;        // 0..1, position randomization within cell
  uniform float uUseSourceColor; // 0 or 1
  uniform vec3 uDotColor;
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 px = vUv * uResolution;

    vec2 cell = floor(px / uSpacing);
    vec2 cellCenter = (cell + 0.5) * uSpacing;
    vec2 jitterOffset = (vec2(hash(cell), hash(cell + 17.0)) - 0.5) * uSpacing * uJitter;
    vec2 samplePx = clamp(cellCenter + jitterOffset, vec2(0.0), uResolution);
    vec2 sampleUv = samplePx / uResolution;
    vec3 sampleColor = texture2D(tDiffuse, sampleUv).rgb;

    float maxDist = sqrt(3.0);
    float dist = length(sampleColor - uKeyColor);
    float mask = step(uThreshold * maxDist, dist);

    float sizeJitter = 0.55 + 0.9 * hash(cell + 3.0);
    float radius = uDotSize * sizeJitter;
    float d = length(px - samplePx);
    float dotAlpha = smoothstep(radius, radius - 1.5, d) * mask;

    float rimWidth = max(uDotSize * 0.25, 1.0);
    float rimAlpha = dotAlpha - smoothstep(radius - rimWidth, radius - rimWidth - 1.5, d) * mask;

    vec3 dotColor = uUseSourceColor > 0.5 ? sampleColor : uDotColor;
    vec3 rimColor = dotColor * 0.35;
    vec3 markerColor = mix(dotColor, rimColor, rimAlpha);
    vec3 effectColor = mix(srcColor.rgb, markerColor, dotAlpha);
    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
