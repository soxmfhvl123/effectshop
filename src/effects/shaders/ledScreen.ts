// LED Screen (Retro Display)
// Simulates viewing the image on a close-up LED/LCD panel: each cell is
// split into R/G/B subpixel columns (masked to that channel and brightened
// to compensate), with darkened grid lines between cells.

export const ledScreenVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const ledScreenFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uCellSize;     // px
  uniform float uGridDarkness; // 0..1
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);
    vec2 px = vUv * uResolution;
    vec2 cell = floor(px / uCellSize);
    vec2 cellCenterPx = (cell + 0.5) * uCellSize;
    vec3 cellColor = texture2D(tDiffuse, clamp(cellCenterPx / uResolution, 0.0, 1.0)).rgb;

    vec2 local = fract(px / uCellSize);
    float sub = floor(local.x * 3.0);
    vec3 mask = sub < 1.0 ? vec3(1.0, 0.15, 0.15) : (sub < 2.0 ? vec3(0.15, 1.0, 0.15) : vec3(0.15, 0.15, 1.0));

    float edgeX = min(local.x, 1.0 - local.x);
    float edgeY = min(local.y, 1.0 - local.y);
    float edge = min(edgeX, edgeY);
    float gridMask = smoothstep(0.0, 0.08, edge);
    float gridFactor = mix(1.0 - uGridDarkness, 1.0, gridMask);

    vec3 effectColor = clamp(cellColor * mask * 1.6 * gridFactor, 0.0, 1.0);

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
