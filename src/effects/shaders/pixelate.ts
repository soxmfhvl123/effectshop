// Pixelate
// Snaps the sample point to the center of a fixed-size grid cell, producing a
// hard mosaic/blocky look (game-console, low-res-camera style).

export const pixelateVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const pixelateFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uBlockSize; // px, 2..64
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);

    vec2 px = vUv * uResolution;
    vec2 cellPx = floor(px / uBlockSize) * uBlockSize + uBlockSize * 0.5;
    vec3 effectColor = texture2D(tDiffuse, clamp(cellPx / uResolution, 0.0, 1.0)).rgb;

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
