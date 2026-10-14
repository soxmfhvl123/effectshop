// Block Glitch
// Divides the frame into horizontal row-blocks; each block gets a per-time-step
// pseudo-random chance of horizontal displacement and/or an RGB channel swap,
// approximating digital datamoshing/corruption artifacts.

export const blockGlitchVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const blockGlitchFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uIntensity; // 0..1, how often/how far blocks glitch
  uniform float uBlockSize; // px row height, 4..64
  uniform float uSpeed;     // glitch step rate, 0.5..10
  uniform float uOpacity;
  varying vec2 vUv;

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec4 srcColor = texture2D(tDiffuse, vUv);

    float seedTime = floor(uTime * uSpeed);
    float rowId = floor(vUv.y * uResolution.y / uBlockSize);

    float r = rand(vec2(rowId, seedTime));
    float displace = 0.0;
    if (r > 1.0 - uIntensity) {
      displace = (rand(vec2(rowId, seedTime + 11.0)) - 0.5) * 0.4 * uIntensity;
    }

    vec2 uv = vec2(fract(vUv.x + displace), vUv.y);
    vec3 effectColor = texture2D(tDiffuse, uv).rgb;

    float r2 = rand(vec2(rowId + 7.0, seedTime));
    if (r2 > 1.0 - uIntensity * 0.5) {
      effectColor = effectColor.gbr;
    }

    vec3 outColor = mix(srcColor.rgb, effectColor, uOpacity);
    gl_FragColor = vec4(outColor, srcColor.a);
  }
`
